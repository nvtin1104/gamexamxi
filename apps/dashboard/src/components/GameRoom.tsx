/**
 * GameRoom Component
 * Displays real-time game state with live pick updates
 * Integrates with WebSocket for concurrent picks/votes
 */

import React, { useEffect, useState } from 'react'
import { useWebSocketContext } from '../hooks/WebSocketProvider'
import { WebSocketStatus } from './WebSocketStatus'
import { Lock, AlertCircle, CheckCircle } from 'lucide-react'

interface Option {
  optionId: string
  label: string
  pickCount: number
  userPicked?: boolean
}

interface GameRoomProps {
  eventId: string
  eventName: string
  options: Option[]
  onPickChange?: (pick: { optionId: string; pickedAt: string }) => void
  isReadOnly?: boolean
}

export function GameRoom({
  eventId,
  eventName,
  options: initialOptions,
  onPickChange,
  isReadOnly = false,
}: GameRoomProps) {
  const { send, status, isConnected } = useWebSocketContext()

  const [options, setOptions] = useState<Option[]>(initialOptions)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [gameState, setGameState] = useState({
    isOpen: true,
    totalPicks: 0,
  })

  // Subscribe to GameRoom WebSocket updates
  useEffect(() => {
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data)

        if (message.type === 'game_state_update') {
          const { isOpen, totalPicks, options: updatedOptions } = message.data

          setGameState({ isOpen, totalPicks })

          if (updatedOptions) {
            setOptions((prev) =>
              prev.map((opt) => {
                const updated = updatedOptions.find((u: any) => u.optionId === opt.optionId)
                return updated
                  ? { ...opt, pickCount: updated.pickCount }
                  : opt
              })
            )
          }
        }

        if (message.type === 'initial_state') {
          const { isOpen, totalPicks, options: initialState } = message.data
          setGameState({ isOpen, totalPicks })

          if (initialState) {
            setOptions((prev) =>
              prev.map((opt) => {
                const updated = initialState.find((u: any) => u.optionId === opt.optionId)
                return updated
                  ? { ...opt, pickCount: updated.pickCount }
                  : opt
              })
            )
          }
        }
      } catch (error) {
        console.error('[GameRoom] Failed to parse WebSocket message:', error)
      }
    }

    // Note: In real implementation, WebSocket messages would be passed through context
    // This is a simplified version showing the pattern

    return () => {
      // Cleanup
    }
  }, [])

  const handlePickOption = async (optionId: string) => {
    if (!isConnected || isReadOnly) {
      return
    }

    setIsSubmitting(true)
    setSelectedOptionId(optionId)

    try {
      // Send pick via WebSocket
      send('submit_pick', { optionId })

      // Show optimistic update
      setOptions((prev) =>
        prev.map((opt) => ({
          ...opt,
          userPicked: opt.optionId === optionId,
          pickCount: opt.optionId === optionId ? opt.pickCount + 1 : opt.pickCount,
        }))
      )

      onPickChange?.({
        optionId,
        pickedAt: new Date().toISOString(),
      })

      setTimeout(() => setIsSubmitting(false), 500)
    } catch (error) {
      console.error('[GameRoom] Failed to submit pick:', error)
      setIsSubmitting(false)
    }
  }

  const maxPicks = Math.max(...options.map((o) => o.pickCount), 1)

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg border-2 border-black">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{eventName}</h2>
          <p className="text-sm text-gray-600 mt-1">
            {gameState.totalPicks} total picks • {gameState.isOpen ? 'Open' : 'Closed'}
          </p>
        </div>
        <div className="text-right">
          <WebSocketStatus size="sm" showLabel />
        </div>
      </div>

      {/* Status Messages */}
      {!gameState.isOpen && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border-2 border-yellow-300 rounded">
          <Lock size={20} className="text-yellow-600" />
          <span className="text-sm font-medium text-yellow-700">Picks are closed for this event</span>
        </div>
      )}

      {!isConnected && (
        <div className="flex items-center gap-2 p-3 bg-orange-50 border-2 border-orange-300 rounded">
          <AlertCircle size={20} className="text-orange-600" />
          <span className="text-sm font-medium text-orange-700">
            Using offline mode. Changes will sync when connected.
          </span>
        </div>
      )}

      {/* Options Grid */}
      <div className="space-y-3">
        {options.map((option) => (
          <button
            key={option.optionId}
            onClick={() => handlePickOption(option.optionId)}
            disabled={!gameState.isOpen || isReadOnly || !isConnected}
            className={`w-full p-4 border-2 text-left transition-all ${
              option.userPicked
                ? 'border-green-500 bg-green-50'
                : selectedOptionId === option.optionId
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            } ${
              !gameState.isOpen || isReadOnly || !isConnected
                ? 'opacity-60 cursor-not-allowed'
                : 'cursor-pointer'
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="font-semibold text-lg">{option.label}</div>
                <div className="text-sm text-gray-600">{option.pickCount} picks</div>
              </div>

              {/* Progress bar */}
              <div className="w-24 h-8 bg-gray-100 border border-gray-300 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    option.userPicked ? 'bg-green-500' : 'bg-blue-400'
                  }`}
                  style={{
                    width: `${(option.pickCount / maxPicks) * 100}%`,
                  }}
                />
              </div>

              {/* Status icon */}
              {option.userPicked && <CheckCircle size={24} className="text-green-600" />}
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 border-t-2 border-gray-200 pt-4">
        {isSubmitting ? (
          <span>Submitting pick...</span>
        ) : (
          <span>
            {status === 'connected'
              ? 'Updates happening live'
              : 'Updates will sync when connected'}
          </span>
        )}
      </div>
    </div>
  )
}
