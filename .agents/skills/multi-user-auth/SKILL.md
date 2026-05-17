---
name: multi-user-auth
description: Documents bootstrap sign-up, OIDC-only additional users, and ALLOW_PUBLIC_SIGNUP guard in simple-books. Use when changing auth, login, OIDC env vars, or user access.
---

# Multi-user auth

## Model

- Single SQLite DB, **shared business data** for all users
- No `user_id` on business tables; no roles in MVP

## Bootstrap

1. Zero users → `/login` shows email **sign-up** (owner account)
2. After first user → email **sign-in** only; new users via **OIDC**

## Server guard

`src/routes/api/auth/$.ts` — blocks `/sign-up/email` when user count ≥ 1 unless `ALLOW_PUBLIC_SIGNUP=true`.

## Env

- `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` — required for accountant/SSO access
- `OIDC_DISPLAY_NAME` — button label on login

## Better Auth

`src/lib/auth.ts` — `genericOAuth` plugin when OIDC env vars set.
