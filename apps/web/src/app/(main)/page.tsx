'use client'

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

export default function HomePage() {
  const { token, user, isAuthenticated } = useAuthStore()
  const { open: openLogin } = useLoginModal()

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['games', 'OPEN'],
    queryFn: () => gamesApi.list({ status: 'OPEN', limit: '10' }, token ?? undefined),
  })

  const events = (eventsData?.data ?? []) as PredictionEvent[]

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="border-brutal border-dark bg-dark text-white p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="animate-marquee-container">
            <span className="font-display text-[120px] animate-marquee opacity-20 inline-block">
              PREDICT WIN PREDICT WIN PREDICT WIN&nbsp;
            </span>
          </div>
        </div>
        <div className="relative z-10">
          {isAuthenticated && user ? (
            <>
              <h1 className="font-display text-display-lg text-white leading-none">
                GM, <span className="text-secondary">{user.username?.toUpperCase()}</span>
              </h1>
              <p className="font-mono text-sm text-white/60 mt-2">
                You have <span className="text-secondary font-bold">{formatPoints(user.points ?? 0)} points</span>
                {' '}· Streak: <span className="text-accent font-bold">🔥{user.loginStreak}</span>
              </p>
              <div className="mt-4 flex gap-3">
                <Link href="/games">
                  <Button variant="secondary" size="md">View All Games →</Button>
                </Link>
                <Link href="/groups">
                  <Button variant="ghost" size="md">My Groups</Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="font-display text-display-lg text-white leading-none">
                PREDICT.<br /><span className="text-secondary">WIN.</span> FLEX.
              </h1>
              <p className="font-mono text-sm text-white/60 mt-2">
                The ultimate prediction platform. Join to earn points & compete.
              </p>
              <div className="mt-4 flex gap-3">
                <Button variant="secondary" size="md" onClick={openLogin}>
                  Login with Google →
                </Button>
                <Link href="/games">
                  <Button variant="ghost" size="md">Browse Games</Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Live Games Feed */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-display-md text-dark">LIVE GAMES</h2>
          <Badge variant="primary">
            {events.length} OPEN
          </Badge>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card-brutal bg-surface p-5 animate-pulse">
                <div className="h-4 bg-muted/20 mb-3 w-3/4" />
                <div className="h-3 bg-muted/20 mb-2 w-1/2" />
                <div className="h-8 bg-muted/20 mt-4" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="card-brutal bg-surface p-8 text-center">
            <p className="font-display text-display-md text-muted">NO GAMES YET</p>
            <p className="font-mono text-sm text-muted mt-2">Be the first to create a prediction!</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {events.map((event) => (
              <Link key={event.id} href={`/games/${event.id}`}>
                <Card hoverable className="bg-surface">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant="primary">{event.type}</Badge>
                    <span className="font-mono text-xs text-muted">
                      {timeUntil(event.predictDeadline)}
                    </span>
                  </div>
                  <h3 className="font-mono font-bold text-dark text-sm leading-snug mb-3">
                    {event.title}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xl text-primary">
                      +{formatPoints(event.pointReward)} PTS
                    </span>
                    {event.bonusMultiplier > 1 && (
                      <Badge variant="secondary">
                        {event.bonusMultiplier}x BONUS
                      </Badge>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Quick Stats — only for logged-in users */}
      {isAuthenticated && user && (
        <section className="grid grid-cols-3 gap-3">
          {[
            { label: 'POINTS', value: formatPoints(user.points ?? 0), color: 'text-primary' },
            { label: 'STREAK', value: `🔥${user.loginStreak}`, color: 'text-accent' },
            { label: 'RANK', value: '#—', color: 'text-secondary' },
          ].map((stat) => (
            <div key={stat.label} className="card-brutal bg-surface p-4 text-center">
              <div className={`font-display text-2xl ${stat.color}`}>{stat.value}</div>
              <div className="font-mono text-xs text-muted mt-1 uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </section>
      )}

      {/* Guest CTA */}
      {!isAuthenticated && (
        <div className="card-brutal bg-secondary/20 border-secondary p-6 text-center">
          <p className="font-display text-display-md text-dark mb-2">READY TO PLAY?</p>
          <p className="font-mono text-sm text-muted mb-4">Login with Google to predict & win points.</p>
          <button
            onClick={openLogin}
            className="btn-brutal bg-primary text-white px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider"
          >
            Login with Google
          </button>
        </div>
      )}
    </div>
  )
}
