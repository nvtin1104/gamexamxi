/**
 * Token Revocation Service
 * Manages revoked tokens in KV storage for logout + security
 */

import type { D1Database, KVNamespace } from '@cloudflare/workers-types'

export class TokenRevocationService {
  private kv: KVNamespace
  private db: D1Database

  constructor(kv: KVNamespace, db: D1Database) {
    this.kv = kv
    this.db = db
  }

  /**
   * Revoke a token (for logout)
   */
  async revokeToken(token: string, expiresAt: Date): Promise<void> {
    const kvKey = `revoked:token:${token}`
    const ttl = Math.ceil((expiresAt.getTime() - Date.now()) / 1000)

    if (ttl > 0) {
      // Store revocation in KV with TTL matching token expiry
      await this.kv.put(kvKey, JSON.stringify({ revokedAt: new Date().toISOString() }), {
        expirationTtl: Math.max(ttl, 60), // Min 60s TTL
      })

      console.log(`[TokenRevocation] Token revoked, TTL: ${ttl}s`)
    }
  }

  /**
   * Check if token is revoked
   */
  async isTokenRevoked(token: string): Promise<boolean> {
    const kvKey = `revoked:token:${token}`
    const stored = await this.kv.get(kvKey)
    return stored !== null
  }

  /**
   * Revoke all tokens for a user (security event)
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    const kvKey = `revoked:user:${userId}`

    // Store revocation timestamp
    await this.kv.put(
      kvKey,
      JSON.stringify({
        revokedAt: new Date().toISOString(),
        reason: 'user_logout',
      }),
      {
        expirationTtl: 86400 * 7, // 7 days
      }
    )

    console.log(`[TokenRevocation] All tokens revoked for user ${userId}`)
  }

  /**
   * Check if all tokens are revoked for a user
   */
  async areUserTokensRevoked(userId: string, tokenIssuedAt: number): Promise<boolean> {
    const kvKey = `revoked:user:${userId}`
    const stored = await this.kv.get(kvKey)

    if (!stored) {
      return false
    }

    try {
      const revocation = JSON.parse(stored)
      const revokedAt = new Date(revocation.revokedAt).getTime()

      // If token was issued before revocation, it's revoked
      return tokenIssuedAt < revokedAt
    } catch {
      return false
    }
  }

  /**
   * Create a session record (for audit trail)
   */
  async createSession(
    userId: string,
    tokenId: string,
    userAgent: string,
    ipAddress: string
  ): Promise<void> {
    const kvKey = `session:${tokenId}`

    await this.kv.put(
      kvKey,
      JSON.stringify({
        userId,
        tokenId,
        userAgent,
        ipAddress,
        createdAt: new Date().toISOString(),
      }),
      {
        expirationTtl: 86400 * 7, // 7 days
      }
    )
  }

  /**
   * End a session (logout)
   */
  async endSession(tokenId: string): Promise<void> {
    const kvKey = `session:${tokenId}`
    await this.kv.delete(kvKey)

    console.log(`[TokenRevocation] Session ${tokenId} ended`)
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<Array<{ tokenId: string; createdAt: string }>> {
    // Note: KV doesn't support querying by prefix efficiently
    // In production, use a separate data structure or D1 table
    // This is a simplified implementation

    // For now, return empty array (implement with D1 sessions table)
    return []
  }
}
