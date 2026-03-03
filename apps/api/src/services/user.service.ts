import { eq } from 'drizzle-orm'
import { getDb } from '../db'
import { users, userStats, userPoints, permissionGroups, userPermissions } from '../db/schemas'

/** User service — business logic for user CRUD */
export class UserService {
  private db: ReturnType<typeof getDb>

  constructor(d1: D1Database) {
    this.db = getDb(d1)
  }

  /** List all users */
  async findAll(): Promise<typeof users.$inferSelect[]> {
    return this.db.select().from(users).all()
  }

  /** Find a single user by ID */
  async findById(id: string): Promise<typeof users.$inferSelect | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .get()
    return result
  }

  /** Find a user by email */
  async findByEmail(
    email: string
  ): Promise<typeof users.$inferSelect | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get()
    return result
  }

  /** Create a new user */
  async create(
    data: typeof users.$inferInsert
  ): Promise<typeof users.$inferSelect> {
    const result = await this.db.insert(users).values(data).returning().get()
    return result
  }

  /** Update a user by ID */
  async update(
    id: string,
    data: Partial<typeof users.$inferInsert>
  ): Promise<typeof users.$inferSelect> {
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
