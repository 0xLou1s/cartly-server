export const AuthMessage = {
  Error: {
    EmailAlreadyExists: 'Error.EmailAlreadyExists',
    EmailNotFound: 'Error.EmailNotFound',
    InvalidPassword: 'Error.InvalidPassword',
    InvalidCredentials: 'Error.InvalidCredentials',
    ConfirmPasswordMismatch: 'Error.ConfirmPasswordMismatch',
    RefreshTokenAlreadyUsed: 'Error.RefreshTokenAlreadyUsed',
    UnauthorizedAccess: 'Error.UnauthorizedAccess',
    FailedToGetGoogleUserInfo: 'Error.FailedToGetGoogleUserInfo',
    MissingState: 'Error.MissingState',
    InvalidState: 'Error.InvalidState',
    StateExpired: 'Error.StateExpired',
    TOTPOrOTPCodeRequired: 'Error.TOTPOrOTPCodeRequired',
    TOTPAlreadyEnabled: 'Error.TOTPAlreadyEnabled',
    TOTPNotEnabled: 'Error.TOTPNotEnabled',
    InvalidTOTPAndCode: 'Error.InvalidTOTPAndCode',
  },
  Success: {
    LogoutSuccessful: 'Auth.LogoutSuccessful',
    ResetPasswordSuccessful: 'Auth.ResetPasswordSuccessful',
  },
} as const
