'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { usersApi } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { formatPoints } from '@/lib/utils'
import Link from 'next/link'
import type { LeaderboardEntry } from '@gamexamxi/shared'

export default function LeaderboardPage() {
  const { token } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', 'global'],
    queryFn: () => usersApi.getLeaderboard(token!),
    enabled: !!token,
  })

  const entries = data?.data ?? []
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="space-y-6">
      <h1 className="font-display text-display-lg text-dark">LEADERBOARD</h1>

      {/* Top 3 Podium */}
      {!isLoading && entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {[entries[1], entries[0], entries[2]].map((entry, i) => {
            if (!entry) return null
            const heights = ['h-24', 'h-32', 'h-20']
            const bgColors = ['bg-muted/20', 'bg-secondary', 'bg-accent/30']
            return (
              <div
                key={entry.userId}
                className={`card-brutal ${bgColors[i]} ${heights[i]} flex flex-col items-center justify-end p-3`}
              >
                <span className="text-2xl">{medals[entry.rank - 1]}</span>
                <span className="font-mono text-xs font-bold truncate w-full text-center">
                  {entry.user?.username ?? 'Unknown'}
                </span>
                <span className="font-display text-lg text-primary">
                  {formatPoints(entry.score)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Full Rankings */}
      <div className="space-y-2">
        {isLoading ? (
          Array(10).fill(0).map((_, i) => (
            <div key={i} className="card-brutal bg-surface p-4 animate-pulse h-16" />
          ))
        ) : entries.length === 0 ? (
          <div className="card-brutal bg-surface p-12 text-center">
            <p className="font-display text-display-md text-muted">NO DATA YET</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.userId} className="card-brutal bg-surface p-4">
              <div className="flex items-center gap-4">
                <span className="font-display text-2xl text-dark w-8 text-center">
                  {entry.rank <= 3 ? medals[entry.rank - 1] : `#${entry.rank}`}
                </span>
                <div className="flex-1">
                  <Link
                    href={`/profile/${entry.user?.username ?? entry.userId}`}
                    className="font-mono font-bold text-sm text-dark hover:text-primary"
                  >
                    {entry.user?.username ?? 'Unknown'}
                  </Link>
                </div>
                <span className="font-display text-xl text-primary">
                  {formatPoints(entry.score)} PTS
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
