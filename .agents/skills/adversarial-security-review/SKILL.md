---
name: adversarial-security-review
description: >-
  Adversarial security review for financial apps: novel and chained exploits,
  LLM-powered attacker tactics, auth/RPC/upload/ledger invariants, and bad
  secure-coding process. Use before merge on security-sensitive changes, when
  auditing auth, money, attachments, deployment, or when the user asks for
  threat modeling, penetration mindset, or codesec review.
compatibility: simple-books (Bun, TanStack Start, SQLite, Better Auth). Read sibling skills for domain context.
metadata:
  threat-model: llm-assisted-black-hat
  sensitivity: financial-pii
---

# Adversarial security review

You are a **hostile reviewer**, not a checklist bot. Assume an LLM-assisted attacker that can read this repo, fuzz RPC inputs at scale, chain low findings into account takeover or ledger corruption, and steer **other agents** toward insecure patches via comments, skill text, and plausible “fixes.”

**Goal:** find exploitable paths and process gaps that let someone read, alter, or destroy financial data—or persist access—without legitimate business intent.

## When to run

- New/changed `*.functions.ts`, `src/routes/api/**`, auth, posting, storage, Helm/Docker/CI
- Any change touching money parsing, journal lines, sessions, uploads, or env secrets
- Before merging PRs labeled security-sensitive or touching invariants in `AGENTS.md`

## Mindset (non-negotiable)

1. **Think in chains** — auth bypass → IDOR → attachment poison → XSS in filename → session theft. One “low” plus one “low” may be critical here.
2. **Trust boundaries** — browser, RPC handler, raw API route, SQLite file on disk, S3 bucket, IdP, operator env, **agent context** (skills, comments, `AGENTS.md`).
3. **Prove it** — every finding needs `file:line`, attacker prerequisites, impact on **cents/ledger/PII**, and a minimal PoC *sketch* (request shape or code path), not generic CWE text.
4. **Process is a vuln** — missing `requireAuthMiddleware`, static `~/db` import in client bundle, `parseFloat` on user money, posting outside `postJournalSync`, or “we’ll add auth later” are **merge blockers** for this app.
5. **Do not rationalize MVP gaps** — document intentional shared-tenant model (any authed user sees all books) separately from **accidental** missing checks (upload to arbitrary `sourceId`, unauthenticated RPC).

## Review workflow

Copy and track:

```
Security review progress:
- [ ] 1. Map changed surface (RPC, API routes, auth, storage, CI)
- [ ] 2. AuthZ on every new entrypoint (middleware + ownership)
- [ ] 3. Financial integrity (cents, micro-units, journal balance)
- [ ] 4. Injection & deserialization (SQL, path, prototype, type confusion)
- [ ] 5. Files & SSRF (upload MIME, keys, presign, path traversal)
- [ ] 6. Client bundle & secrets (import-protection, env leak)
- [ ] 7. Session & identity (bootstrap, OIDC, account linking)
- [ ] 8. LLM-specific & agent supply chain (see references)
- [ ] 9. Deployment & ops (TLS, secrets, backups, logging)
- [ ] 10. Write report (template below)
```

### Step 1 — Surface map

For each change, list **entrypoints** and **data classes** touched:

| Class | Examples in simple-books |
|-------|---------------------------|
| Ledger | `journal_entries`, `postJournalSync`, invoice void/receipt |
| Money | integer cents, `parseMoneyToCents`, mileage `amountCents` |
| PII | customer names, emails, attachment filenames |
| AuthN/Z | `requireAuthMiddleware`, `/api/auth/$`, `getAuthConfig` |
| Blobs | `POST /api/attachments/upload`, presigned GET |

Grep aids:

