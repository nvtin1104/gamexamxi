import { sign } from 'hono/jwt'

/** Auth service — JWT token generation & password hashing */
export class AuthService {
  private secret: string

  constructor(secret?: string) {
    // Use a development fallback secret when running locally without config
    this.secret = secret ?? 'dev_fallback_secret_change_me'
  }

  /** Hash a plain-text password using Web Crypto API (PBKDF2) */
  async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder()
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    )
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100_000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    )
    const hashArray = new Uint8Array(derivedBits)
    const saltHex = Array.from(salt)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    const hashHex = Array.from(hashArray)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    return `${saltHex}:${hashHex}`
  }

  /** Verify a password against a stored hash */
  async verifyPassword(password: string, stored: string): Promise<boolean> {
    const [saltHex, storedHashHex] = stored.split(':')
    if (!saltHex || !storedHashHex) return false

    const salt = new Uint8Array(
      saltHex.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
    )
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    )
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100_000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    )
    const hashHex = Array.from(new Uint8Array(derivedBits))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    return hashHex === storedHashHex
  }

  /** Generate a JWT access token */
  async generateAccessToken(
    userId: string,
    role: string,
    accountRole: string
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000)
    return sign(
      {
        sub: userId,
        role,
        accountRole,
        iat: now,
        exp: now + 60 * 60, // 1 hour
      },
      this.secret
    )
  }

  /** Generate a JWT refresh token (longer lived) */
  async generateRefreshToken(userId: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000)
    return sign(
      {
        sub: userId,
        type: 'refresh',
        iat: now,
        exp: now + 60 * 60 * 24 * 7, // 7 days
      },
      this.secret
    )
  }
}
