import { createZodDto } from 'nestjs-zod'
import {
  ConfirmTwoFactorBodySchema,
  DisableTwoFactorBodySchema,
  ForgotPasswordBodySchema,
  GetAuthorizationUrlResSchema,
  LoginBodySchema,
  LoginResSchema,
  LogoutBodySchema,
  RecoveryDisable2FABodySchema,
  RefreshTokenBodySchema,
  RefreshTokenResSchema,
  RegisterBodySchema,
  RegisterResSchema,
  TwoFactorSetupResSchema,
  Verify2FABodySchema,
  Verify2FAResSchema,
} from 'src/routes/auth/auth.model'

export class RegisterBodyDTO extends createZodDto(RegisterBodySchema) {}
export class RegisterResDTO extends createZodDto(RegisterResSchema) {}

export class LoginBodyDTO extends createZodDto(LoginBodySchema) {}
export class LoginResDTO extends createZodDto(LoginResSchema) {}

export class RefreshTokenBodyDTO extends createZodDto(RefreshTokenBodySchema) {}
export class RefreshTokenResDTO extends createZodDto(RefreshTokenResSchema) {}

export class LogoutBodyDTO extends createZodDto(LogoutBodySchema) {}

export class GetAuthorizationUrlResDTO extends createZodDto(GetAuthorizationUrlResSchema) {}

export class ForgotPasswordBodyDTO extends createZodDto(ForgotPasswordBodySchema) {}

export class TwoFactorSetupResDTO extends createZodDto(TwoFactorSetupResSchema) {}
export class DisableTwoFactorBodyDTO extends createZodDto(DisableTwoFactorBodySchema) {}

export class Verify2FABodyDTO extends createZodDto(Verify2FABodySchema) {}
export class Verify2FAResDTO extends createZodDto(Verify2FAResSchema) {}

export class ConfirmTwoFactorBodyDTO extends createZodDto(ConfirmTwoFactorBodySchema) {}

export class RecoveryDisable2FABodyDTO extends createZodDto(RecoveryDisable2FABodySchema) {}
