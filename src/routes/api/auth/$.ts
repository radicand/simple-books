import { createFileRoute } from '@tanstack/react-router'

async function guardSignUp(request: Request): Promise<Response | null> {
  const url = new URL(request.url)
  if (!url.pathname.includes('/sign-up/email')) return null
  const { countUsers } = await import('~/db/user-count')
  if ((await countUsers()) === 0) return null
  return Response.json(
    {
      message:
        'Email sign-up is disabled. Ask the owner to add you in your identity provider, then sign in with SSO.',
    },
    { status: 403 },
  )
}

async function guardEmailSignIn(request: Request): Promise<Response | null> {
  const { oidcEnabled } = await import('~/lib/auth')
  if (!oidcEnabled) return null
  const url = new URL(request.url)
  if (!url.pathname.includes('/sign-in/email')) return null
  return Response.json(
    {
      message:
        'Email sign-in is disabled when SSO is configured. Use your identity provider to sign in.',
    },
    { status: 403 },
  )
}

async function handleAuth(request: Request) {
  const blocked =
    (await guardSignUp(request)) ?? (await guardEmailSignIn(request))
  if (blocked) return blocked
  const { auth } = await import('~/lib/auth')
  return auth.handler(request)
}

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => handleAuth(request),
      POST: ({ request }) => handleAuth(request),
    },
  },
})
