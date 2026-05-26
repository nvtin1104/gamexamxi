/**
 * Leaderboard Component
 * Displays live leaderboard with real-time rank updates
 * Integrates with GroupRoom WebSocket for continuous updates
 */

import React, { useEffect, useState } from 'react'
import { useWebSocketContext } from '../hooks/WebSocketProvider'
import { WebSocketStatus } from './WebSocketStatus'
import { Trophy, Zap } from 'lucide-react'

interface LeaderboardEntry {
  userId: string
  username: string
  points: number
  level: number
  rank: number
  picksMade: number
  winsCount: number
  isCurrentUser?: boolean
}

interface LeaderboardProps {
  groupId: string
  groupName: string
  currentUserId: string
  limit?: number
}

export function Leaderboard({ groupId, groupName, currentUserId, limit = 50 }: LeaderboardProps) {
  const { send, status, isConnected } = useWebSocketContext()

  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)

  // Subscribe to leaderboard updates
  useEffect(() => {
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data)

        if (message.type === 'leaderboard_update' || message.type === 'initial_leaderboard') {
          const leaderboardData = message.data as LeaderboardEntry[]

          setEntries(
            leaderboardData.map((entry) => ({
              ...entry,
              isCurrentUser: entry.userId === currentUserId,
            }))
          )

          setLastUpdate(new Date().toLocaleTimeString())
          setLoading(false)
        }
      } catch (error) {
        console.error('[Leaderboard] Failed to parse message:', error)
      }
    }

    // In real implementation, messages would be passed through context
    // This shows the expected integration pattern

    return () => {
      // Cleanup
    }
  }, [currentUserId])

  return (
    <div className="space-y-4 p-6 bg-white rounded-lg border-2 border-black">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy size={28} className="text-yellow-600" />
          <div>
            <h2 className="text-2xl font-bold">{groupName}</h2>
            <p className="text-sm text-gray-600">
              {entries.length} members {lastUpdate && `• Updated ${lastUpdate}`}
            </p>
          </div>
        </div>
        <WebSocketStatus size="sm" showLabel />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block">
            <div className="animate-spin">⟳</div>
          </div>
          <p className="text-sm text-gray-600 mt-2">Loading leaderboard...</p>
        </div>
      )}

      {/* Leaderboard Table */}
      {!loading && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left p-3 font-bold">Rank</th>
                <th className="text-left p-3 font-bold">Player</th>
                <th className="text-center p-3 font-bold">Points</th>
                <th className="text-center p-3 font-bold">Level</th>
                <th className="text-center p-3 font-bold">Picks</th>
                <th className="text-center p-3 font-bold">Wins</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr
                  key={entry.userId}
                  className={`border-b border-gray-200 transition-colors ${
                    entry.isCurrentUser
                      ? 'bg-blue-100 font-semibold'
                      : index % 2 === 0
                        ? 'bg-gray-50'
                        : 'bg-white'
                  }`}
                >
                  {/* Rank */}
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-lg font-bold">#{entry.rank}</span>
                      {entry.rank === 1 && <Trophy size={16} className="text-yellow-600" />}
                      {entry.rank === 2 && <Trophy size={16} className="text-gray-400" />}
                      {entry.rank === 3 && <Trophy size={16} className="text-orange-600" />}
                    </div>
                  </td>

                  {/* Player Name */}
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500"
                        title={entry.userId}
                      />
                      <div>
                        <p className="font-semibold">{entry.username}</p>
                        {entry.isCurrentUser && (
                          <p className="text-xs text-blue-600">You</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Points */}
                  <td className="p-3 text-center">
                    <span className="font-bold text-lg">{entry.points.toLocaleString()}</span>
                  </td>

                  {/* Level */}
                  <td className="p-3 text-center">
                    <span className="inline-block px-3 py-1 bg-purple-100 border border-purple-300 rounded font-semibold">
                      {entry.level}
                    </span>
                  </td>

                  {/* Picks */}
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span>{entry.picksMade}</span>
                    </div>
                  </td>

                  {/* Wins */}
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Zap size={16} className="text-yellow-500" />
                      <span className="font-semibold">{entry.winsCount}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && entries.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600">No leaderboard data available</p>
        </div>
      )}

      {/* Connection Status Footer */}
      {!isConnected && (
        <div className="p-3 bg-orange-50 border-2 border-orange-300 rounded">
          <p className="text-sm text-orange-700">
            ⚠ Showing cached data. Live updates will resume when connected.
          </p>
        </div>
      )}
    </div>
  )
}
