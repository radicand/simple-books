import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '~/lib/auth-client'
import { getSession, getAuthConfig } from '~/lib/auth.functions'
import { Button, Card, CardBody, Field, Input } from '~/components/ui'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const session = await getSession()
    if (session) throw redirect({ to: '/dashboard' })
  },
  loader: () => getAuthConfig(),
  component: LoginPage,
})

function LoginPage() {
  const cfg = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const needsFirstUser = cfg.needsFirstUser

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (needsFirstUser) {
        const res = await authClient.signUp.email({
          email,
          password,
          name: name || email.split('@')[0]!,
        })
        if (res.error) throw new Error(res.error.message ?? 'Sign-up failed.')
      } else {
        const res = await authClient.signIn.email({
          email,
          password,
        })
        if (res.error) throw new Error(res.error.message ?? 'Sign-in failed.')
      }
      await router.invalidate()
      navigate({ to: '/dashboard' })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function ssoSignIn() {
    setError(null)
    setBusy(true)
    try {
      await authClient.signIn.oauth2({
        providerId: 'oidc',
        callbackURL: '/dashboard',
        errorCallbackURL: '/login',
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 sm:px-6 py-12 bg-[var(--color-bg)]">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center gap-2 justify-center mb-8">
          <Logo />
          <span className="text-[17px] font-semibold tracking-tight">simple-books</span>
        </div>

        <Card>
          <CardBody className="!p-7">
            <h1 className="text-[20px] font-semibold tracking-tight mb-1">
              {needsFirstUser ? 'Create your owner account' : 'Welcome back'}
            </h1>
            <p className="text-sm text-[var(--color-ink-soft)] mb-6">
              {needsFirstUser
                ? 'This is the first account on this install. You\u2019ll be the owner.'
                : cfg.oidcEnabled
                  ? `Sign in with email or ${cfg.oidcDisplayName}. Additional users (e.g. your accountant) should use SSO after the owner adds them in your identity provider.`
                  : 'Sign in with your email and password.'}
            </p>

            {cfg.oidcEnabled && !needsFirstUser && (
              <>
                <Button
                  intent="neutral"
                  full
                  onClick={ssoSignIn}
                  disabled={busy}
                  className="!min-h-11"
                >
                  Continue with {cfg.oidcDisplayName}
                </Button>
                <Divider>or use email</Divider>
              </>
            )}

            <form onSubmit={submit} className="flex flex-col gap-4">
              {needsFirstUser && (
                <Field label="Name" htmlFor="name">
                  <Input
                    id="name"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Carter"
                  />
                </Field>
              )}
              <Field label="Email" htmlFor="email" required>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </Field>
              <Field
                label="Password"
                htmlFor="password"
                hint={needsFirstUser ? 'Minimum 12 characters.' : undefined}
                required
              >
                <Input
                  id="password"
                  type="password"
                  autoComplete={
                    needsFirstUser ? 'new-password' : 'current-password'
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={needsFirstUser ? 12 : undefined}
                  required
                />
              </Field>

              {error && (
                <div className="text-[13px] text-[var(--color-negative)] bg-[oklch(0.97_0.03_25)] border border-[oklch(0.88_0.07_25)] rounded-[10px] px-3 py-2">
                  {error}
                </div>
              )}

              <Button
                intent="brand"
                type="submit"
                disabled={busy}
                className="!min-h-11"
              >
                {busy
                  ? 'Working…'
                  : needsFirstUser
                    ? 'Create account'
                    : 'Sign in'}
              </Button>
            </form>

            {!needsFirstUser && !cfg.oidcEnabled && (
              <p className="text-[13px] text-[var(--color-warning)] mt-4 leading-relaxed">
                To invite additional users, configure OIDC in your environment
                (OIDC_ISSUER_URL, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET).
              </p>
            )}
          </CardBody>
        </Card>

        <p className="text-[12px] text-[var(--color-ink-faint)] mt-6 text-center">
          Calm, real double-entry bookkeeping for sole proprietors.
        </p>
      </div>
    </div>
  )
}

function Divider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-[var(--color-border)]" />
      <span className="text-[11px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        {children}
      </span>
      <div className="flex-1 h-px bg-[var(--color-border)]" />
    </div>
  )
}

function Logo() {
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-[10px] bg-[var(--color-brand)] text-white">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 5h11a3 3 0 0 1 3 3v11" />
        <path d="M4 5v13a2 2 0 0 0 2 2h12" />
        <path d="M8 9h6M8 13h4" />
      </svg>
    </span>
  )
}
