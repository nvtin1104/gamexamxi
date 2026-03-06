# Phase 02 — Shared Types: Align `User` and `UpdateUserInput` with DB Schema

## Files to change

| File | Change |
|------|--------|
| `packages/shared/src/types/user.ts` | Add missing fields to `User`, expand `UpdateUserInput` |

---

## Current `User` — missing DB fields

The DB schema has these columns not present in the shared `User` type:

| DB column | Type | Notes |
|-----------|------|-------|
| `gg_id` | `string \| null` | Google OAuth ID — omit from public type (internal) |
| `birthdate` | `Date \| null` | Serialized as ISO string in JSON |
| `address` | `string \| null` | |
| `points_earned` | `number` | Total earned (never decreases) |
| `points_spent` | `number` | Total spent |
| `points_expired` | `number` | Total expired |
| `points_expiring` | `number` | Expiring soon |
| `block_expires_at` | `Date \| null` | Serialized as ISO string |
| `block_reason` | `string \| null` | |
| `ban_reason` | `string \| null` | |
| `last_login_ip` | `string \| null` | Admin-only — include as optional |
| `email_verified_at` | `Date \| null` | Serialized as ISO string |

Note: `ggId` is an internal OAuth linkage field — **do not expose** in the shared `User` type.  
`passwordHash` is **never** in the type (already absent — keep it that way).

---

## Updated `packages/shared/src/types/user.ts`

```ts
/** User roles available in the system */
export type UserRole = 'admin' | 'mod' | 'user'

/** User account status */
export type UserStatus = 'active' | 'banned' | 'block'

/** Core user entity */
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  status: UserStatus
  avatar?: string | null
  phone?: string | null
  address?: string | null
  birthdate?: string | null        // ISO date string (from timestamp)
  level: number
  experience: number
  pointsBalance: number
  pointsEarned: number
  pointsSpent: number
  pointsExpired: number
  pointsExpiring: number
  loginStreak?: number | null
  lastLoginAt?: string | null
  emailVerifiedAt?: string | null  // null = not verified
  blockExpiresAt?: string | null
  blockReason?: string | null
  banReason?: string | null
  lastLoginIp?: string | null      // only populated for admin callers
  createdAt: string
  updatedAt: string
}

/** Payload for creating a new user (admin action) */
export interface CreateUserInput {
  email: string
  name: string
  role?: UserRole
  password: string
}

/** Payload for updating an existing user */
export interface UpdateUserInput {
  email?: string
  name?: string
  role?: UserRole          // admin only
  status?: UserStatus      // admin only
  avatar?: string
  phone?: string
  address?: string
  birthdate?: string       // ISO date string
  banReason?: string       // admin only
  blockReason?: string     // admin only
  blockExpiresAt?: string  // admin only, ISO date string
}

/** Full user profile returned by GET /users/:id/profile */
export interface UserProfile extends User {
  stats: {
    userId: string
    currentXp: number
    currentLevel: number
  } | null
  points: {
    userId: string
    balance: number
    pointLimit: number
  } | null
  groups: Array<{
    id: string
    name: string
    permissions: string[]
    createdAt: string | null
  }>
}
```

---

## Notes

- All `Date` fields from Drizzle are serialized as ISO 8601 strings by `JSON.stringify` (Hono uses `c.json()` which calls `JSON.stringify`). The shared type uses `string | null` for consistency with what the client actually receives.
- `pointsEarned`, `pointsSpent`, `pointsExpired`, `pointsExpiring` are non-nullable in the DB (default 0), so they are non-optional in the type.
- `emailVerifiedAt: null` means unverified; any string means verified (the value is the ISO timestamp).

---

## Acceptance criteria

- [ ] `packages/shared` builds without errors (`pnpm --filter @gamexamxi/shared build`)
- [ ] No fields removed from existing `User` (only additions)
- [ ] `UpdateUserInput` includes `address`, `birthdate`, `banReason`, `blockReason`, `blockExpiresAt`
- [ ] `CreateUserInput` includes `password` field
