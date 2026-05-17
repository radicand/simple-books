import { createFileRoute } from '@tanstack/react-router'
import { sql } from 'drizzle-orm'
import { auth, oidcEnabled } from '~/lib/auth'
import { db } from '~/db/client'

async function userCount(): Promise<number> {
  const rows = (await db.all(sql`SELECT COUNT(*) as c FROM user`)) as Array<{
    c: number
  }>
  return Number(rows[0]?.c ?? 0)
}

async function guardSignUp(request: Request): Promise<Response | null> {
  const url = new URL(request.url)
  if (!url.pathname.includes('/sign-up/email')) return null
  if ((await userCount()) === 0) return null
  return Response.json(
    {
      message:
        'Email sign-up is disabled. Ask the owner to add you in your identity provider, then sign in with SSO.',
    },
    { status: 403 },
  )
}

async function guardEmailSignIn(request: Request): Promise<Response | null> {
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
