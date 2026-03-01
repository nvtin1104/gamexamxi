import { eq } from 'drizzle-orm'
import { getDb } from '../db'
import { users } from '../db/schema'

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
}
