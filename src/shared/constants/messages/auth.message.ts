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
  },
  Success: {
    LogoutSuccessful: 'Auth.LogoutSuccessful',
    ResetPasswordSuccessful: 'Auth.ResetPasswordSuccessful',
  },
} as const
