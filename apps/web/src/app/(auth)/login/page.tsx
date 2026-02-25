'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await authApi.login(form)
      setAuth(res.token, res.user as Parameters<typeof setAuth>[1])
      router.push('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="mb-8 text-center">
          <h1 className="font-display text-display-lg text-dark tracking-wide">
            GAME<span className="text-primary">XAMXI</span>
          </h1>
          <p className="font-mono text-sm text-muted mt-1">Predict. Win. Flex.</p>
        </div>

        {/* Login Card */}
        <div className="card-brutal bg-surface p-7">
          <h2 className="font-display text-display-md text-dark mb-6">LOGIN</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="your@email.com"
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />

            {error && (
              <div className="border-brutal border-red-500 bg-red-50 p-3">
                <p className="font-mono text-xs text-red-600 font-bold">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              fullWidth
              className="mt-2"
            >
              Login
            </Button>
          </form>

          <p className="font-mono text-xs text-muted mt-5 text-center">
            No account?{' '}
            <Link
              href="/register"
              className="text-primary font-bold hover:underline"
            >
              Register here →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
