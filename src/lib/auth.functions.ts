import { createServerFn, createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth, oidcEnabled, oidcDisplayName } from '~/lib/auth'

/**
 * Server middleware: load the current session (may be null) and inject it
 * into the handler's context.
 */
export const sessionMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const session = await auth.api.getSession({ headers: getRequest().headers })
    return next({ context: { session } })
  },
)

/**
 * Server middleware: require an authenticated session. Throws 401 otherwise.
 * The session is injected into the handler's context.
 */
export const requireAuthMiddleware = createMiddleware({ type: 'function' })
  .middleware([sessionMiddleware])
  .server(async ({ context, next }) => {
    if (!context.session) throw new Response('Unauthorized', { status: 401 })
    return next({ context: { session: context.session } })
  })

export const getSession = createServerFn({ method: 'GET' })
  .middleware([sessionMiddleware])
  .handler(async ({ context }) => {
    return context.session
      ? { user: context.session.user, sessionId: context.session.session.id }
      : null
  })

export const getAuthConfig = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { db } = await import('~/db/client')
    const { sql } = await import('drizzle-orm')
    const rows = (await db.all(sql`SELECT COUNT(*) as c FROM user`)) as Array<{
      c: number
    }>
    const userCount = Number(rows[0]?.c ?? 0)
    const allowPublicSignUp = process.env.ALLOW_PUBLIC_SIGNUP === 'true'
    return {
      oidcEnabled,
      oidcDisplayName,
      needsFirstUser: userCount === 0,
      allowPublicSignUp,
    }
  },
)
