# skill: deployment (Docker, Helm, release-please)

## Layout

| Artifact | Path |
|----------|------|
| Dockerfile | repo root |
| Entrypoint (migrate + start) | `docker/entrypoint.sh` |
| Helm chart | `deploy/helm/simple-books/` |
| CI | `.github/workflows/ci.yml` |
| Image publish | `.github/workflows/docker.yml` → `ghcr.io/radicand/simple-books` |
| Versioning | `release-please-config.json`, `.release-please-manifest.json` |

## Version bumps

release-please on `main` opens a PR that updates:

- `package.json` `version`
- `deploy/helm/simple-books/Chart.yaml` (`version` + `appVersion` via generic updater)
- `CHANGELOG.md`

Merge that PR; the GitHub Release + `v*` tag triggers `helm-release.yml` (chart `.tgz` on the release).

## Local

```bash
docker build -t simple-books:dev .
docker run --rm -p 3000:3000 \
  -e BETTER_AUTH_SECRET="$(bun run auth:secret)" \
  -e BETTER_AUTH_URL=http://localhost:3000 \
  -v simple-books-data:/app/data \
  simple-books:dev

helm lint deploy/helm/simple-books
helm template sb deploy/helm/simple-books --set secretEnv.BETTER_AUTH_SECRET=x
```

## K8s notes

- **replicaCount must stay 1** with bundled SQLite (PVC at `/app/data`).
- Set `BETTER_AUTH_URL` to the public URL; OIDC redirect must match.
- Prefer `existingSecretName` + External Secrets in production instead of `secretEnv` in values.
- Health: `GET /api/health`

## CI smoke test

Same as local: `db:reset`, `start`, Playwright. Workflow sets `ALLOW_PUBLIC_SIGNUP=true` for the sign-up flow.
