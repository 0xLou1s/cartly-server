import { Global, Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { AccessTokenGuard } from 'src/shared/guards/access-token.guard'
import { APIKeyGuard } from 'src/shared/guards/api-key.guard'
import { AuthenticationGuard } from 'src/shared/guards/authentication.guard'
import { PrismaService } from 'src/shared/services/prisma.service'
import { SharedUserRepository } from './repositories/shared-user.repo'
import { TwoFactorService } from './services/2fa.service'
import { EmailService } from './services/email.service'
import { HashingService } from './services/hashing.service'
import { TokenService } from './services/token.service'

const sharedServices = [
  PrismaService,
  HashingService,
  TokenService,
  SharedUserRepository,
  EmailService,
  TwoFactorService,
]

@Global()
@Module({
  providers: [
    ...sharedServices,
    AccessTokenGuard,
    APIKeyGuard,
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
  ],
  exports: sharedServices,
  imports: [JwtModule],
})
export class SharedModule {}
