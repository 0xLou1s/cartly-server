# 2FA test flow

API sequence for the full 2FA lifecycle. See [README.md](./README.md) for protocol details.

## Flow A — Enable 2FA on an existing account

```text
1. POST /auth/login                  → { requires2FA: false, accessToken, refreshToken, user }
2. POST /auth/2fa/setup              → { secret, uri, setupToken }     (no DB write)
   (add uri/secret to authenticator app, read 6-digit code)
3. POST /auth/2fa/confirm            → { message: "Auth.TwoFactorEnabled" }   (writes totpSecret)
```

After step 3: `user.totpSecret` is set. Login is now 2-step.

Skip step 3 → DB unchanged → login stays 1-step (no lockout).

## Flow B — Login on an account with 2FA enabled

```text
1. POST /auth/login                  → { requires2FA: true, tempToken }
   (read 6-digit code from authenticator)
2. POST /auth/2fa/verify             → { accessToken, refreshToken, user }
```

## Flow C — Login on an account without 2FA

```text
1. POST /auth/login                  → { requires2FA: false, accessToken, refreshToken, user }
```

## Request / response bodies

### POST /auth/login

```json
// req
{ "email": "...", "password": "..." }

// res — no 2FA
{ "requires2FA": false, "accessToken": "...", "refreshToken": "...", "user": { ... } }

// res — 2FA enabled
{ "requires2FA": true, "tempToken": "..." }
```

### POST /auth/2fa/setup

Header: `Authorization: Bearer <accessToken>`

```json
// req
{}

// res
{ "secret": "...", "uri": "otpauth://...", "setupToken": "..." }
```

### POST /auth/2fa/confirm

Header: `Authorization: Bearer <accessToken>`

```json
// req
{ "setupToken": "...", "code": "<6 digits>" }

// res
{ "message": "Auth.TwoFactorEnabled" }
```

### POST /auth/2fa/verify

```json
// req
{ "tempToken": "...", "code": "<6 digits>" }

// res
{ "accessToken": "...", "refreshToken": "...", "user": { ... } }
```

## Reset to retest

```sql
UPDATE "User" SET "totpSecret" = NULL WHERE email = '<email>';
```

Also delete the old entry in the authenticator app before re-running Flow A.

## Error responses

| Status | Code                       | Endpoint                                | Cause                                                       |
| ------ | -------------------------- | --------------------------------------- | ----------------------------------------------------------- |
| 422    | `Error.InvalidCredentials` | `/auth/login`                           | Wrong email or password                                     |
| 422    | `Error.TOTPAlreadyEnabled` | `/auth/2fa/setup`, `/auth/2fa/confirm`  | `user.totpSecret` already set                               |
| 401    | `Error.InvalidSetupToken`  | `/auth/2fa/confirm`                     | Token bad / expired (10 min) / wrong type / userId mismatch |
| 422    | `Error.InvalidTOTP`        | `/auth/2fa/confirm`, `/auth/2fa/verify` | TOTP code doesn't validate                                  |
| 401    | `Error.InvalidTempToken`   | `/auth/2fa/verify`                      | Token bad / expired (5 min) / wrong type / user gone        |

## Common gotcha

If `/auth/2fa/confirm` rejects an apparently-correct code with `Error.InvalidTOTP`: the authenticator app is holding a secret from an earlier setup call. Each `/auth/2fa/setup` generates a NEW secret — only the code from the LATEST setup pair (`setupToken` + matching app entry) works. Delete the stale entry in the app and redo Flow A from step 2.
