---
name: multi-user-auth
description: Documents bootstrap sign-up, OIDC-only login when configured, and single-owner bootstrap in simple-books. Use when changing auth, login, OIDC env vars, or user access.
---

# Multi-user auth

## Model

- Single SQLite DB, **shared business data** for all users
- No `user_id` on business tables; no roles in MVP
- Exactly **one** bootstrap account path per install; no public sign-up after owner exists

## Bootstrap

| OIDC configured? | First user (0 rows in `user`) | After first user |
|------------------|--------------------------------|------------------|
| No | Email/password **sign-up** on `/login` | Email **sign-in** only |
| Yes | **SSO only** on `/login` (IdP provisions owner) | **SSO only** (email disabled) |

## Server enforcement

- [`src/lib/auth.ts`](../../../src/lib/auth.ts) — `emailAndPassword.enabled: !oidcConfigured`; `databaseHooks.user.create.before` rejects user insert when `COUNT(user) >= 1`
- [`src/routes/api/auth/$.ts`](../../../src/routes/api/auth/$.ts) — blocks `/sign-up/email` when users exist; blocks `/sign-in/email` when OIDC is configured

## Env

- `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` — enable SSO
- `OIDC_DISPLAY_NAME` — button label on login
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` — required in production

## Better Auth

`src/lib/auth.ts` — `genericOAuth` plugin when OIDC env vars set.

### OIDC sign-in / account linking

When `OIDC_*` is configured, `account.accountLinking` sets `trustedProviders: ['oidc']`
and `requireLocalEmailVerified: false` (local email verification is off in MVP).

- **New email at IdP** → Better Auth creates a user on first successful OIDC callback (only while `user` count is 0, unless IdP adds more users after bootstrap — operators control IdP membership).
- **Existing email** (e.g. owner created via email/password before OIDC was enabled) → OIDC account links to that user when IdP email matches.

Operators control who can sign in via the IdP. Trust the IdP: a malicious IdP that issues arbitrary emails could link to the owner account.

## Client

- `getAuthConfig` returns `{ oidcEnabled, oidcDisplayName, needsFirstUser, emailAuthEnabled }` (no secrets)
- [`src/routes/login.tsx`](../../../src/routes/login.tsx) — UI follows table above
