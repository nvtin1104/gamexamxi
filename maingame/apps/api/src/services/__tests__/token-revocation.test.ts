/**
 * Token Revocation Service Unit Tests
 * Tests token revocation logic for logout and security events
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TokenRevocationService } from '../token-revocation.service'

// Mock KV and D1
const mockKV = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}

const mockDB = {
  prepare: vi.fn(),
  batch: vi.fn(),
}

let service: TokenRevocationService

describe('TokenRevocationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    service = new TokenRevocationService(mockKV as any, mockDB as any)
  })

  describe('revokeToken', () => {
    it('should store revoked token with TTL', async () => {
      const token = 'test-token-123'
      const expiresAt = new Date(Date.now() + 3600000) // 1 hour from now

      await service.revokeToken(token, expiresAt)

      expect(mockKV.put).toHaveBeenCalledWith(
        expect.stringContaining('revoked:token:test-token-123'),
        expect.any(String),
        expect.objectContaining({
          expirationTtl: expect.any(Number),
        })
      )
    })

    it('should set minimum TTL of 60 seconds', async () => {
      const token = 'test-token-123'
      const expiresAt = new Date(Date.now() + 30000) // 30 seconds from now

      await service.revokeToken(token, expiresAt)

      const ttlArg = mockKV.put.mock.calls[0][2]
      expect(ttlArg.expirationTtl).toBeGreaterThanOrEqual(60)
    })

    it('should not store token if already expired', async () => {
      const token = 'test-token-123'
      const expiresAt = new Date(Date.now() - 1000) // Already expired

      await service.revokeToken(token, expiresAt)

      expect(mockKV.put).not.toHaveBeenCalled()
    })

    it('should calculate correct TTL from expiration date', async () => {
      const token = 'test-token-123'
      const expiresAt = new Date(Date.now() + 600000) // 10 minutes from now

      await service.revokeToken(token, expiresAt)

      const ttlArg = mockKV.put.mock.calls[0][2]
      // TTL should be approximately 600 seconds (allowing some variance)
      expect(ttlArg.expirationTtl).toBeGreaterThan(500)
      expect(ttlArg.expirationTtl).toBeLessThan(700)
    })
  })

  describe('isTokenRevoked', () => {
    it('should return true for revoked token', async () => {
      const token = 'revoked-token'
      mockKV.get.mockResolvedValue(JSON.stringify({ revokedAt: new Date().toISOString() }))

      const result = await service.isTokenRevoked(token)

      expect(result).toBe(true)
      expect(mockKV.get).toHaveBeenCalledWith(expect.stringContaining('revoked:token:revoked-token'))
    })

    it('should return false for non-revoked token', async () => {
      const token = 'valid-token'
      mockKV.get.mockResolvedValue(null)

      const result = await service.isTokenRevoked(token)

      expect(result).toBe(false)
    })
  })

  describe('revokeAllUserTokens', () => {
    it('should store user-level revocation with 7 day TTL', async () => {
      const userId = 'user-123'

      await service.revokeAllUserTokens(userId)

      expect(mockKV.put).toHaveBeenCalledWith(
        expect.stringContaining('revoked:user:user-123'),
        expect.stringContaining('revokedAt'),
        expect.objectContaining({
          expirationTtl: 86400 * 7, // 7 days
        })
      )
    })

    it('should include revocation reason', async () => {
      const userId = 'user-123'

      await service.revokeAllUserTokens(userId)

      const dataArg = mockKV.put.mock.calls[0][1]
      const data = JSON.parse(dataArg)
      expect(data.reason).toBe('user_logout')
    })
  })

  describe('areUserTokensRevoked', () => {
    it('should return true if token issued before revocation', async () => {
      const userId = 'user-123'
      const revokedAt = new Date()
      const tokenIssuedAt = Math.floor((revokedAt.getTime() - 1000) / 1000) // 1 second before revocation

      mockKV.get.mockResolvedValue(
        JSON.stringify({ revokedAt: revokedAt.toISOString() })
      )

      const result = await service.areUserTokensRevoked(userId, tokenIssuedAt * 1000)

      expect(result).toBe(true)
    })

    it('should return false if token issued after revocation', async () => {
      const userId = 'user-123'
      const revokedAt = new Date(Date.now() - 10000) // 10 seconds ago
      const tokenIssuedAt = Math.floor((revokedAt.getTime() + 5000) / 1000) // 5 seconds after revocation

      mockKV.get.mockResolvedValue(
        JSON.stringify({ revokedAt: revokedAt.toISOString() })
      )

      const result = await service.areUserTokensRevoked(userId, tokenIssuedAt * 1000)

      expect(result).toBe(false)
    })

    it('should return false if no revocation record exists', async () => {
      const userId = 'user-123'
      mockKV.get.mockResolvedValue(null)

      const result = await service.areUserTokensRevoked(userId, Date.now())

      expect(result).toBe(false)
    })

    it('should handle malformed JSON gracefully', async () => {
      const userId = 'user-123'
      mockKV.get.mockResolvedValue('invalid json')

      const result = await service.areUserTokensRevoked(userId, Date.now())

      expect(result).toBe(false)
    })

    it('should compare timestamp with millisecond precision', async () => {
      const userId = 'user-123'
      const revokedAt = new Date(1000000000000) // Some reference time
      const tokenIssuedAtMs = 1000000000000 - 1 // 1ms before revocation

      mockKV.get.mockResolvedValue(
        JSON.stringify({ revokedAt: revokedAt.toISOString() })
      )

      const result = await service.areUserTokensRevoked(userId, tokenIssuedAtMs)

      expect(result).toBe(true)
    })
  })

  describe('createSession', () => {
    it('should store session with user context', async () => {
      const userId = 'user-123'
      const tokenId = 'token-456'
      const userAgent = 'Mozilla/5.0...'
      const ipAddress = '192.168.1.1'

      await service.createSession(userId, tokenId, userAgent, ipAddress)

      expect(mockKV.put).toHaveBeenCalledWith(
        expect.stringContaining('session:token-456'),
        expect.stringContaining(userId),
        expect.any(Object)
      )

      const dataArg = mockKV.put.mock.calls[0][1]
      const data = JSON.parse(dataArg)
      expect(data.userId).toBe(userId)
      expect(data.userAgent).toBe(userAgent)
      expect(data.ipAddress).toBe(ipAddress)
    })

    it('should set 7 day TTL for session', async () => {
      await service.createSession('user-123', 'token-456', 'ua', 'ip')

      const ttlArg = mockKV.put.mock.calls[0][2]
      expect(ttlArg.expirationTtl).toBe(86400 * 7)
    })
  })

  describe('endSession', () => {
    it('should delete session by token ID', async () => {
      const tokenId = 'token-456'

      await service.endSession(tokenId)

      expect(mockKV.delete).toHaveBeenCalledWith(expect.stringContaining('session:token-456'))
    })
  })

  describe('getUserSessions', () => {
    it('should return empty array (not yet implemented)', async () => {
      const userId = 'user-123'

      const sessions = await service.getUserSessions(userId)

      expect(Array.isArray(sessions)).toBe(true)
      expect(sessions.length).toBe(0)
    })
  })
})
