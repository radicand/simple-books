# syntax=docker/dockerfile:1

FROM oven/bun:1.3-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM deps AS build
COPY . .
RUN bun run build

FROM oven/bun:1.3-alpine AS runtime
RUN apk add --no-cache tini wget \
  && addgroup -g 1001 -S app \
  && adduser -u 1001 -S -G app app
WORKDIR /app
ENV NODE_ENV=production \
  PORT=3000 \
  DATABASE_URL=/app/data/simple-books.db
COPY --from=build --chown=app:app /app/package.json /app/bun.lock ./
RUN bun install --frozen-lockfile --production \
  && rm -rf /root/.bun/install/cache
COPY --from=build --chown=app:app /app/.output ./.output
COPY --from=build --chown=app:app /app/drizzle ./drizzle
COPY --from=build --chown=app:app /app/scripts/migrate.ts ./scripts/migrate.ts
COPY --chown=app:app docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
  && mkdir -p /app/data \
  && chown -R app:app /app
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" || exit 1
ENTRYPOINT ["/sbin/tini", "--", "/entrypoint.sh"]
