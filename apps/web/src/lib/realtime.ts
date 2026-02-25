'use client'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8787'

// ─── Game WebSocket ────────────────────────────────────────────

type GameEventHandler = {
  onGameState?: (data: unknown) => void
  onPredictionUpdate?: (data: { count: number; distribution: Record<string, number> }) => void
  onGameResolved?: (data: {
    correctAnswer: unknown
    finalDistribution: Record<string, number>
    totalParticipants: number
  }) => void
  onDisconnect?: () => void
}

export function connectToGame(eventId: string, userId: string, handlers: GameEventHandler) {
  const url = `${WS_URL}/ws/game/${eventId}?userId=${encodeURIComponent(userId)}`
  const ws = new WebSocket(url)

  ws.onmessage = (event) => {
    try {
      const { type, data } = JSON.parse(event.data)
      switch (type) {
        case 'GAME_STATE':
          handlers.onGameState?.(data)
          break
        case 'PREDICTION_UPDATE':
          handlers.onPredictionUpdate?.(data)
          break
        case 'GAME_RESOLVED':
          handlers.onGameResolved?.(data)
          break
      }
    } catch {
      // ignore malformed messages
    }
  }

  ws.onclose = () => handlers.onDisconnect?.()

  // Keepalive ping
  const ping = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'PING' }))
    }
  }, 30000)

  return {
    disconnect: () => {
      clearInterval(ping)
      ws.close()
    },
    send: (type: string, data?: unknown) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, data }))
      }
    },
    get readyState() {
      return ws.readyState
    },
  }
}

// ─── Group WebSocket ───────────────────────────────────────────

type GroupEventHandler = {
  onGroupActivity?: (data: unknown) => void
  onMemberJoined?: (data: unknown) => void
  onDisconnect?: () => void
}

export function connectToGroup(groupId: string, userId: string, handlers: GroupEventHandler) {
  const url = `${WS_URL}/ws/group/${groupId}?userId=${encodeURIComponent(userId)}`
  const ws = new WebSocket(url)

  ws.onmessage = (event) => {
    try {
      const { type, data } = JSON.parse(event.data)
      switch (type) {
        case 'GROUP_ACTIVITY':
          handlers.onGroupActivity?.(data)
          break
        case 'MEMBER_JOINED':
          handlers.onMemberJoined?.(data)
          break
      }
    } catch {}
  }

  ws.onclose = () => handlers.onDisconnect?.()

  const ping = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'PING' }))
    }
  }, 30000)

  return {
    disconnect: () => {
      clearInterval(ping)
      ws.close()
    },
    broadcastActivity: (type: string, data: unknown) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ACTIVITY', data: { type, ...(data as Record<string, unknown>) } }))
      }
    },
  }
}
