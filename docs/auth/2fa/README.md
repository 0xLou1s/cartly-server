# Two-Factor Authentication (2FA / TOTP)

Time-based one-time password (TOTP, RFC 6238) compatible with Google Authenticator, 1Password, Authy.

- **Algorithm:** SHA1
- **Digits:** 6
- **Period:** 30 seconds
- **Drift tolerance:** ±1 period (~30s) via `window: 1`
- **Secret storage:** plaintext in `User.totpSecret` (TODO: encrypt at rest)

## State model

A user's 2FA state is derived from one column:

| `User.totpSecret` | 2FA state | Behavior on `POST /auth/login`         |
| ----------------- | --------- | -------------------------------------- |
| `NULL`            | Disabled  | Returns tokens directly (1-step login) |
| `<base32>`        | Enabled   | Returns `tempToken` (2-step login)     |

The setup flow does **not** flip the state by itself — the secret is only persisted after the user confirms by entering a valid TOTP code. This avoids locking out users who request a QR but never finish scanning it.

---

## Flow 1: Enable 2FA (setup → confirm)

```
Client                    Server
  |                          |
  |  POST /auth/2fa/setup    |  (auth required, body: {})
  |------------------------->|
  |                          |  generateTOTPSecret(email)
  |                          |  signSetup2FAToken({userId, secret})  --> 10 min JWT
  |                          |  (NO DB write yet)
  |    {secret, uri,         |
  |     setupToken}          |
  |<-------------------------|
  |                          |
  | (user scans QR / pastes  |
  |  uri into authenticator) |
  |                          |
  |  POST /auth/2fa/confirm  |  (auth required)
  |  {setupToken, code}      |
  |------------------------->|
  |                          |  verifySetup2FAToken(setupToken)
  |                          |  assert payload.userId === activeUser.userId
  |                          |  verifyTOTP(secret, code)
  |                          |  user.totpSecret = secret      <-- DB write
  |    {message: "..."}      |
  |<-------------------------|
```

### POST /auth/2fa/setup

**Headers:** `Authorization: Bearer <accessToken>`
**Body:** `{}`
**Response 200:**

```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "uri": "otpauth://totp/Cartly:user@example.com?secret=...&issuer=Cartly",
  "setupToken": "eyJhbGc..."
}
```

`setupToken` is a JWT (10-minute expiry) carrying `{ userId, secret, type: 'PENDING_2FA_SETUP' }`. The secret is **not** persisted on this call — abandoning setup leaves the account untouched.

### POST /auth/2fa/confirm

**Headers:** `Authorization: Bearer <accessToken>`
**Body:**

```json
{ "setupToken": "eyJhbGc...", "code": "123456" }
```

**Response 200:**

```json
{ "message": "Auth.TwoFactorEnabled" }
```

On success, `user.totpSecret` is set; subsequent logins require 2FA.

### Errors

| Status | Code                       | Cause                                                            |
| ------ | -------------------------- | ---------------------------------------------------------------- |
| 401    | `Error.InvalidSetupToken`  | Token missing / expired / wrong `type` claim / `userId` mismatch |
| 422    | `Error.InvalidTOTP`        | TOTP code does not validate against the secret                   |
| 422    | `Error.TOTPAlreadyEnabled` | User already has `totpSecret` set                                |

---

## Flow 2: Login with 2FA (login → verify-2fa)

```
Client                    Server
  |                          |
  |  POST /auth/login        |
  |  {email, password}       |
  |------------------------->|
  |                          |  verify credentials
  |                          |  if (user.totpSecret) {
  |                          |    signLogin2FAToken({userId})  --> 5 min JWT
  |    {requires2FA: true,   |
  |     tempToken}           |
  |<-------------------------|
  |                          |  } else {
  |                          |    issue accessToken + refreshToken
  |    {requires2FA: false,  |
  |     accessToken,         |
  |     refreshToken,        |
  |     user}                |
  |<-------------------------|
  |                          |  }
  |                          |
  | (user enters TOTP code   |
  |  from authenticator app) |
  |                          |
  |  POST /auth/2fa/verify   |
  |  {tempToken, code}       |
  |------------------------->|
  |                          |  verifyLogin2FAToken(tempToken)
  |                          |  fetch user, verifyTOTP(secret, code)
  |                          |  issue accessToken + refreshToken
  |   {accessToken,          |
  |    refreshToken, user}   |
  |<-------------------------|
```

### POST /auth/login

