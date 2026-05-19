export interface AccessTokenPayloadCreate {
  userId: number
  deviceId: number
  roleId: number
  roleName: string
}

export interface AccessTokenPayload extends AccessTokenPayloadCreate {
  exp: number
  iat: number
}

export interface RefreshTokenPayloadCreate {
  userId: number
}

export interface RefreshTokenPayload extends RefreshTokenPayloadCreate {
  exp: number
  iat: number
}

export enum TokenType {
  PENDING_2FA = 'PENDING_2FA',
  PENDING_2FA_SETUP = 'PENDING_2FA_SETUP',
}

export interface Login2FATokenPayloadCreate {
  userId: number
}

export interface Login2FATokenPayload extends Login2FATokenPayloadCreate {
  type: TokenType.PENDING_2FA
  exp: number
  iat: number
}

export interface Setup2FATokenPayloadCreate {
  userId: number
  secret: string
}

export interface Setup2FATokenPayload extends Setup2FATokenPayloadCreate {
  type: TokenType.PENDING_2FA_SETUP
  exp: number
  iat: number
}
