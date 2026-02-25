import { SignJWT, jwtVerify } from 'jose'
import { scrypt } from '@noble/hashes/scrypt'
import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils'

// ─── JWT ──────────────────────────────────────────────────────

export async function createJWT(userId: string, secret: string): Promise<string> {
  const secretKey = new TextEncoder().encode(secret)
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secretKey)
}

export async function verifyJWT(token: string, secret: string): Promise<{ sub: string } | null> {
  try {
    const secretKey = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(token, secretKey)
    return payload as { sub: string }
  } catch {
    return null
  }
}

// ─── Password Hashing (edge-compatible with @noble/hashes scrypt) ─────────

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, dkLen: 32 }

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const saltHex = bytesToHex(salt)
  const hash = scrypt(password, salt, SCRYPT_PARAMS)
  return `${saltHex}:${bytesToHex(hash)}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [saltHex, hashHex] = stored.split(':')
    if (!saltHex || !hashHex) return false
    const salt = hexToBytes(saltHex)
    const hash = scrypt(password, salt, SCRYPT_PARAMS)
    return bytesToHex(hash) === hashHex
  } catch {
    return false
  }
}

// ─── Sanitize User ────────────────────────────────────────────

export function sanitizeUser(user: {
  id: string
  username: string
  email: string
  passwordHash: string | null
  avatarUrl: string | null
  bio: string | null
  points: number
  totalPointsEarned: number
  loginStreak: number
  lastLoginAt: string | null
  createdAt: string | null
}) {
  const { passwordHash: _, ...safe } = user
  return safe
}
