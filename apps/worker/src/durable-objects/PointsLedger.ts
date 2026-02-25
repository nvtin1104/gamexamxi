import { DurableObject } from 'cloudflare:workers'

interface LedgerAction {
  action: 'ADD' | 'DEDUCT' | 'GET'
  userId: string
  amount?: number
  type?: string
  note?: string
}

// Atomic points operations — prevents race conditions when many
// requests update a user's points concurrently.
export class PointsLedger extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const { action, userId, amount, type, note } = await request.json<LedgerAction>()

    if (action === 'GET') {
      const points = (await this.ctx.storage.get<number>(`points:${userId}`)) ?? 0
      return Response.json({ ok: true, points })
    }

    if (action === 'ADD' || action === 'DEDUCT') {
      const key = `points:${userId}`
      const current = (await this.ctx.storage.get<number>(key)) ?? 0
      const delta = action === 'ADD' ? amount! : -(amount!)
      const next = Math.max(0, current + delta) // prevent negative

      // Check if DEDUCT would go below zero
      if (action === 'DEDUCT' && current < (amount ?? 0)) {
        return Response.json({ ok: false, error: 'Insufficient points', points: current }, { status: 402 })
      }

      await this.ctx.storage.put(key, next)

      // Log transaction in DO storage for audit
      const txKey = `tx:${userId}:${Date.now()}`
      await this.ctx.storage.put(txKey, {
        userId,
        amount: delta,
        type,
        note,
        at: new Date().toISOString(),
      })

      return Response.json({ ok: true, previousPoints: current, newPoints: next })
    }

    return new Response('Invalid action', { status: 400 })
  }
}
