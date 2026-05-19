import { AuthMessage } from 'src/shared/constants/messages/auth.message'
import { UserResSchema, UserSchema } from 'src/shared/models/shared-user.model'
import { z } from 'zod'

export const RegisterBodySchema = UserSchema.pick({
  email: true,
  password: true,
  name: true,
  phoneNumber: true,
})
  .extend({
    confirmPassword: z.string().min(6).max(100),
    code: z.string().length(6),
  })
  .strict()
  .superRefine(({ confirmPassword, password }, ctx) => {
    if (confirmPassword !== password) {
      ctx.addIssue({
        code: 'custom',
        message: AuthMessage.Error.ConfirmPasswordMismatch,
        path: ['confirmPassword'],
      })
    }
  })

export const AuthResSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: UserResSchema,
})

export const RegisterResSchema = AuthResSchema
export const LoginResSchema = AuthResSchema

export const LoginBodySchema = UserSchema.pick({
  email: true,
  password: true,
})
  .extend({
    totpCode: z.string().length(6).optional(), // 2FA code
    code: z.string().length(6).optional(), // Email OTP code
  })
  .strict()

export const RefreshTokenBodySchema = z
  .object({
    refreshToken: z.string(),
  })
  .strict()

export const RefreshTokenResSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
})

export const DeviceSchema = z.object({
  id: z.number(),
  userId: z.number(),
  userAgent: z.string(),
  ip: z.string(),
  lastActive: z.date(),
  createdAt: z.date(),
  isActive: z.boolean(),
})

export const RefreshTokenSchema = z.object({
  token: z.string(),
  userId: z.number(),
  deviceId: z.number().nullable(),
  expiresAt: z.date(),
  createdAt: z.date(),
})

export const RoleSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  isActive: z.boolean(),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const DisableTwoFactorBodySchema = z
  .object({
    totpCode: z.string().length(6).optional(),
    code: z.string().length(6).optional(),
  })
  .strict()
  .superRefine(({ totpCode, code }, ctx) => {
    const hasTotpCode = totpCode !== undefined
    const hasOtpCode = code !== undefined
    if (hasTotpCode === hasOtpCode) {
      const issue = { code: 'custom' as const, message: AuthMessage.Error.TOTPOrOTPCodeRequired }
      ctx.addIssue({ ...issue, path: ['totpCode'] })
      ctx.addIssue({ ...issue, path: ['code'] })
    }
  })
export const TwoFactorSetupResSchema = z.object({
  secret: z.string(),
  uri: z.string(),
})

export const LogoutBodySchema = RefreshTokenBodySchema

export const GoogleAuthStateSchema = DeviceSchema.pick({
  userAgent: true,
  ip: true,
})

export const GoogleAuthSignedStateSchema = GoogleAuthStateSchema.extend({
  iat: z.number(),
})

export const GetAuthorizationUrlResSchema = z.object({
  url: z.url(),
})

export const ForgotPasswordBodySchema = z
  .object({
    email: z.email(),
    code: z.string().length(6),
    newPassword: z.string().min(6).max(100),
    confirmNewPassword: z.string().min(6).max(100),
  })
  .strict()
  .superRefine(({ confirmNewPassword, newPassword }, ctx) => {
    if (confirmNewPassword !== newPassword) {
      ctx.addIssue({
        code: 'custom',
        message: AuthMessage.Error.ConfirmPasswordMismatch,
        path: ['confirmNewPassword'],
      })
    }
  })

export type RegisterBodyType = z.infer<typeof RegisterBodySchema>
export type RegisterResType = z.infer<typeof RegisterResSchema>
export type LoginBodyType = z.infer<typeof LoginBodySchema>
export type LoginResType = z.infer<typeof LoginResSchema>
export type RefreshTokenType = z.infer<typeof RefreshTokenSchema>
export type RefreshTokenBodyType = z.infer<typeof RefreshTokenBodySchema>
export type RefreshTokenResType = z.infer<typeof RefreshTokenResSchema>
export type DeviceType = z.infer<typeof DeviceSchema>
export type RoleType = z.infer<typeof RoleSchema>
export type LogoutBodyType = RefreshTokenBodyType
export type GoogleAuthStateType = z.infer<typeof GoogleAuthStateSchema>
export type GoogleAuthSignedStateType = z.infer<typeof GoogleAuthSignedStateSchema>
export type GetAuthorizationUrlResType = z.infer<typeof GetAuthorizationUrlResSchema>
export type ForgotPasswordBodyType = z.infer<typeof ForgotPasswordBodySchema>
export type DisableTwoFactorBodyType = z.infer<typeof DisableTwoFactorBodySchema>
export type TwoFactorSetupResType = z.infer<typeof TwoFactorSetupResSchema>
