import { DurableObject } from 'cloudflare:workers'

interface GameState {
  eventId: string
  status: 'OPEN' | 'LOCKED' | 'RESOLVED'
  predictionsCount: number
  optionCounts: Record<string, number>
  participantIds: string[]
}

export class GameRoom extends DurableObject {
  private state: GameState | null = null

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request)
    }

    // HTTP actions (from main Worker)
    switch (url.pathname) {
      case '/init': {
        const body = await request.json<{ eventId: string }>()
        await this.initGame(body.eventId)
        return Response.json({ ok: true })
      }
      case '/predict': {
        const body = await request.json<{ userId: string; answer: string }>()
        return Response.json(await this.recordPrediction(body))
      }
      case '/resolve': {
        const body = await request.json<{ correctAnswer: unknown }>()
        await this.resolveGame(JSON.stringify(body.correctAnswer))
        return Response.json({ ok: true })
      }
      case '/stats': {
        return Response.json(this.state)
      }
      default:
        return new Response('Not found', { status: 404 })
    }
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId') ?? 'anonymous'

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    // Hibernation API — DO sleeps when no activity, wakes on WS message
    this.ctx.acceptWebSocket(server, [userId])

    // Load state if needed
    if (!this.state) {
      this.state = await this.ctx.storage.get<GameState>('state') ?? null
    }

    // Send current state immediately
    server.send(
      JSON.stringify({
        type: 'GAME_STATE',
        data: this.state,
      })
    )

    return new Response(null, { status: 101, webSocket: client })
  }

  // Called by runtime when a hibernated WS sends a message
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== 'string') return
    try {
      const { type } = JSON.parse(message)
      if (type === 'PING') ws.send(JSON.stringify({ type: 'PONG' }))
    } catch {
      // ignore malformed messages
    }
  }

  async webSocketClose(_ws: WebSocket, _code: number, _reason: string) {
    // No cleanup needed — hibernation handles it
  }

  private async initGame(eventId: string) {
    this.state = {
      eventId,
      status: 'OPEN',
      predictionsCount: 0,
      optionCounts: {},
      participantIds: [],
    }
    await this.ctx.storage.put('state', this.state)
  }

  private async recordPrediction({ userId, answer }: { userId: string; answer: string }) {
    if (!this.state) {
      this.state = await this.ctx.storage.get<GameState>('state') ?? null
    }
    if (!this.state || this.state.status !== 'OPEN') {
      return { ok: false, error: 'Game not accepting predictions' }
    }
    if (this.state.participantIds.includes(userId)) {
      return { ok: false, error: 'Already predicted' }
    }

    this.state.participantIds.push(userId)
    this.state.predictionsCount++
    this.state.optionCounts[answer] = (this.state.optionCounts[answer] ?? 0) + 1

    // Broadcast live update
    this.broadcast({
      type: 'PREDICTION_UPDATE',
      data: {
        count: this.state.predictionsCount,
        distribution: this.getDistribution(),
      },
    })

    await this.ctx.storage.put('state', this.state)
    return { ok: true, count: this.state.predictionsCount }
  }

  private async resolveGame(correctAnswer: string) {
    if (!this.state) {
      this.state = await this.ctx.storage.get<GameState>('state') ?? null
    }
    if (!this.state) return

    this.state.status = 'RESOLVED'
    await this.ctx.storage.put('state', this.state)

    this.broadcast({
      type: 'GAME_RESOLVED',
      data: {
        correctAnswer,
        finalDistribution: this.getDistribution(),
        totalParticipants: this.state.predictionsCount,
      },
    })
  }

  private getDistribution() {
    const total = this.state?.predictionsCount ?? 0
    if (total === 0) return {}
    return Object.fromEntries(
      Object.entries(this.state!.optionCounts).map(([k, v]) => [
        k,
        Math.round((v / total) * 100),
      ])
    )
  }

  private broadcast(message: object) {
    const text = JSON.stringify(message)
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(text)
      } catch {
        // ignore closed sockets
      }
    }
  }
}
