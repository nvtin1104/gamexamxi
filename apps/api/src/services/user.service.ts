import { eq, like, and, or, asc, desc, count } from 'drizzle-orm'
import { getDb } from '../db'
import { users, userStats, userPoints, permissionGroups, userPermissions } from '../db/schemas'

export interface FindAllParams {
  page?: number
  pageSize?: number
  search?: string
  role?: 'admin' | 'mod' | 'user'
  status?: 'active' | 'banned' | 'block'
  sortBy?: 'name' | 'email' | 'createdAt' | 'level' | 'pointsBalance'
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedUsers {
  data: Omit<typeof users.$inferSelect, 'passwordHash'>[]
  total: number
  page: number
  pageSize: number
}

type UserRow = typeof users.$inferSelect

/** Strip passwordHash (and optionally lastLoginIp) before returning to client */
export function stripSensitive(
  user: UserRow,
  isAdmin = false
): Omit<UserRow, 'passwordHash'> {
  const { passwordHash: _ph, lastLoginIp, ...safe } = user
  if (isAdmin) {
    return { ...safe, lastLoginIp }
  }
  return { ...safe, lastLoginIp: null }
}

/** User service — business logic for user CRUD */
export class UserService {
  private db: ReturnType<typeof getDb>

  constructor(d1: D1Database) {
    this.db = getDb(d1)
  }

  /** List users with optional server-side pagination, filtering, and sorting */
  async findAll(params?: FindAllParams): Promise<PaginatedUsers> {
    const page = Math.max(1, params?.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, params?.pageSize ?? 20))
    const offset = (page - 1) * pageSize

    // Build where conditions
    const conditions = []
    if (params?.search) {
      const term = `%${params.search}%`
      conditions.push(or(like(users.name, term), like(users.email, term)))
    }
    if (params?.role) conditions.push(eq(users.role, params.role))
    if (params?.status) conditions.push(eq(users.status, params.status))

    const where = conditions.length > 0 ? and(...conditions) : undefined

    // Determine sort column
    const sortColMap = {
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
      level: users.level,
      pointsBalance: users.pointsBalance,
    } as const
    const sortCol = sortColMap[params?.sortBy ?? 'createdAt'] ?? users.createdAt
    const orderFn = params?.sortOrder === 'desc' ? desc : asc

    // Count total
    const countResult = await this.db
      .select({ count: count() })
      .from(users)
      .where(where)
      .get()
    const total = countResult?.count ?? 0

    // Fetch page
    const rows = await this.db
      .select()
      .from(users)
      .where(where)
      .orderBy(orderFn(sortCol))
      .limit(pageSize)
      .offset(offset)
      .all()

    return {
      data: rows as Omit<UserRow, 'passwordHash'>[],
      total,
      page,
      pageSize,
    }
  }

  /** Find a single user by ID */
  async findById(id: string): Promise<UserRow | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .get()
    return result
  }

  /** Find a user by email */
  async findByEmail(email: string): Promise<UserRow | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get()
    return result
  }

  /** Create a new user */
  async create(data: typeof users.$inferInsert): Promise<UserRow> {
    const result = await this.db.insert(users).values(data).returning().get()
    return result
  }

  /** Update a user by ID */
  async update(
    id: string,
    data: Partial<typeof users.$inferInsert>
  ): Promise<UserRow> {
    const result = await this.db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning()
      .get()
    return result
  }

  /** Delete a user by ID */
  async delete(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id)).run()
  }

  /** Get full user profile: user + stats + points + assigned permission groups */
  async findWithProfile(id: string) {
    const user = await this.db.select().from(users).where(eq(users.id, id)).get()
    if (!user) return null

    const stats = await this.db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, id))
      .get()

    const points = await this.db
      .select()
      .from(userPoints)
      .where(eq(userPoints.userId, id))
      .get()

    const groups = await this.db
      .select({
        id: permissionGroups.id,
        name: permissionGroups.name,
        permissions: permissionGroups.permissions,
        createdAt: permissionGroups.createdAt,
      })
      .from(userPermissions)
      .innerJoin(permissionGroups, eq(userPermissions.groupId, permissionGroups.id))
      .where(eq(userPermissions.userId, id))
      .all()

    return {
      ...user,
      stats: stats ?? null,
      points: points ?? null,
      groups: groups.map((g) => ({
        ...g,
        permissions: (() => { try { return JSON.parse(g.permissions) } catch { return [] } })(),
      })),
    }
  }
}
