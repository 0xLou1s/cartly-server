import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import envConfig from 'src/shared/env.config'
import {
  AccessTokenPayload,
  AccessTokenPayloadCreate,
  Login2FATokenPayload,
  Login2FATokenPayloadCreate,
  RefreshTokenPayload,
  RefreshTokenPayloadCreate,
  Setup2FATokenPayload,
  Setup2FATokenPayloadCreate,
  TokenType,
} from 'src/shared/types/jwt.type'
import { v4 as uuidv4 } from 'uuid'

const LOGIN_2FA_TOKEN_EXPIRES_IN = '5m'
const SETUP_2FA_TOKEN_EXPIRES_IN = '10m'

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  signAccessToken(payload: AccessTokenPayloadCreate) {
    return this.jwtService.signAsync(
      { ...payload, uuid: uuidv4() },
      {
        secret: envConfig.ACCESS_TOKEN_SECRET,
        expiresIn: envConfig.ACCESS_TOKEN_EXPIRES_IN,
        algorithm: 'HS256',
      },
    )
  }

  signRefreshToken(payload: RefreshTokenPayloadCreate) {
    return this.jwtService.signAsync(
      { ...payload, uuid: uuidv4() },
      {
        secret: envConfig.REFRESH_TOKEN_SECRET,
        expiresIn: envConfig.REFRESH_TOKEN_EXPIRES_IN,
        algorithm: 'HS256',
      },
    )
  }

  verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.jwtService.verifyAsync(token, {
      secret: envConfig.ACCESS_TOKEN_SECRET,
    })
  }

  verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    return this.jwtService.verifyAsync(token, {
      secret: envConfig.REFRESH_TOKEN_SECRET,
    })
  }

  signLogin2FAToken(payload: Login2FATokenPayloadCreate) {
    return this.jwtService.signAsync(
      { ...payload, type: TokenType.PENDING_2FA, uuid: uuidv4() },
      {
        secret: envConfig.ACCESS_TOKEN_SECRET,
        expiresIn: LOGIN_2FA_TOKEN_EXPIRES_IN,
        algorithm: 'HS256',
      },
    )
  }

  async verifyLogin2FAToken(token: string): Promise<Login2FATokenPayload> {
    const payload = await this.jwtService.verifyAsync<Login2FATokenPayload>(token, {
      secret: envConfig.ACCESS_TOKEN_SECRET,
    })
    if (payload.type !== TokenType.PENDING_2FA) {
      throw new Error('Invalid token type')
    }
    return payload
  }

  signSetup2FAToken(payload: Setup2FATokenPayloadCreate) {
    return this.jwtService.signAsync(
      { ...payload, type: TokenType.PENDING_2FA_SETUP, uuid: uuidv4() },
      {
        secret: envConfig.ACCESS_TOKEN_SECRET,
        expiresIn: SETUP_2FA_TOKEN_EXPIRES_IN,
        algorithm: 'HS256',
      },
    )
  }

  async verifySetup2FAToken(token: string): Promise<Setup2FATokenPayload> {
    const payload = await this.jwtService.verifyAsync<Setup2FATokenPayload>(token, {
      secret: envConfig.ACCESS_TOKEN_SECRET,
    })
    if (payload.type !== TokenType.PENDING_2FA_SETUP) {
      throw new Error('Invalid token type')
    }
    return payload
  }
}
