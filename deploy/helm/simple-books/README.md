# simple-books Helm chart

## PostgreSQL credentials

Bundled Postgres uses the Bitnami subchart. For production or GitOps, the `simplebooks` database user's password must come from a stable user-managed source. **Do not leave `postgresql.auth.password` empty** unless every deploy runs `helm upgrade` with live cluster API access (Helm `lookup` can reuse the existing Secret). **Argo CD, Flux, and other GitOps** render manifests without cluster lookup, so an empty password can produce a **new random password on every sync** while the database keeps the old one.

### GitOps / Argo CD (required)

Use one of these stable credential sources before the first GitOps-managed deploy:

1. **Bundled Postgres — user-managed Secret (recommended)**  
   Create or sync a Secret with key `password`, then point Bitnami at it:

   ```yaml
   postgresql:
     enabled: true
     auth:
       existingSecret: simple-books-postgresql-auth
       secretKeys:
         userPasswordKey: password
   ```

   Bitnami stops rendering a new Secret; the app reads the password from that Secret and connects to the bundled Postgres service.

2. **Bundled Postgres — explicit password from private values**  
   Set `postgresql.auth.password` only from a non-committed secret values source. This prevents rotation but is easier to leak than `auth.existingSecret`.

3. **Bundled Postgres — existing Bitnami Secret (migration only)**  
   If an earlier interactive install already created Secret `{release-name}-postgresql` (key `password`), you can pin that Secret with `postgresql.auth.existingSecret`. Do this before moving the release under GitOps.

4. **Managed Postgres**  
   Disable the subchart and point the app at a stable URL:

   ```yaml
   postgresql:
     enabled: false
   database:
     existingSecretName: simple-books-db   # key DATABASE_URL
   ```

### Interactive Helm only

`postgresql.auth.password: ""` is acceptable only when you always deploy with `helm upgrade --install` against the same release and namespace. Prefer `auth.existingSecret` or an explicit password for anything automated.

## Other secrets

Chart-managed `secretEnv` overwrites on every render. Production: `existingSecretName` + External Secrets (see `values.yaml`).

Example GitOps values overlay: `values-gitops.example.yaml`.

## Commands

```bash
helm dependency update deploy/helm/simple-books
helm lint deploy/helm/simple-books
```

See also: [deployment skill](../../../.agents/skills/deployment/SKILL.md), root [AGENTS.md](../../../AGENTS.md).
