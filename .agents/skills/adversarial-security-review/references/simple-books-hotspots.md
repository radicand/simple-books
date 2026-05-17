# simple-books security hotspots

File-level map for adversarial review. Cross-check on every audit.

## Entrypoints

| Path | Auth | Notes |
|------|------|-------|
| `src/server/*.functions.ts` | `requireAuthMiddleware` (required) | Exception: see auth below |
| `src/lib/auth.functions.ts` | `getSession` optional; **`getAuthConfig` unauthenticated** | Must not leak secrets |
| `src/routes/api/auth/$.ts` | Better Auth + `guardSignUp` | Race on first user |
| `src/routes/api/attachments/upload.ts` | Session check | **No parent record validation** on `sourceId` |
| `src/routes/api/attachments/$id.ts` | Session check | Any authed user reads any attachment by ID |
| `src/routes/api/health.ts` | Usually public | Must not expose build/env secrets |

## Financial core

| Path | Risk |
|------|------|
| `src/server/posting.ts` | Journal integrity, balance checks, bypass if mutations skip it |
| `src/server/invoices.functions.ts` | Create/void/payment state machine |
| `src/server/receipts.functions.ts` | Payment allocation, overpayment |
| `src/server/mileage.functions.ts` | `amountCents` computation vs client input |
| `src/lib/money.ts` | `parseMoneyToCents` — only approved money parser for user input |

## Auth & identity

| Path | Risk |
|------|------|
| `src/lib/auth.ts` | OIDC, cookies, `accountLinking` |
| `src/routes/api/auth/$.ts` | Bootstrap sign-up guard, OIDC disables email sign-in |
| `.env` / Helm values | `BETTER_AUTH_SECRET`, `OIDC_*`, `S3_*` |

**MVP model:** no `user_id` on business tables — **any logged-in user is trusted for all data**. Findings about “user A saw user B’s invoice” are **Notes** unless product promises isolation. Findings about **no login** are Critical.

## Attachments

| Path | Risk |
|------|------|
| `src/lib/storage.server.ts` | MIME allowlist trusts client type; path under `./data/uploads` |
| `src/server/attachments.functions.ts` | `registerAttachment` callable from upload route; delete by id only |
| Upload flow | Orphan keys if DB insert fails after `putObject` |

Review: magic-byte validation, `Content-Disposition` header injection via `fileName`, presigned URL lifetime. Upload quotas are accepted risk (operator-only, shared tenant).

## Import protection

| Pattern | Severity if violated |
|---------|---------------------|
| Static `import { db } from '~/db/client'` in route components | Critical (bundle leak) |
| Static import of `posting.ts` outside handler | Critical |
| Dynamic `await import()` inside `createServerFn` handler | Correct pattern |

## Schema & IDs

| Path | Risk |
|------|------|
| `src/db/schema.ts` | Missing FKs, cascade deletes vs ledger retention |
| `src/lib/ids.ts` | Predictable IDs → enumeration |

## Deployment

| Path | Risk |
|------|------|
| `deploy/helm/**` | Secrets, ingress TLS, persistence volume permissions |
| `.github/workflows/**` | OIDC to cloud, image publish, secret exfil in logs |
| `Dockerfile` | Non-root user, embedded secrets |

## Recurring failure modes (merge blockers)

1. New `createServerFn` without `requireAuthMiddleware`
2. User money via `parseFloat` or unvalidated `Number(formField)`
3. Business write without `postJournalSync` or unbalanced lines
4. New API route without session check
5. Client-visible env (`import.meta.env`) for secrets
6. User-controlled path in `storageKey` or filesystem join
7. Skill/AGENTS edit that relaxes an invariant “for convenience”

## Suggested verification commands

```bash
# Unauthenticated server functions
rg 'createServerFn' src -l | while read f; do
  rg -q 'requireAuthMiddleware|sessionMiddleware' "$f" || echo "CHECK AUTH: $f"
done

# Server imports in client-eligible modules
rg "from ['\"]~/(db|server|lib/storage)" src --glob '!*.server.ts' --glob '!*.functions.ts'

# Dangerous patterns
rg 'parseFloat|dangerouslySetInnerHTML|eval\(' src
```

Adjust greps when adding new top-level directories.
