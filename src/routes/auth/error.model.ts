import { UnauthorizedException, UnprocessableEntityException } from '@nestjs/common'
import { AuthMessage } from 'src/shared/constants/messages/auth.message'
import { OtpMessage } from 'src/shared/constants/messages/otp.message'

// OTP related errors
export const InvalidOTPException = new UnprocessableEntityException([
  {
    message: OtpMessage.Error.InvalidOTP,
    path: 'code',
  },
])

export const OTPExpiredException = new UnprocessableEntityException([
  {
    message: OtpMessage.Error.OTPExpired,
    path: 'code',
  },
])

export const FailedToSendOTPException = new UnprocessableEntityException([
  {
    message: OtpMessage.Error.FailedToSendOTP,
    path: 'code',
  },
])

// Email related errors
export const EmailAlreadyExistsException = new UnprocessableEntityException([
  {
    message: AuthMessage.Error.EmailAlreadyExists,
    path: 'email',
  },
])

export const EmailNotFoundException = new UnprocessableEntityException([
  {
    message: AuthMessage.Error.EmailNotFound,
    path: 'email',
  },
])

// Password related errors
export const InvalidPasswordException = new UnprocessableEntityException([
  {
    message: AuthMessage.Error.InvalidPassword,
    path: 'password',
  },
])

export const InvalidCredentialsException = new UnprocessableEntityException([
  {
    message: AuthMessage.Error.InvalidCredentials,
    path: 'password',
  },
])

// Auth token related errors
export const RefreshTokenAlreadyUsedException = new UnauthorizedException(AuthMessage.Error.RefreshTokenAlreadyUsed)
export const UnauthorizedAccessException = new UnauthorizedException(AuthMessage.Error.UnauthorizedAccess)

// Google auth related errors
export const GoogleUserInfoError = new Error(AuthMessage.Error.FailedToGetGoogleUserInfo)
export const MissingStateError = new Error(AuthMessage.Error.MissingState)
export const InvalidStateError = new Error(AuthMessage.Error.InvalidState)
export const StateExpiredError = new Error(AuthMessage.Error.StateExpired)

// 2FA related errors
export const TOTPAlreadyEnabledException = new UnprocessableEntityException([
  {
    message: AuthMessage.Error.TOTPAlreadyEnabled,
    path: 'totpCode',
  },
])

export const TOTPNotEnabledException = new UnprocessableEntityException([
  {
    message: AuthMessage.Error.TOTPNotEnabled,
    path: 'totpCode',
  },
])

export const InvalidTOTPAndCodeException = new UnprocessableEntityException([
  {
    message: AuthMessage.Error.InvalidTOTPAndCode,
    path: 'totpCode',
  },
  {
    message: AuthMessage.Error.InvalidTOTPAndCode,
    path: 'code',
  },
])