**Body:** `{ email, password }`
**Response 200 (no 2FA):**

```json
{
  "requires2FA": false,
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    /* UserRes */
  }
}
```

**Response 200 (2FA enabled):**

```json
{ "requires2FA": true, "tempToken": "eyJhbGc..." }
```

`tempToken` is a JWT (5-minute expiry) carrying `{ userId, type: 'PENDING_2FA' }`. It is not interchangeable with `accessToken` or `setupToken` — the `type` claim is enforced on verify.

### POST /auth/2fa/verify

**Body:**

```json
{ "tempToken": "eyJhbGc...", "code": "123456" }
```

**Response 200:** same shape as the no-2FA login response (minus `requires2FA`).

### Errors

| Status | Code                       | Cause                                                                            |
| ------ | -------------------------- | -------------------------------------------------------------------------------- |
| 422    | `Error.InvalidCredentials` | Wrong email or password                                                          |
| 401    | `Error.InvalidTempToken`   | `tempToken` missing / expired / wrong `type` / user gone or `totpSecret` cleared |
| 422    | `Error.InvalidTOTP`        | TOTP code does not validate                                                      |

---

## Token type matrix

All three short-lived JWTs are signed with `ACCESS_TOKEN_SECRET` and distinguished by their `type` claim. Verify functions reject mismatched types.

| Token            | Expires in     | `type` claim        | Payload                                       |
| ---------------- | -------------- | ------------------- | --------------------------------------------- |
| Access           | per env config | (none)              | `userId, deviceId, roleId, roleName`          |
| Refresh          | per env config | (none)              | `userId` (signed with `REFRESH_TOKEN_SECRET`) |
| Login 2FA (temp) | 5 min          | `PENDING_2FA`       | `userId`                                      |
| Setup 2FA        | 10 min         | `PENDING_2FA_SETUP` | `userId, secret`                              |

---

## Security notes

1. **Stateless temp tokens.** `tempToken` and `setupToken` cannot be revoked before expiry. Mitigation: short TTL (5 / 10 min).
2. **TOTP secret at rest.** Stored as plaintext. Compromise of the DB grants 2FA bypass for affected users. Plan: AES-GCM encryption with a key in env vars / KMS.
3. **No rate limiting.** A determined attacker can brute-force a 6-digit TOTP (1M combinations) over many attempts. Plan: throttle `verify-2fa` and `confirm` by user/IP, lock after N failures.
4. **No "remember this device".** Every login on a 2FA-enabled account requires a code. Plan (future): trusted-device token signed per `(userId, deviceId)`.
5. **Clock drift.** `window: 1` allows ±30s drift. Servers must keep NTP-synced.

---

## Flow 3: Disable 2FA

### Authenticated path — `POST /auth/2fa/disable`

For users still able to log in. Body accepts exactly one of `totpCode` / `code` (email OTP, type `DISABLE_2FA`). On success, `user.totpSecret` is cleared.

### Recovery path — `POST /auth/2fa/recovery`

Public endpoint for users locked out of their authenticator app. Two steps:

1. `POST /otp/send { email, type: "DISABLE_2FA" }` — server validates the email exists AND has `totpSecret` set, then mails an OTP.
2. `POST /auth/2fa/recovery { email, code }` — verifies OTP, clears `totpSecret`. User can then log in with email + password (1-step).

**Threat model:** recovery is single-factor (email). If the email account is compromised, the attacker can disable 2FA. Mitigation today: short OTP TTL and single-use deletion. Stronger mitigation (future): require password before clearing, or generate one-time recovery codes at enrollment.

---

## Related code

- Service: [`src/routes/auth/auth.service.ts`](../../../src/routes/auth/auth.service.ts) (`setupTwoFactorAuth`, `confirmTwoFactorSetup`, `login`, `verifyTwoFactorLogin`, `disableTwoFactorAuth`, `recoveryDisable2FA`)
- Controller: [`src/routes/auth/auth.controller.ts`](../../../src/routes/auth/auth.controller.ts)
- TOTP wrapper: [`src/shared/services/2fa.service.ts`](../../../src/shared/services/2fa.service.ts) (using [`otpauth`](https://github.com/hectorm/otpauth))
- Token signing: [`src/shared/services/token.service.ts`](../../../src/shared/services/token.service.ts)
- Schemas: [`src/routes/auth/auth.model.ts`](../../../src/routes/auth/auth.model.ts)
- Errors: [`src/routes/auth/error.model.ts`](../../../src/routes/auth/error.model.ts)
