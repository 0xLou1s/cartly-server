import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Post, Query, Res } from '@nestjs/common'
import type { Response } from 'express'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  ConfirmTwoFactorBodyDTO,
  DisableTwoFactorBodyDTO,
  ForgotPasswordBodyDTO,
  GetAuthorizationUrlResDTO,
  LoginBodyDTO,
  LoginResDTO,
  LogoutBodyDTO,
  RefreshTokenBodyDTO,
  RefreshTokenResDTO,
  RegisterBodyDTO,
  RegisterResDTO,
  TwoFactorSetupResDTO,
  Verify2FABodyDTO,
  Verify2FAResDTO,
} from 'src/routes/auth/auth.dto'
import { AuthService } from 'src/routes/auth/auth.service'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { IsPublic } from 'src/shared/decorators/auth.decorator'
import { UserAgent } from 'src/shared/decorators/user-agent.decorator'
import { MessageResDTO } from 'src/shared/dtos/reponse.dto'
import { EmptyBodyDTO } from 'src/shared/dtos/request.dto'
import envConfig from 'src/shared/env.config'
import { GoogleService } from './google.service'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleService: GoogleService,
  ) {}

  @Post('register')
  @IsPublic()
  @ZodSerializerDto(RegisterResDTO)
  async register(@Body() body: RegisterBodyDTO, @UserAgent() userAgent: string, @Ip() ip: string) {
    return await this.authService.register({
      ...body,
      userAgent,
      ip,
    })
  }

  @Post('login')
  @IsPublic()
  @ZodSerializerDto(LoginResDTO)
  async login(@Body() body: LoginBodyDTO, @UserAgent() userAgent: string, @Ip() ip: string) {
    return await this.authService.login({
      ...body,
      userAgent,
      ip,
    })
  }

  @Post('2fa/verify')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(Verify2FAResDTO)
  async verifyTwoFactorLogin(@Body() body: Verify2FABodyDTO, @UserAgent() userAgent: string, @Ip() ip: string) {
    return await this.authService.verifyTwoFactorLogin({
      ...body,
      userAgent,
      ip,
    })
  }

  @Post('refresh-token')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(RefreshTokenResDTO)
  async refreshToken(@Body() body: RefreshTokenBodyDTO, @UserAgent() userAgent: string, @Ip() ip: string) {
    return await this.authService.refreshToken({
      refreshToken: body.refreshToken,
      userAgent,
      ip,
    })
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(MessageResDTO)
  async logout(@Body() body: LogoutBodyDTO) {
    return await this.authService.logout(body.refreshToken)
  }

  @Get('google/authorize')
  @IsPublic()
  @ZodSerializerDto(GetAuthorizationUrlResDTO)
  getAuthorizationUrl(@UserAgent() userAgent: string, @Ip() ip: string) {
    return this.googleService.getAuthorizationUrl({
      userAgent,
      ip,
    })
  }

  @Get('google/callback')
  @IsPublic()
  async googleCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    try {
      const data = await this.googleService.googleCallback({ code, state })
      const params = new URLSearchParams({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      })
      return res.redirect(`${envConfig.GOOGLE_CLIENT_REDIRECT_URI}?${params.toString()}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google sign-in failed, please try another method'
      const params = new URLSearchParams({ errorMessage: message })
      return res.redirect(`${envConfig.GOOGLE_CLIENT_REDIRECT_URI}?${params.toString()}`)
    }
  }

  @Post('forgot-password')
  @IsPublic()
  @ZodSerializerDto(MessageResDTO)
  forgotPassword(@Body() body: ForgotPasswordBodyDTO) {
    return this.authService.forgotPassword(body)
  }

  // POST with empty body: the action has a side-effect (issuing a TOTP secret), matching REST semantics.
  // Avoid GET so the URL doesn't leak into browser history, access logs, or referrer headers.
  @Post('2fa/setup')
  @ZodSerializerDto(TwoFactorSetupResDTO)
  setupTwoFactorAuth(@Body() _: EmptyBodyDTO, @ActiveUser('userId') userId: number) {
    return this.authService.setupTwoFactorAuth(userId)
  }

  @Post('2fa/confirm')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(MessageResDTO)
  confirmTwoFactorSetup(@Body() body: ConfirmTwoFactorBodyDTO, @ActiveUser('userId') userId: number) {
    return this.authService.confirmTwoFactorSetup(userId, body)
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(MessageResDTO)
  disableTwoFactorAuth(@Body() body: DisableTwoFactorBodyDTO, @ActiveUser('userId') userId: number) {
    return this.authService.disableTwoFactorAuth({
      ...body,
      userId,
    })
  }
}
