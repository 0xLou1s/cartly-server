import { Injectable } from '@nestjs/common'
import { addMilliseconds } from 'date-fns'
import ms from 'ms'
import {
  EmailAlreadyExistsException,
  EmailNotFoundException,
  FailedToSendOTPException,
  InvalidOTPException,
  OTPExpiredException,
} from 'src/routes/auth/error.model'
import { SendOTPBodyType } from 'src/routes/otp/otp.model'
import { OtpRepository } from 'src/routes/otp/otp.repo'
import { TypeOfVerificationCode, TypeOfVerificationCodeType } from 'src/shared/constants/auth.constant'
import { OtpMessage } from 'src/shared/constants/messages/otp.message'
import envConfig from 'src/shared/env.config'
import { generateOTP } from 'src/shared/helpers'
import { SharedUserRepository } from 'src/shared/repositories/shared-user.repo'
import { EmailService } from 'src/shared/services/email.service'

type VerificationCodeKey = { email: string; code: string; type: TypeOfVerificationCodeType }

@Injectable()
export class OtpService {
  constructor(
    private readonly otpRepository: OtpRepository,
    private readonly sharedUserRepository: SharedUserRepository,
    private readonly emailService: EmailService,
  ) {}

  async sendOTP(body: SendOTPBodyType) {
    const user = await this.sharedUserRepository.findUnique({
      email: body.email,
    })
    if (body.type === TypeOfVerificationCode.REGISTER && user) {
      throw EmailAlreadyExistsException
    }
    if (body.type === TypeOfVerificationCode.FORGOT_PASSWORD && !user) {
      throw EmailNotFoundException
    }
    const code = generateOTP()
    await this.otpRepository.createVerificationCode({
      email: body.email,
      code,
      type: body.type,
      expiresAt: addMilliseconds(new Date(), ms(envConfig.OTP_EXPIRES_IN)),
    })

    const { error } = await this.emailService.sendOTP({
      email: body.email,
      code,
    })
    if (error) {
      throw FailedToSendOTPException
    }

    return { message: OtpMessage.Success.Sent }
  }

  async verifyOTP({ email, code, type }: VerificationCodeKey) {
    const verificationCode = await this.otpRepository.findUniqueVerificationCode({
      email_code_type: { email, code, type },
    })
    if (!verificationCode) {
      throw InvalidOTPException
    }
    if (verificationCode.expiresAt < new Date()) {
      throw OTPExpiredException
    }
    return verificationCode
  }

  deleteVerificationCode({ email, code, type }: VerificationCodeKey) {
    return this.otpRepository.deleteVerificationCode({
      email_code_type: { email, code, type },
    })
  }
}
