---
name: deployment
description: Documents Docker image build, Helm chart, release-please versioning, GitHub Actions CI, and K8s deploy constraints for simple-books. Use when deploying, releasing, adding CI workflows, or configuring production infrastructure.
---

# Deployment

## Layout

| Artifact | Path |
|----------|------|
| Dockerfile | repo root |
| Entrypoint (migrate + start) | `docker/entrypoint.sh` |
| Helm chart | `deploy/helm/simple-books/` |
| CI | `.github/workflows/ci.yml` |
| Image publish | `.github/workflows/docker.yml` → `ghcr.io/radicand/simple-books` (release tags: `linux/amd64` + `linux/arm64`) |
| Versioning | `release-please-config.json`, `.release-please-manifest.json` |
| E2E harness | `scripts/e2e.sh` |

## E2E (local first)

Run locally before pushing; CI is confirmation only.

```bash
bun run test:e2e          # install, build, reset DB, start server, playwright
bun run test:e2e:quick    # skip build when .output is fresh
```

`scripts/e2e.sh` checks port 3000, waits on `/api/health`, runs Playwright, tears down the server.

CI (`.github/workflows/ci.yml`) caches Bun + Playwright browsers, then runs `bash scripts/e2e.sh --skip-build`.

Selector pitfalls: [playing-with-playwright](../playing-with-playwright/SKILL.md).

## Version bumps

release-please on `main` opens a PR updating `package.json`, Helm `Chart.yaml` (`version` + `appVersion`), and `CHANGELOG.md`.

Merge that PR; GitHub Release + `v*` tag triggers `helm-release.yml` (chart `.tgz` on the release).

## Local Docker / Helm

```bash
docker build -t simple-books:dev .
docker run --rm -p 3000:3000 \
  -e BETTER_AUTH_SECRET="$(bun run auth:secret)" \
  -e BETTER_AUTH_URL=http://localhost:3000 \
  -v simple-books-data:/app/data \
  simple-books:dev

helm lint deploy/helm/simple-books
helm template sb deploy/helm/simple-books \
  --set secretEnv.BETTER_AUTH_SECRET=x \
  --set secretEnv.BETTER_AUTH_URL=http://localhost:3000
```

## K8s

- **replicaCount: 1** with default SQLite; PVC at `/app/data` (SQLite file + local uploads).
- **Production:** set `postgresql.enabled: true` (bundled Bitnami chart) or `database.externalUrl`
  for managed Postgres. SQLite on a PVC is not durable — prefer PostgreSQL for real installs.
- Run `helm dependency update deploy/helm/simple-books` before lint/package when using Postgres subchart.
- Set `BETTER_AUTH_URL` to the public URL; OIDC redirect must match.
- **OIDC / SSO:** With `OIDC_*` set, successful IdP login auto-provisions users
  (new email) or links to an existing user (same email). Control access in your
  IdP; do not point casual social OAuth apps at the install unless that is intended.
- Prefer `existingSecretName` + External Secrets over `secretEnv` in values.
- Health: `GET /api/health`
- Documented values: `deploy/helm/simple-books/values.yaml` + `values.schema.json`

## Modal + Playwright

- Modal forms use `noValidate`; validation is in handlers / zod.
- `ModalDialog` supports `deferCloseMs` + `useModalClose()` so submit clicks do not hit sidebar nav underneath.
- For controlled inputs in tests, prefer `pressSequentially` (or `fill` + blur); target visible nodes when layouts duplicate text (`filter({ visible: true })`).
