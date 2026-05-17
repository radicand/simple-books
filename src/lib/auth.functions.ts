import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth, oidcEnabled, oidcDisplayName } from '~/lib/auth.server'

export const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  const req = getRequest()
  const session = await auth.api.getSession({ headers: req.headers })
  return session
    ? { user: session.user, sessionId: session.session.id }
    : null
})

export const getAuthConfig = createServerFn({ method: 'GET' }).handler(async () => {
  return { oidcEnabled, oidcDisplayName }
})

export async function ensureSession() {
  const req = getRequest()
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) throw new Response('Unauthorized', { status: 401 })
  return session
}
