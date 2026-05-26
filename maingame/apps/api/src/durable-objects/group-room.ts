/**
 * GroupRoom Durable Object
 * Maintains group leaderboard, stats, and member activity (groupId as key)
 * Supports WebSocket for real-time leaderboard updates
 */

export interface GroupMemberStats {
  userId: string
  username: string
  points: number
  level: number
  rank: number
  picksMade: number
  winsCount: number
  joinedAt: string
}

export interface GroupRoomState {
  groupId: string
  groupName: string
  members: Map<string, GroupMemberStats>
  updatedAt: string
  websockets: WebSocket[]
}

const STORAGE_KEY = 'group_room'
const BROADCAST_INTERVAL = 30000 // 30 seconds

export class GroupRoom implements DurableObject {
  private state: DurableObjectState
  private env: any
  private data: GroupRoomState
  private broadcastTimer?: number

  constructor(state: DurableObjectState, env: any) {
    this.state = state
    this.env = env
  }

  async initialize() {
    const stored = await this.state.storage.get<GroupRoomState>(STORAGE_KEY)
    if (stored) {
      // Restore from storage
      this.data = stored
      this.data.websockets = [] // Websockets don't persist
    } else {
      // Initialize new group room
      this.data = {
        groupId: this.state.id.name,
        groupName: `Group ${this.state.id.name.slice(0, 8)}`,
        members: new Map(),
        updatedAt: new Date().toISOString(),
        websockets: [],
      }
      await this.persist()
    }

    // Start periodic leaderboard broadcast
    this.startBroadcastTimer()
  }

  /** Update member stats */
  async updateMemberStats(userId: string, stats: Partial<GroupMemberStats>): Promise<void> {
    if (!this.data) await this.initialize()

    const current = this.data.members.get(userId) || {
      userId,
      username: `User ${userId.slice(0, 8)}`,
      points: 0,
      level: 1,
      rank: 0,
      picksMade: 0,
      winsCount: 0,
      joinedAt: new Date().toISOString(),
    }

    const updated: GroupMemberStats = {
      ...current,
      ...stats,
      userId, // Prevent overwriting
    }

    this.data.members.set(userId, updated)
    this.data.updatedAt = new Date().toISOString()

    // Recalculate ranks
    await this.recalculateRanks()
    await this.persist()

    console.log(`[GroupRoom] Updated member ${userId} in group ${this.data.groupId}`)
  }

  /** Get leaderboard (sorted by points desc) */
  async getLeaderboard(limit = 100): Promise<GroupMemberStats[]> {
    if (!this.data) await this.initialize()

    const sorted = Array.from(this.data.members.values()).sort((a, b) => b.points - a.points)

    return sorted.slice(0, limit)
  }

  /** Get member rank and position */
  async getMemberRank(userId: string): Promise<{
    userId: string
    rank: number
    totalMembers: number
    percentile: number
  }> {
    if (!this.data) await this.initialize()

    const leaderboard = await this.getLeaderboard()
    const index = leaderboard.findIndex((m) => m.userId === userId)

    return {
      userId,
      rank: index + 1,
      totalMembers: this.data.members.size,
      percentile: index >= 0 ? ((this.data.members.size - index) / this.data.members.size) * 100 : 0,
    }
  }

  /** Recalculate ranks based on points */
  private async recalculateRanks(): Promise<void> {
    const sorted = Array.from(this.data.members.values()).sort((a, b) => b.points - a.points)

    sorted.forEach((member, index) => {
      member.rank = index + 1
    })
  }

  /** Broadcast leaderboard to all connected WebSocket clients */
  private async broadcastLeaderboard(): Promise<void> {
    const leaderboard = await this.getLeaderboard(50)
    const message = JSON.stringify({
      type: 'leaderboard_update',
      data: leaderboard,
      timestamp: new Date().toISOString(),
    })

    const dead: WebSocket[] = []

    for (const ws of this.data.websockets) {
      try {
        ws.send(message)
      } catch (error) {
        dead.push(ws)
        console.warn('[GroupRoom] Failed to send to WebSocket, marking for removal')
      }
    }

    // Remove dead WebSocket connections
    this.data.websockets = this.data.websockets.filter((ws) => !dead.includes(ws))
  }

  /** Start periodic broadcast timer */
  private startBroadcastTimer(): void {
    if (this.broadcastTimer) clearInterval(this.broadcastTimer)

    this.broadcastTimer = setInterval(async () => {
      await this.broadcastLeaderboard()
    }, BROADCAST_INTERVAL) as unknown as number
  }

  /** Persist state to durable storage */
  private async persist(): Promise<void> {
    // Convert Map to object for JSON serialization
    const storageData = {
      groupId: this.data.groupId,
      groupName: this.data.groupName,
      members: Object.fromEntries(this.data.members),
      updatedAt: this.data.updatedAt,
    }
    await this.state.storage.put(STORAGE_KEY, storageData)
  }

  /** Handle HTTP requests */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    try {
      if (!this.data) await this.initialize()

      // POST /update - Update member stats
      if (request.method === 'POST' && path === '/update') {
        const { userId, stats } = await request.json() as {
          userId: string
          stats: Partial<GroupMemberStats>
        }

        await this.updateMemberStats(userId, stats)
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // GET /leaderboard - Get top N members
      if (request.method === 'GET' && path === '/leaderboard') {
        const limit = Number(url.searchParams.get('limit') ?? '100')
        const leaderboard = await this.getLeaderboard(limit)
        return new Response(JSON.stringify({ data: leaderboard }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // GET /rank/:userId - Get user rank
      if (request.method === 'GET' && path.startsWith('/rank/')) {
        const userId = path.split('/').pop() || ''
        const rank = await this.getMemberRank(userId)
        return new Response(JSON.stringify({ data: rank }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // WebSocket upgrade for real-time leaderboard
      if (request.headers.get('Upgrade') === 'websocket') {
        const pair = new WebSocketPair()
        const client = pair[1]
        const server = pair[0]

        this.data.websockets.push(server)

        // Send initial leaderboard
        const leaderboard = await this.getLeaderboard(50)
        server.send(
          JSON.stringify({
            type: 'initial_leaderboard',
            data: leaderboard,
            timestamp: new Date().toISOString(),
          })
        )

        console.log(`[GroupRoom] WebSocket client connected. Total: ${this.data.websockets.length}`)

        return new Response(null, {
          status: 101,
          webSocket: client,
        })
      }

      return new Response('Not Found', { status: 404 })
    } catch (error) {
      console.error('[GroupRoom] Error:', error)
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }
}
