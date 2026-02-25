'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { useLoginModal } from '@/store/loginModal'
import { gamesApi } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatPoints, timeUntil } from '@/lib/utils'
import Link from 'next/link'
import type { PredictionEvent } from '@gamexamxi/shared'

type StatusFilter = 'OPEN' | 'LOCKED' | 'RESOLVED'

export default function GamesPage() {
  const { token, isAuthenticated } = useAuthStore()
  const { open: openLogin } = useLoginModal()
  const [status, setStatus] = useState<StatusFilter>('OPEN')

  const { data, isLoading } = useQuery({
    queryKey: ['games', status],
    queryFn: () => gamesApi.list({ status, limit: '20' }, token ?? undefined),
  })

  const events = (data?.data ?? []) as PredictionEvent[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-display-lg text-dark">GAMES</h1>
        {isAuthenticated ? (
          <Link href="/games/create">
            <Button variant="primary">+ CREATE</Button>
          </Link>
        ) : (
          <Button variant="primary" onClick={openLogin}>+ CREATE</Button>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex gap-2">
        {(['OPEN', 'LOCKED', 'RESOLVED'] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`btn-brutal text-xs px-4 py-2 ${
              status === s ? 'bg-primary text-white' : 'bg-surface text-dark'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Events Grid */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-brutal bg-surface p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="card-brutal bg-surface p-12 text-center">
          <p className="font-display text-display-md text-muted">NO {status} GAMES</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Link key={event.id} href={`/games/${event.id}`}>
              <Card hoverable className="bg-surface">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant={status === 'OPEN' ? 'primary' : status === 'RESOLVED' ? 'accent' : 'dark'}>
                        {event.type}
                      </Badge>
                      {event.bonusMultiplier > 1 && (
                        <Badge variant="secondary">{event.bonusMultiplier}x</Badge>
                      )}
                    </div>
                    <h3 className="font-mono font-bold text-dark text-sm">{event.title}</h3>
                    {event.description && (
                      <p className="font-mono text-xs text-muted mt-1 line-clamp-1">{event.description}</p>
                    )}
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1">
                    <span className="font-display text-2xl text-primary">
                      +{formatPoints(event.pointReward)}
                    </span>
                    <span className="font-mono text-xs text-muted">
                      {status === 'OPEN' ? timeUntil(event.predictDeadline) : status}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Guest login nudge */}
      {!isAuthenticated && events.length > 0 && (
        <div className="card-brutal border-primary bg-primary/5 p-5 text-center">
          <p className="font-mono text-sm font-bold text-dark mb-3">
            Login to predict and earn points!
          </p>
          <button
            onClick={openLogin}
            className="btn-brutal bg-primary text-white px-6 py-2 font-mono text-xs font-bold uppercase"
          >
            Login with Google
          </button>
        </div>
      )}
    </div>
  )
}
