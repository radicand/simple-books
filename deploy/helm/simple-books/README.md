# simple-books Helm chart

## PostgreSQL credentials

Bundled Postgres uses the Bitnami subchart. **Do not leave `postgresql.auth.password` empty** unless every deploy runs `helm upgrade` with live cluster API access (Helm `lookup` can reuse the existing Secret). **Argo CD, Flux, and other GitOps** render manifests without cluster lookup, so an empty password produces a **new random password on every sync** while the database keeps the old one.

### GitOps / Argo CD (required)

Use a credential source **outside** chart-managed auto-generation:

1. **Bundled Postgres — existing Bitnami Secret (migration)**  
   After the first install created Secret `{release-name}-postgresql` (key `password`), pin it:

   ```yaml
   postgresql:
     enabled: true
     auth:
       existingSecret: simple-books-postgresql   # replace with your release name
       secretKeys:
         userPasswordKey: password
   ```

   Bitnami stops rendering a new Secret; the app still reads the same name via `simple-books.postgresql.secretName`.

2. **Bundled Postgres — External Secrets (recommended for GitOps)**  
   Create a Secret (e.g. via External Secrets Operator) with keys `password` (and optionally `postgres-password`). Set `postgresql.auth.existingSecret` to that Secret name. Never commit the password in plain Helm values.

3. **Managed Postgres**  
   Disable the subchart and point the app at a stable URL:

   ```yaml
   postgresql:
     enabled: false
   database:
     existingSecretName: simple-books-db   # key DATABASE_URL
   ```

### Interactive Helm only

`postgresql.auth.password: ""` is acceptable only when you always deploy with `helm upgrade --install` against the same release and namespace. Prefer an explicit password or `auth.existingSecret` for anything automated.

## Other secrets

Chart-managed `secretEnv` overwrites on every render. Production: `existingSecretName` + External Secrets (see `values.yaml`).

Example GitOps values overlay: `values-gitops.example.yaml`.

## Commands

```bash
helm dependency update deploy/helm/simple-books
helm lint deploy/helm/simple-books
```

See also: [deployment skill](../../../.agents/skills/deployment/SKILL.md), root [AGENTS.md](../../../AGENTS.md).
