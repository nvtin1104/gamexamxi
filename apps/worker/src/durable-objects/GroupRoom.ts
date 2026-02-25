import { DurableObject } from 'cloudflare:workers'

interface GroupActivity {
  type: string
  userId: string
  data: unknown
  timestamp: string
}

export class GroupRoom extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request)
    }

    if (url.pathname === '/broadcast') {
      const activity = await request.json<GroupActivity>()
      this.broadcast({ type: 'GROUP_ACTIVITY', data: activity })
      return Response.json({ ok: true })
    }

    return new Response('Not found', { status: 404 })
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId') ?? 'anonymous'

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    this.ctx.acceptWebSocket(server, [userId])

    server.send(JSON.stringify({ type: 'CONNECTED', data: { userId } }))

    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== 'string') return
    try {
      const { type, data } = JSON.parse(message)
      if (type === 'PING') ws.send(JSON.stringify({ type: 'PONG' }))
      if (type === 'ACTIVITY') {
        // Broadcast activity to all group members
        // Tags were set via ctx.acceptWebSocket(server, [userId])
        const wsWithTags = ws as WebSocket & { getTags?: () => string[] }
        const tags = wsWithTags.getTags?.() ?? []
        this.broadcast({ type: 'GROUP_ACTIVITY', data: { ...data, from: tags[0] } })
      }
    } catch {
      // ignore
    }
  }

  async webSocketClose(_ws: WebSocket) {}

  private broadcast(message: object) {
    const text = JSON.stringify(message)
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(text)
      } catch {}
    }
  }
}
