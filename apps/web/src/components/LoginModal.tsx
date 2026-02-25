'use client'

import { useEffect, useState } from 'react'
import { useLoginModal } from '@/store/loginModal'
import { authApi } from '@/lib/api'

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="flex-shrink-0">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export function LoginModal() {
  const { isOpen, close } = useLoginModal()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, close])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  async function handleGoogle() {
    setError('')
    setLoading(true)
    try {
      const { url } = await authApi.googleUrl()
      window.location.href = url
    } catch {
      setError('Unable to start Google login. Try again.')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-dark/80 backdrop-blur-[2px]"
      onClick={close}
    >
      <div
        className="card-brutal bg-surface w-full max-w-sm mx-4 p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6">
          <div className="font-display text-display-lg text-dark leading-none mb-1">
            GAME<span className="text-primary">XAMXI</span>
          </div>
          <h2 className="font-display text-display-md text-dark">JOIN THE GAME</h2>
          <p className="font-mono text-xs text-muted mt-2">
            Login to predict, earn points & compete.
          </p>
        </div>

        {/* Google Button */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 border-brutal border-dark bg-white px-5 py-3.5 font-mono text-sm font-bold uppercase tracking-wider transition-colors hover:bg-dark hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {!loading && <GoogleIcon />}
          <span>{loading ? 'Redirecting...' : 'Continue with Google'}</span>
        </button>

        {error && (
          <div className="mt-3 border-brutal border-red-500 bg-red-50 px-3 py-2">
            <p className="font-mono text-xs text-red-600 font-bold">{error}</p>
          </div>
        )}

        {/* Guest dismiss */}
        <button
          onClick={close}
          className="mt-5 w-full font-mono text-xs text-muted hover:text-dark transition-colors text-center py-1"
        >
          Continue as guest →
        </button>
      </div>
    </div>
  )
}
