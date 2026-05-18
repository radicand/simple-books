import { createServerFn, createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth, oidcEnabled, oidcDisplayName } from '~/lib/auth'
import { resolveDisplayUser } from '~/lib/oidc-display-user'

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
    if (!context.session) return null
    const user = await resolveDisplayUser(context.session.user)
    return { user, sessionId: context.session.session.id }
  })

export const getAuthConfig = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { countUsers } = await import('~/db/user-count')
    const userCount = await countUsers()
    return {
      oidcEnabled,
      oidcDisplayName,
      needsFirstUser: userCount === 0,
      emailAuthEnabled: !oidcEnabled,
    }
  },
)
