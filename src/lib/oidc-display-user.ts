import { and, desc, eq } from 'drizzle-orm'
import { account } from '~/db/auth-schema'
import { db } from '~/db/client'
import { oidcEnabled } from '~/lib/auth'

export type DisplayUser = {
  id: string
  name?: string | null
  email: string
  image?: string | null
}

function decodeIdTokenPayload(idToken: string): Record<string, unknown> | null {
  try {
    const parts = idToken.split('.')
    if (parts.length < 2) return null
    const payload = parts[1]
    if (!payload) return null
    const json = Buffer.from(payload, 'base64url').toString('utf8')
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

function claimsToDisplay(claims: Record<string, unknown>): {
  name?: string
  email?: string
  image?: string
} {
  const email = typeof claims.email === 'string' ? claims.email : undefined
  const given =
    typeof claims.given_name === 'string' ? claims.given_name : undefined
  const family =
    typeof claims.family_name === 'string' ? claims.family_name : undefined
  const combined = [given, family].filter(Boolean).join(' ').trim()
  const name =
    (typeof claims.name === 'string' ? claims.name : undefined) ||
    (typeof claims.preferred_username === 'string'
      ? claims.preferred_username
      : undefined) ||
    combined ||
    undefined
  const image =
    typeof claims.picture === 'string' ? claims.picture : undefined
  return { name, email, image }
}

/**
 * When OIDC is enabled, prefer IdP claims from the linked account's id_token for
 * UI display. Account linking may attach SSO to an existing user row whose
 * name/email do not match the signed-in IdP identity.
 */
export async function resolveDisplayUser(
  user: DisplayUser,
): Promise<DisplayUser> {
  if (!oidcEnabled) return user

  const rows = await db
    .select({ idToken: account.idToken })
    .from(account)
    .where(and(eq(account.userId, user.id), eq(account.providerId, 'oidc')))
    .orderBy(desc(account.updatedAt))
    .limit(1)

  const idToken = rows[0]?.idToken
  if (!idToken) return user

  const claims = decodeIdTokenPayload(idToken)
  if (!claims) return user

  const fromIdp = claimsToDisplay(claims)
  return {
    ...user,
    name: fromIdp.name ?? user.name,
    email: fromIdp.email ?? user.email,
    image: fromIdp.image ?? user.image,
  }
}
