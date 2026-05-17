import { createFileRoute } from '@tanstack/react-router'
import { sql } from 'drizzle-orm'
import { auth } from '~/lib/auth'
import { db } from '~/db/client'

async function guardSignUp(request: Request): Promise<Response | null> {
  if (process.env.ALLOW_PUBLIC_SIGNUP === 'true') return null
  const url = new URL(request.url)
  if (!url.pathname.includes('/sign-up/email')) return null
  const rows = (await db.all(sql`SELECT COUNT(*) as c FROM user`)) as Array<{
    c: number
  }>
  if (Number(rows[0]?.c ?? 0) === 0) return null
  return Response.json(
    {
      message:
        'Email sign-up is disabled. Ask the owner to add you in your identity provider, then sign in with SSO.',
    },
    { status: 403 },
  )
}

async function handleAuth(request: Request) {
  const blocked = await guardSignUp(request)
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
