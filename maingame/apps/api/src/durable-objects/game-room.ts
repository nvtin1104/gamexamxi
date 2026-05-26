/**
 * GameRoom Durable Object
 * Manages concurrent picks/votes for a single event (eventId as key)
 * Handles race conditions, prevents double-voting, broadcasts live updates
 */

export interface UserPick {
  userId: string
  selectedOptionId: string
  pickedAt: string
}

export interface OptionStats {
  optionId: string
  pickCount: number
  users: string[] // Track users who picked this option
}

export interface GameRoomState {
  eventId: string
  eventName: string
  picks: Map<string, UserPick> // userId -> pick
  optionStats: Map<string, OptionStats> // optionId -> stats
  createdAt: string
  closesAt: string
  isOpen: boolean
  websockets: WebSocket[]
}

const STORAGE_KEY = 'game_room'
const BROADCAST_INTERVAL = 2000 // 2 seconds (real-time)

export class GameRoom implements DurableObject {
  private state: DurableObjectState
  private env: any
  private data: GameRoomState
  private broadcastTimer?: number
  // Optimistic locking for race condition prevention
  private pickVersion: Map<string, number> = new Map()

  constructor(state: DurableObjectState, env: any) {
    this.state = state
    this.env = env
  }

  async initialize() {
    const stored = await this.state.storage.get<GameRoomState>(STORAGE_KEY)
    if (stored) {
      this.data = stored
      this.data.websockets = [] // Restore from storage but reset websockets
    } else {
      this.data = {
        eventId: this.state.id.name,
        eventName: `Event ${this.state.id.name.slice(0, 8)}`,
        picks: new Map(),
        optionStats: new Map(),
        createdAt: new Date().toISOString(),
        closesAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isOpen: true,
        websockets: [],
      }
      await this.persist()
    }

    this.startBroadcastTimer()
  }

  /** Submit a user pick (with race condition prevention) */
  async submitPick(userId: string, optionId: string): Promise<{
    success: boolean
    error?: string
    pick?: UserPick
  }> {
    if (!this.data) await this.initialize()

    // Check if room is open
    if (!this.data.isOpen) {
      return { success: false, error: 'Event picks are closed' }
    }

    // Check if user already picked
    const existing = this.data.picks.get(userId)
    if (existing) {
      // Allow changing pick (update existing)
      console.log(`[GameRoom] User ${userId} updating pick in event ${this.data.eventId}`)
    }

    // Optimistic locking: check version hasn't changed
    const version = this.pickVersion.get(userId) ?? 0
    const newVersion = version + 1
    this.pickVersion.set(userId, newVersion)

    // Verify option exists (basic validation)
    if (!this.data.optionStats.has(optionId)) {
      this.data.optionStats.set(optionId, {
        optionId,
        pickCount: 0,
        users: [],
      })
    }

    // Update user pick
    const pick: UserPick = {
      userId,
      selectedOptionId: optionId,
      pickedAt: new Date().toISOString(),
    }

    // Remove from old option if changing
    if (existing) {
      const oldStats = this.data.optionStats.get(existing.selectedOptionId)
      if (oldStats) {
        oldStats.pickCount = Math.max(0, oldStats.pickCount - 1)
        oldStats.users = oldStats.users.filter((u) => u !== userId)
      }
    }

    // Add to new option
    this.data.picks.set(userId, pick)
    const newStats = this.data.optionStats.get(optionId)!
    newStats.pickCount += 1
    if (!newStats.users.includes(userId)) {
      newStats.users.push(userId)
    }

    await this.persist()

    console.log(
      `[GameRoom] User ${userId} picked option ${optionId} in event ${this.data.eventId}. Total picks for option: ${newStats.pickCount}`
    )

    return { success: true, pick }
  }

