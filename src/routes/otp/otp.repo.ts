import { Injectable } from '@nestjs/common'
import { VerificationCodeType } from 'src/routes/otp/otp.model'
import { TypeOfVerificationCodeType } from 'src/shared/constants/auth.constant'
import { PrismaService } from 'src/shared/services/prisma.service'

export type VerificationCodeUniqueInput =
  | { id: number }
  | { email_code_type: { email: string; code: string; type: TypeOfVerificationCodeType } }

@Injectable()
export class OtpRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async createVerificationCode(
    payload: Pick<VerificationCodeType, 'email' | 'type' | 'code' | 'expiresAt'>,
  ): Promise<VerificationCodeType> {
    return this.prismaService.verificationCode.upsert({
      where: {
        email_code_type: {
          email: payload.email,
          code: payload.code,
          type: payload.type,
        },
      },
      create: payload,
      update: {
        code: payload.code,
        expiresAt: payload.expiresAt,
      },
    })
  }

  async findUniqueVerificationCode(uniqueValue: VerificationCodeUniqueInput): Promise<VerificationCodeType | null> {
    return this.prismaService.verificationCode.findUnique({
      where: uniqueValue,
    })
  }

  deleteVerificationCode(uniqueValue: VerificationCodeUniqueInput): Promise<VerificationCodeType> {
    return this.prismaService.verificationCode.delete({
      where: uniqueValue,
    })
  }
}
