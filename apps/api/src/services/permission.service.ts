import { eq, and } from 'drizzle-orm'
import { getDb } from '../db'
import { users, permissionGroups, userToGroups } from '../db/schemas'

/** Permission service — resolves merged permissions from groups */
export class PermissionService {
  private db: ReturnType<typeof getDb>

  constructor(d1: D1Database) {
    this.db = getDb(d1)
  }

  // ── Query helpers ──────────────────────────────────

  /** Get all permission groups a user belongs to */
  async getUserGroups(userId: string) {
    const rows = await this.db
      .select({
        groupId: permissionGroups.id,
        groupName: permissionGroups.name,
        permissions: permissionGroups.permissions,
      })
      .from(userToGroups)
      .innerJoin(
        permissionGroups,
        eq(userToGroups.groupId, permissionGroups.id)
      )
      .where(eq(userToGroups.userId, userId))
      .all()

    return rows
  }

  /** Resolve all unique permissions for a user by merging all their groups */
  async getUserPermissions(userId: string): Promise<string[]> {
    const groups = await this.getUserGroups(userId)
    const merged = new Set<string>()

    for (const g of groups) {
      try {
        const perms: string[] = JSON.parse(g.permissions)
        for (const p of perms) merged.add(p)
      } catch {
        // skip malformed JSON
      }
    }

    return Array.from(merged)
  }

  /**
   * Check if a user has a specific permission.
   * Admins always have access.
   */
  async canAccess(
    userId: string,
    requiredPermission: string
  ): Promise<boolean> {
    // Look up the user's role first
    const user = await this.db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .get()

    if (!user) return false
    if (user.role === 'admin') return true

    const perms = await this.getUserPermissions(userId)
    return perms.includes(requiredPermission)
  }

  // ── Group CRUD ─────────────────────────────────────

  /** List all permission groups */
  async listGroups() {
    return this.db.select().from(permissionGroups).all()
  }

  /** Get a single group by ID */
  async getGroup(id: string) {
    return this.db
      .select()
      .from(permissionGroups)
      .where(eq(permissionGroups.id, id))
      .get()
  }

  /** Create a new permission group */
  async createGroup(name: string, permissions: string[]) {
    return this.db
      .insert(permissionGroups)
      .values({ name, permissions: JSON.stringify(permissions) })
      .returning()
      .get()
  }

  /** Update a group's permissions */
  async updateGroup(id: string, permissions: string[]) {
    return this.db
      .update(permissionGroups)
      .set({ permissions: JSON.stringify(permissions) })
      .where(eq(permissionGroups.id, id))
      .returning()
      .get()
  }

  /** Delete a permission group */
  async deleteGroup(id: string) {
    await this.db
      .delete(permissionGroups)
      .where(eq(permissionGroups.id, id))
      .run()
  }

  // ── User ↔ Group assignment ────────────────────────

  /** Assign a user to a permission group */
  async assignUserToGroup(userId: string, groupId: string) {
    await this.db
      .insert(userToGroups)
      .values({ userId, groupId })
      .onConflictDoNothing()
      .run()
  }

  /** Remove a user from a permission group */
  async removeUserFromGroup(userId: string, groupId: string) {
    await this.db
      .delete(userToGroups)
      .where(
        and(
          eq(userToGroups.userId, userId),
          eq(userToGroups.groupId, groupId)
        )
      )
      .run()
  }
}
