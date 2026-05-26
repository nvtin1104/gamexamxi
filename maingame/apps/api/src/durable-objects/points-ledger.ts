/**
 * PointsLedger Durable Object
 * Maintains immutable transaction log per user (userId as key)
 * State is persisted to storage.put() and survives DO restarts
 */

export interface PointLedgerEntry {
  id: string
  type: 'credit' | 'debit' | 'adjustment'
  amount: number
  reason: string
  timestamp: string
  metadata?: Record<string, any>
}

export interface PointsLedgerState {
  userId: string
  transactions: PointLedgerEntry[]
  currentBalance: number
  lastUpdated: string
}

const STORAGE_KEY = 'points_ledger'

export class PointsLedger implements DurableObject {
  private state: DurableObjectState
  private env: any
  private data: PointsLedgerState

  constructor(state: DurableObjectState, env: any) {
    this.state = state
    this.env = env
  }

  async initialize() {
    // Load from persistent storage on startup
    const stored = await this.state.storage.get<PointsLedgerState>(STORAGE_KEY)
    if (stored) {
      this.data = stored
    } else {
      // Initialize new ledger
      this.data = {
        userId: this.state.id.name,
        transactions: [],
        currentBalance: 0,
        lastUpdated: new Date().toISOString(),
      }
      await this.persist()
    }
  }

  /** Record a transaction in the ledger */
  async recordTransaction(
    type: 'credit' | 'debit' | 'adjustment',
    amount: number,
    reason: string,
    metadata?: Record<string, any>
  ): Promise<PointLedgerEntry> {
    if (!this.data) await this.initialize()

    const entry: PointLedgerEntry = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type,
      amount,
      reason,
      timestamp: new Date().toISOString(),
      metadata,
    }

    // Update balance
    if (type === 'credit') {
      this.data.currentBalance += amount
    } else if (type === 'debit') {
      this.data.currentBalance -= amount
    } else if (type === 'adjustment') {
      this.data.currentBalance += amount // amount can be positive or negative
    }

    // Append transaction (immutable log)
    this.data.transactions.push(entry)
    this.data.lastUpdated = new Date().toISOString()

    await this.persist()

    console.log(
      `[PointsLedger] User ${this.data.userId}: recorded ${type} of ${amount}. New balance: ${this.data.currentBalance}`
    )

    return entry
  }

  /** Get current balance */
  async getBalance(): Promise<{ balance: number; lastUpdated: string }> {
    if (!this.data) await this.initialize()
    return {
      balance: this.data.currentBalance,
      lastUpdated: this.data.lastUpdated,
    }
  }

  /** Get transaction history (with pagination) */
  async getHistory(
    limit = 50,
    offset = 0
  ): Promise<{
    transactions: PointLedgerEntry[]
    total: number
    balance: number
  }> {
    if (!this.data) await this.initialize()

    const paginated = this.data.transactions.slice(offset, offset + limit).reverse() // Most recent first

    return {
      transactions: paginated,
      total: this.data.transactions.length,
      balance: this.data.currentBalance,
    }
  }

  /** Audit the ledger (verify integrity) */
  async audit(): Promise<{
    userId: string
    transactionCount: number
    currentBalance: number
    derivedBalance: number
    isValid: boolean
  }> {
    if (!this.data) await this.initialize()

    // Recalculate balance from transactions to verify integrity
    let derivedBalance = 0
    for (const tx of this.data.transactions) {
      if (tx.type === 'credit' || tx.type === 'adjustment') {
        derivedBalance += tx.amount
      } else if (tx.type === 'debit') {
        derivedBalance -= tx.amount
      }
    }

    const isValid = derivedBalance === this.data.currentBalance

    return {
      userId: this.data.userId,
      transactionCount: this.data.transactions.length,
      currentBalance: this.data.currentBalance,
      derivedBalance,
      isValid,
    }
  }

  /** Persist state to durable storage */
  private async persist(): Promise<void> {
    await this.state.storage.put(STORAGE_KEY, this.data)
  }

  /** Handle HTTP requests */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    try {
      if (!this.data) await this.initialize()

      // POST /record - Record transaction
      if (request.method === 'POST' && path === '/record') {
        const body = await request.json() as {
          type: 'credit' | 'debit' | 'adjustment'
          amount: number
          reason: string
          metadata?: Record<string, any>
        }

        const entry = await this.recordTransaction(
          body.type,
          body.amount,
          body.reason,
          body.metadata
        )
        return new Response(JSON.stringify({ data: entry }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // GET /balance - Get current balance
      if (request.method === 'GET' && path === '/balance') {
        const balance = await this.getBalance()
        return new Response(JSON.stringify({ data: balance }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // GET /history - Get transaction history
      if (request.method === 'GET' && path === '/history') {
        const limit = Number(url.searchParams.get('limit') ?? '50')
        const offset = Number(url.searchParams.get('offset') ?? '0')
        const history = await this.getHistory(limit, offset)
        return new Response(JSON.stringify({ data: history }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // GET /audit - Audit ledger integrity
      if (request.method === 'GET' && path === '/audit') {
        const audit = await this.audit()
        return new Response(JSON.stringify({ data: audit }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response('Not Found', { status: 404 })
    } catch (error) {
      console.error('[PointsLedger] Error:', error)
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }
}
