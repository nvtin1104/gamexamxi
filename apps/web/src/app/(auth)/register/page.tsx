'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

export default function RegisterPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  function validate() {
    const newErrors: Record<string, string> = {}
    if (form.username.length < 3) newErrors.username = 'Minimum 3 characters'
    if (!/^[a-zA-Z0-9_]+$/.test(form.username)) newErrors.username = 'Letters, numbers, underscores only'
    if (!form.email.includes('@')) newErrors.email = 'Invalid email'
    if (form.password.length < 8) newErrors.password = 'Minimum 8 characters'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    try {
      const res = await authApi.register(form)
      setAuth(res.token, res.user as Parameters<typeof setAuth>[1])
      router.push('/')
    } catch (err: unknown) {
      setErrors({ general: err instanceof Error ? err.message : 'Registration failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-display text-display-lg text-dark tracking-wide">
            GAME<span className="text-primary">XAMXI</span>
          </h1>
          <p className="font-mono text-sm text-muted mt-1">Join the prediction game</p>
        </div>

        <div className="card-brutal bg-surface p-7">
          <h2 className="font-display text-display-md text-dark mb-6">REGISTER</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Username"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              placeholder="cooluser123"
              error={errors.username}
              hint="3-20 chars, letters/numbers/underscore only"
              required
              autoComplete="username"
            />

            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="your@email.com"
              error={errors.email}
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              error={errors.password}
              hint="Minimum 8 characters"
              required
              autoComplete="new-password"
            />

            {errors.general && (
              <div className="border-brutal border-red-500 bg-red-50 p-3">
                <p className="font-mono text-xs text-red-600 font-bold">{errors.general}</p>
              </div>
            )}

            <div className="border-brutal border-secondary bg-secondary/20 p-3">
              <p className="font-mono text-xs text-dark font-bold">
                🎁 +100 POINTS on signup!
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              fullWidth
              className="mt-2"
            >
              Create Account
            </Button>
          </form>

          <p className="font-mono text-xs text-muted mt-5 text-center">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Login →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
