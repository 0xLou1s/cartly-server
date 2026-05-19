import { HttpException, Injectable } from '@nestjs/common'
import { addMilliseconds } from 'date-fns'
import ms from 'ms'
import { RolesService } from 'src/routes/auth/roles.service'
import { OtpService } from 'src/routes/otp/otp.service'
import { TypeOfVerificationCode } from 'src/shared/constants/auth.constant'
import { AuthMessage } from 'src/shared/constants/messages/auth.message'
import envConfig from 'src/shared/env.config'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from 'src/shared/helpers'
import { SharedUserRepository } from 'src/shared/repositories/shared-user.repo'
import { TwoFactorService } from 'src/shared/services/2fa.service'
import { HashingService } from 'src/shared/services/hashing.service'
import { TokenService } from 'src/shared/services/token.service'
import { AccessTokenPayloadCreate } from 'src/shared/types/jwt.type'
import { ForgotPasswordBodyType, LoginBodyType, RefreshTokenBodyType, RegisterBodyType } from './auth.model'
import { AuthRepository } from './auth.repo'
import {
  EmailAlreadyExistsException,
  EmailNotFoundException,
  InvalidCredentialsException,
  RefreshTokenAlreadyUsedException,
  TOTPAlreadyEnabledException,
  UnauthorizedAccessException,
} from './error.model'

@Injectable()
export class AuthService {
  constructor(
    private readonly hashingService: HashingService,
    private readonly rolesService: RolesService,
    private readonly authRepository: AuthRepository,
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
    private readonly sharedUserRepository: SharedUserRepository,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  async register(body: RegisterBodyType & { userAgent: string; ip: string }) {
    try {
      const verificationCode = await this.otpService.verifyOTP({
        email: body.email,
        code: body.code,
        type: TypeOfVerificationCode.REGISTER,
      })

      const clientRoleId = await this.rolesService.getClientRoleId()
      const hashedPassword = await this.hashingService.hash(body.password)

      const [user] = await Promise.all([
        this.authRepository.createUserInclueRole({
          email: body.email,
          name: body.name,
          phoneNumber: body.phoneNumber,
          password: hashedPassword,
          roleId: clientRoleId,
          avatar: null,
        }),
        this.otpService.deleteVerificationCode(verificationCode),
      ])

      const device = await this.authRepository.findOrCreateDevice({
        userId: user.id,
        userAgent: body.userAgent,
        ip: body.ip,
      })
      const tokens = await this.generateTokens({
        userId: user.id,
        deviceId: device.id,
        roleId: user.roleId,
        roleName: user.role.name,
      })
      return { ...tokens, user }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw EmailAlreadyExistsException
      }
      throw error
    }
  }

  async login(body: LoginBodyType & { userAgent: string; ip: string }) {
    const user = await this.authRepository.findUniqueUserIncludeRole({
      email: body.email,
    })

    const isPasswordMatch = user ? await this.hashingService.compare(body.password, user.password) : false
    if (!user || !isPasswordMatch) {
      throw InvalidCredentialsException
    }

    const device = await this.authRepository.findOrCreateDevice({
      userId: user.id,
      userAgent: body.userAgent,
      ip: body.ip,
    })
    const tokens = await this.generateTokens({
      userId: user.id,
      deviceId: device.id,
      roleId: user.roleId,
      roleName: user.role.name,
    })
    return { ...tokens, user }
  }

  async generateTokens({ userId, deviceId, roleId, roleName }: AccessTokenPayloadCreate) {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccessToken({
        userId,
        deviceId,
        roleId,
        roleName,
      }),
      this.tokenService.signRefreshToken({
        userId,
      }),
    ])
    await this.authRepository.createRefreshToken({
      token: refreshToken,
      userId,
      expiresAt: addMilliseconds(new Date(), ms(envConfig.REFRESH_TOKEN_EXPIRES_IN as string)),
      deviceId,
    })
    return { accessToken, refreshToken }
  }

  async refreshToken({ refreshToken, userAgent, ip }: RefreshTokenBodyType & { userAgent: string; ip: string }) {
    try {
      const { userId } = await this.tokenService.verifyRefreshToken(refreshToken)
      const refreshTokenInDb = await this.authRepository.findUniqueRefreshTokenIncludeUserRole({
        token: refreshToken,
      })
      if (!refreshTokenInDb) {
        throw RefreshTokenAlreadyUsedException
      }
      const {
        deviceId,
        user: {
          roleId,
          role: { name: roleName },
        },
      } = refreshTokenInDb
      if (!deviceId) {
        throw UnauthorizedAccessException
      }
      const $updateDevice = this.authRepository.updateDevice(deviceId, {
        ip,
        userAgent,
      })
      const $deleteRefreshToken = this.authRepository.deleteRefreshToken({
        token: refreshToken,
      })
      const $tokens = this.generateTokens({ userId, roleId, roleName, deviceId })
      const [, , tokens] = await Promise.all([$updateDevice, $deleteRefreshToken, $tokens])
      return tokens
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw UnauthorizedAccessException
    }
  }

  async logout(refreshToken: string) {
    try {
      await this.tokenService.verifyRefreshToken(refreshToken)

      const found = await this.authRepository.findUniqueRefreshTokenIncludeUserRole({
        token: refreshToken,
      })
      if (!found) {
        throw RefreshTokenAlreadyUsedException
      }
      if (!found.deviceId) {
        throw UnauthorizedAccessException
      }

      await Promise.all([
        this.authRepository.deleteRefreshToken({ token: refreshToken }),
        this.authRepository.updateDevice(found.deviceId, { isActive: false }),
      ])

      return { message: AuthMessage.Success.LogoutSuccessful }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      if (isNotFoundPrismaError(error)) {
        throw RefreshTokenAlreadyUsedException
      }
      throw UnauthorizedAccessException
    }
  }

  async forgotPassword(body: ForgotPasswordBodyType) {
    const { email, code, newPassword } = body
    const user = await this.sharedUserRepository.findUnique({ email })
    if (!user) {
      throw EmailNotFoundException
    }
    const verificationCode = await this.otpService.verifyOTP({
      email,
      code,
      type: TypeOfVerificationCode.FORGOT_PASSWORD,
    })
    const hashedPassword = await this.hashingService.hash(newPassword)
    await Promise.all([
      this.authRepository.updateUser({ id: user.id }, { password: hashedPassword }),
      this.otpService.deleteVerificationCode(verificationCode),
    ])
    return { message: AuthMessage.Success.ResetPasswordSuccessful }
  }

  async setupTwoFactorAuth(userId: number) {
    // 1. Lấy thông tin user, kiểm tra xem user có tồn tại hay không, và xem họ đã bật 2FA chưa
    const user = await this.sharedUserRepository.findUnique({
      id: userId,
    })
    if (!user) {
      throw EmailNotFoundException
    }
    if (user.totpSecret) {
      throw TOTPAlreadyEnabledException
    }
    // 2. Tạo ra secret và uri
    const { secret, uri } = this.twoFactorService.generateTOTPSecret(user.email)
    // 3. Cập nhật secret vào user trong database
    await this.authRepository.updateUser({ id: userId }, { totpSecret: secret })
    // 4. Trả về secret và uri
    return {
      secret,
      uri,
    }
  }
}
