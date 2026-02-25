'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

export default function GoogleCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setAuth = useAuthStore((s) => s.setAuth)
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error || !code || !state) {
      router.replace('/')
      return
    }

    authApi.googleCallback({ code, state })
      .then((res) => {
        setAuth(res.token, res.user as Parameters<typeof setAuth>[1])
        router.replace('/')
      })
      .catch(() => {
        router.replace('/')
      })
  }, [searchParams, router, setAuth])

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="card-brutal bg-white p-8 text-center border-brutal border-dark">
        <div className="font-display text-display-md text-dark mb-3">
          GAME<span className="text-primary">XAMXI</span>
        </div>
        <p className="font-mono text-sm text-muted">Signing you in with Google...</p>
        <div className="mt-5 flex justify-center">
          <div className="w-6 h-6 border-2 border-dark border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    </div>
  )
}
