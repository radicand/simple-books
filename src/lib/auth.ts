import '@tanstack/react-start/server-only'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { genericOAuth } from 'better-auth/plugins'
import { db } from '~/db/client'
import * as authSchema from '~/db/auth-schema'

const oidcConfigured =
  !!process.env.OIDC_ISSUER_URL &&
  !!process.env.OIDC_CLIENT_ID &&
  !!process.env.OIDC_CLIENT_SECRET

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

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: authSchema,
    usePlural: false,
  }),
  account: {
    accountLinking,
  },
  emailAndPassword: {
    enabled: true,
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