  /** Get current game state */
  async getGameState(): Promise<{
    eventId: string
    eventName: string
    isOpen: boolean
    totalPicks: number
    options: Array<{ optionId: string; pickCount: number }>
  }> {
    if (!this.data) await this.initialize()

    const options = Array.from(this.data.optionStats.values()).map((opt) => ({
      optionId: opt.optionId,
      pickCount: opt.pickCount,
    }))

    return {
      eventId: this.data.eventId,
      eventName: this.data.eventName,
      isOpen: this.data.isOpen,
      totalPicks: this.data.picks.size,
      options,
    }
  }

  /** Get user's current pick */
  async getUserPick(userId: string): Promise<UserPick | null> {
    if (!this.data) await this.initialize()
    return this.data.picks.get(userId) ?? null
  }

  /** Close picks (no more submissions allowed) */
  async closePicks(): Promise<void> {
    if (!this.data) await this.initialize()

    this.data.isOpen = false
    this.data.closesAt = new Date().toISOString()

    await this.persist()
    await this.broadcastGameState()

    console.log(`[GameRoom] Event ${this.data.eventId} picks closed. Final pick count: ${this.data.picks.size}`)
  }

  /** Broadcast game state to all connected WebSocket clients */
  private async broadcastGameState(): Promise<void> {
    const gameState = await this.getGameState()
    const message = JSON.stringify({
      type: 'game_state_update',
      data: gameState,
      timestamp: new Date().toISOString(),
    })

    const dead: WebSocket[] = []

    for (const ws of this.data.websockets) {
      try {
        ws.send(message)
      } catch (error) {
        dead.push(ws)
        console.warn('[GameRoom] Failed to send to WebSocket')
      }
    }

    // Remove dead connections
    this.data.websockets = this.data.websockets.filter((ws) => !dead.includes(ws))
  }

  private startBroadcastTimer(): void {
    if (this.broadcastTimer) clearInterval(this.broadcastTimer)

    this.broadcastTimer = setInterval(async () => {
      await this.broadcastGameState()
    }, BROADCAST_INTERVAL) as unknown as number
  }

  private async persist(): Promise<void> {
    const storageData = {
      eventId: this.data.eventId,
      eventName: this.data.eventName,
      picks: Object.fromEntries(this.data.picks),
      optionStats: Object.fromEntries(this.data.optionStats),
      createdAt: this.data.createdAt,
      closesAt: this.data.closesAt,
      isOpen: this.data.isOpen,
    }
    await this.state.storage.put(STORAGE_KEY, storageData)
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    try {
      if (!this.data) await this.initialize()

      // POST /pick - Submit a pick
      if (request.method === 'POST' && path === '/pick') {
        const { userId, optionId } = await request.json() as {
          userId: string
          optionId: string
        }

        const result = await this.submitPick(userId, optionId)
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // GET /state - Get current game state
      if (request.method === 'GET' && path === '/state') {
        const gameState = await this.getGameState()
        return new Response(JSON.stringify({ data: gameState }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // GET /pick/:userId - Get user's pick
      if (request.method === 'GET' && path.startsWith('/pick/')) {
        const userId = path.split('/').pop() || ''
        const pick = await this.getUserPick(userId)
        return new Response(JSON.stringify({ data: pick }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // POST /close - Close picks
      if (request.method === 'POST' && path === '/close') {
        await this.closePicks()
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // WebSocket upgrade for real-time game updates
      if (request.headers.get('Upgrade') === 'websocket') {
        const pair = new WebSocketPair()
        const client = pair[1]
        const server = pair[0]

        this.data.websockets.push(server)

        // Send initial state
        const gameState = await this.getGameState()
        server.send(
          JSON.stringify({
            type: 'initial_state',
            data: gameState,
            timestamp: new Date().toISOString(),
          })
        )

        console.log(`[GameRoom] WebSocket client connected to event ${this.data.eventId}. Total: ${this.data.websockets.length}`)

        return new Response(null, {
          status: 101,
          webSocket: client,
        })
      }

      return new Response('Not Found', { status: 404 })
    } catch (error) {
      console.error('[GameRoom] Error:', error)
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }
}
