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
import {
  ConfirmTwoFactorBodyType,
  ForgotPasswordBodyType,
  LoginBodyType,
  RefreshTokenBodyType,
  RegisterBodyType,
  Verify2FABodyType,
} from './auth.model'
import { AuthRepository } from './auth.repo'
import {
  EmailAlreadyExistsException,
  EmailNotFoundException,
  InvalidCredentialsException,
  InvalidSetupTokenException,
  InvalidTempTokenException,
  InvalidTOTPException,
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

    if (user.totpSecret) {
      const tempToken = await this.tokenService.signLogin2FAToken({ userId: user.id })
      return { requires2FA: true as const, tempToken }
    }

    const tokens = await this.issueSessionTokens(user, body.userAgent, body.ip)
    return { requires2FA: false as const, ...tokens, user }
  }

  async verifyTwoFactorLogin(body: Verify2FABodyType & { userAgent: string; ip: string }) {
    let userId: number
    try {
      ;({ userId } = await this.tokenService.verifyLogin2FAToken(body.tempToken))
    } catch {
      throw InvalidTempTokenException
    }
    const user = await this.authRepository.findUniqueUserIncludeRole({ id: userId })
    if (!user || !user.totpSecret) {
      throw InvalidTempTokenException
    }
    const isValid = this.twoFactorService.verifyTOTP({
      email: user.email,
      secret: user.totpSecret,
      token: body.code,
    })
    if (!isValid) {
      throw InvalidTOTPException
    }
    const tokens = await this.issueSessionTokens(user, body.userAgent, body.ip)
    return { ...tokens, user }
  }

  private async issueSessionTokens(
    user: { id: number; roleId: number; role: { name: string } },
    userAgent: string,
    ip: string,
  ) {
    const device = await this.authRepository.findOrCreateDevice({
      userId: user.id,
      userAgent,
      ip,
    })
    return this.generateTokens({
      userId: user.id,
      deviceId: device.id,
      roleId: user.roleId,
      roleName: user.role.name,
    })
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
    const user = await this.sharedUserRepository.findUnique({ id: userId })
    if (!user) {
      throw EmailNotFoundException
    }
    if (user.totpSecret) {
      throw TOTPAlreadyEnabledException
    }
    const { secret, uri } = this.twoFactorService.generateTOTPSecret(user.email)
    const setupToken = await this.tokenService.signSetup2FAToken({ userId, secret })
    return { secret, uri, setupToken }
  }

  async confirmTwoFactorSetup(userId: number, body: ConfirmTwoFactorBodyType) {
    let payload: { userId: number; secret: string }
    try {
      payload = await this.tokenService.verifySetup2FAToken(body.setupToken)
    } catch {
      throw InvalidSetupTokenException
    }
    if (payload.userId !== userId) {
      throw InvalidSetupTokenException
    }
    const user = await this.sharedUserRepository.findUnique({ id: userId })
    if (!user) {
      throw EmailNotFoundException
    }
    if (user.totpSecret) {
      throw TOTPAlreadyEnabledException
    }
    const isValid = this.twoFactorService.verifyTOTP({
      email: user.email,
      secret: payload.secret,
      token: body.code,
    })
    if (!isValid) {
      throw InvalidTOTPException
    }
    await this.authRepository.updateUser({ id: userId }, { totpSecret: payload.secret })
    return { message: AuthMessage.Success.TwoFactorEnabled }
  }
}