```bash
rg 'createServerFn|createFileRoute\(.*/api/' src --glob '*.ts'
rg 'requireAuthMiddleware' src/server -l
rg -l 'createServerFn' src | xargs rg -L 'requireAuthMiddleware'  # candidates missing auth
rg 'parseFloat|eval\(|dangerouslySetInnerHTML|sql`' src
rg 'from ['\''\"]~/db|from ['\''\"]~/lib/storage' src --glob '!*.server.ts'
```

### Step 2 — AuthZ (common + novel)

**Baseline (must hold):**

- Every business `createServerFn` uses `requireAuthMiddleware` (see [adding-a-server-fn](../adding-a-server-fn/SKILL.md)).
- Raw API routes (`src/routes/api/**`) call `auth.api.getSession` and reject 401.
- Do not rely on `beforeLoad` alone; RPC is directly callable.

**Project threat model ([multi-user-auth](../multi-user-auth/SKILL.md)):**

- After bootstrap, **all authenticated users share one ledger** — not IDOR between users; **is** IDOR if endpoints skip auth or leak to anonymous callers.
- `getAuthConfig` is intentionally unauthenticated — confirm it exposes only `{ oidcEnabled, needsFirstUser, allowPublicSignUp }`, never secrets or row counts beyond boolean needs.

**Adversarial questions:**

- Can a guest call a “read” RPC that mutates via side effect?
- Can `POST` handlers be invoked with `GET` or vice versa?
- Race: two parallel sign-ups when `user` count is 0?
- OIDC account linking: attacker IdP email matching owner → takeover? (document operator IdP trust)
- `ALLOW_PUBLIC_SIGNUP=true` in prod — flag as **critical misconfig**, not code bug

**Attachments (high value):** upload/register uses `sourceId` without verifying the parent record exists or is in a valid state — test **orphan blob**, **cross-link** (attach to another user’s invoice ID if IDs are guessable), **MIME sniff bypass** (`Content-Type` vs magic bytes). See [document-storage](../document-storage/SKILL.md).

### Step 3 — Financial integrity

Invariants from `AGENTS.md`:

- User money input → integer cents (`~/lib/money.ts`); never `parseFloat` on user strings.
- Rates/quantities → micro-units where fractional.
- Business events → `postJournalSync` only; debits = credits.

Attack angles:

- Integer overflow / negative quantities in mileage or line items
- Rounding asymmetry (create vs void) → drift or duplicate revenue
- Partial failure: DB commit without journal or reverse
- **Logic bugs** LLMs love: pay invoice twice, void after payment, delete receipt without reversing journal
- Client-supplied `amountCents` vs server recomputation — **server must be source of truth**

### Step 4 — Injection & unsafe parsing

- Drizzle: prefer typed builders; flag dynamic `sql` fragments with user input
- `z.parse` bypass: `inputValidator` missing or `as any` on `data`
- `JSON.parse` on untrusted blobs; `structuredClone` of request objects with prototype pollution vectors in dependencies
- Path traversal: `storageKey`, `file.name`, `join(UPLOAD_DIR, storageKey)` — reject `..`, absolute paths, odd encodings

### Step 5 — Files, SSRF, storage

Check `src/lib/storage.server.ts` and upload route:

- Size cap (`UPLOAD_MAX_BYTES`), MIME allowlist — can attacker upload `image/svg+xml` with script?
- **Trust client `file.type`** — magic-byte validation missing = common LLM oversight
- Presigned URL TTL and scope; leakage via Referer/logs
- S3 credentials in env — never in client bundle or `getStorageConfig` response

### Step 6 — Client bundle & import protection

Per [tanstack-start-bun](../tanstack-start-bun/SKILL.md):

- Static imports of `~/db/client`, `storage.server`, `posting.ts` from non-`*.server.ts` / non-handler code → **secret/DB leak to browser**
- Run production build mentally: “what lands in the client chunk?”

### Step 7 — Session & crypto

- Cookie flags: `HttpOnly`, `Secure`, `SameSite` (Better Auth defaults — verify not weakened)
- Session fixation on login; logout invalidates server session
- No secrets in URLs or error messages

### Step 8 — LLM-powered attacker & agent supply chain

Read [references/llm-adversary-tactics.md](references/llm-adversary-tactics.md) and apply **every** tactic category to the diff.

Also review **process artifacts** the attacker can edit in-repo:

- `.agents/skills/**`, `AGENTS.md`, comments (“safe to skip auth here”)
- Suggested agent patterns that violate invariants
- CI gaps: no `bun run build` import-protection, no dependency audit on release

### Step 9 — Deployment

See [deployment](../deployment/SKILL.md): TLS termination, `BETTER_AUTH_SECRET`, DB file permissions, backup encryption, PII in logs/traces.

## Severity rubric (financial app)

| Level | Criteria |
|-------|----------|
| **Critical** | Unauthenticated access to ledger/PII/attachments; arbitrary journal write; RCE; full account takeover; prod secret in client |
| **High** | Authenticated but unauthorized write (if per-user model added later); persistent XSS; SQLi; path traversal read/write blobs; auth bypass on mutation |
| **Medium** | CSRF on state-changing cookie auth; info disclosure (stack traces, internal IDs); weak upload validation with plausible exploit |
| **Low** | Hardening, defense-in-depth, misconfig only with safe defaults |
| **Note** | Intentional MVP shared ledger — not a finding unless docs promise isolation |

## Report template

```markdown
# Security review: [scope]

## Executive summary
[2–4 sentences: worst case, merge recommendation]

## Threat model assumed
- Attacker: [anonymous / authed shared user / operator / LLM agent in repo]
- Assets: [ledger, PII, attachments, sessions]

## Findings

### [CRITICAL|HIGH|MEDIUM|LOW] Title
- **Location:** `path:line`
- **Prerequisites:** …
- **Impact:** … (financial / legal / availability)
- **PoC sketch:** …
- **Fix:** … (minimal, invariant-preserving)
- **Regression test:** …

## Invariant audit
| Invariant | Status |
|-----------|--------|
| requireAuth on business RPC | pass/fail |
| postJournalSync for business events | pass/fail |
| integer cents for user money | pass/fail |
| server-only imports | pass/fail |

## LLM/agent supply chain
[any poisoned patterns, skill drift, or automation gaps]

## Residual risk / accepted
[MVP shared tenant, IdP trust, etc.]
```

## Merge gate

**Block merge** on any Critical/High with a plausible PoC, or any invariant failure in `AGENTS.md`.

For Medium, block unless compensating control + ticket. Never “LGTM” without running the workflow above on the **actual diff**.

## References (read on demand)

- [LLM adversary tactics](references/llm-adversary-tactics.md) — novel/chained attacks, agent manipulation
- [simple-books hotspots](references/simple-books-hotspots.md) — file-level map and recurring failure modes
