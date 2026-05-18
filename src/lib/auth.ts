import '@tanstack/react-start/server-only'
import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { genericOAuth } from 'better-auth/plugins'
import { sql } from 'drizzle-orm'
import { db, isPostgres } from '~/db/client'
import { user } from '~/db/auth-schema'
import { authSchema } from '~/db/tables'
import { countUsers } from '~/db/user-count'

const oidcConfigured =
  !!process.env.OIDC_ISSUER_URL &&
  !!process.env.OIDC_CLIENT_ID &&
  !!process.env.OIDC_CLIENT_SECRET

/** Case-insensitive email lookup for OIDC ↔ local account linking. */
async function findUserByEmailInsensitive(
  email: string,
): Promise<{ email: string } | null> {
  const normalized = email.toLowerCase()
  const rows = await db
    .select({ email: user.email })
    .from(user)
    .where(sql`lower(${user.email}) = ${normalized}`)
    .limit(1)
  return rows[0] ?? null
}

/**
 * Email passed to Better Auth's OAuth user lookup. When the IdP email does not
 * match the sole owner (e.g. legacy email/password bootstrap), map to that
 * user's email so trusted-provider account linking runs instead of user create.
 */
async function resolveOidcLinkEmail(oidcEmail: string): Promise<string> {
  const normalized = oidcEmail.toLowerCase()
  const existing = await findUserByEmailInsensitive(normalized)
  if (existing) return existing.email.toLowerCase()

  const owners = await db.select({ email: user.email }).from(user)
  if (owners.length === 1) return owners[0]!.email.toLowerCase()

  return normalized
}

const plugins = []

if (oidcConfigured) {
  plugins.push(
    genericOAuth({
      config: [
        {
          providerId: 'oidc',
          clientId: process.env.OIDC_CLIENT_ID!,
          clientSecret: process.env.OIDC_CLIENT_SECRET!,
          discoveryUrl: `${process.env.OIDC_ISSUER_URL!.replace(/\/$/, '')}/.well-known/openid-configuration`,
          redirectURI:
            process.env.OIDC_REDIRECT_URI ||
            `${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/api/auth/oauth2/callback/oidc`,
          scopes: ['openid', 'email', 'profile'],
          pkce: true,
          mapProfileToUser: async (profile) => {
            const raw =
              typeof profile.email === 'string' ? profile.email : undefined
            if (!raw) return profile
            const linkEmail = await resolveOidcLinkEmail(raw)
            if (linkEmail === raw.toLowerCase()) return profile
            return { ...profile, email: linkEmail }
          },
        },
      ],
    }),
  )
}

const accountLinking = oidcConfigured
  ? {
      enabled: true as const,
      // Trust the operator-configured IdP so SSO can link to an existing
      // email/password owner (same email) or provision a new user on first sign-in.
      trustedProviders: ['oidc'] as const,
      // MVP does not verify local emails; requireLocalEmailVerified would block linking.
      requireLocalEmailVerified: false,
    }
  : { enabled: true as const }

async function assertBootstrapUserSlot(): Promise<void> {
  if ((await countUsers()) >= 1) {
    throw new APIError('FORBIDDEN', {
      message:
        'An account already exists on this install. Sign in instead of creating another user.',
    })
  }
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: isPostgres() ? 'pg' : 'sqlite',
    schema: authSchema,
    usePlural: false,
  }),
  databaseHooks: {
    user: {
      create: {
        before: async () => {
          await assertBootstrapUserSlot()
        },
      },
    },
  },
  account: {
    accountLinking,
  },
  emailAndPassword: {
    enabled: !oidcConfigured,
    autoSignIn: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    requireEmailVerification: false,
  },
  plugins,
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
  rateLimit: {
    enabled: process.env.NODE_ENV === 'production',
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 10, max: 5 },
    },
  },
})

export const oidcEnabled = oidcConfigured
export const oidcDisplayName =
  process.env.OIDC_DISPLAY_NAME || 'Single Sign-On'
