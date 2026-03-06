import { eq, like, and, asc, desc, count, isNull } from 'drizzle-orm'
import { getDb } from '../db'
import { itemEvents } from '../db/schemas'
import { sql } from 'drizzle-orm'

export interface ItemEventType {
  type: 'player' | 'team' | 'tournament'
}

export interface LinkSocial {
  type: 'twitter' | 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'other'
  url: string
  handle: string
  isPublic: boolean
}

export interface FindAllItemEventsParams {
  page?: number
  pageSize?: number
  search?: string
  type?: ItemEventType['type']
  parentId?: string | null
  sortBy?: 'name' | 'createdAt' | 'level'
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedItemEvents {
  data: typeof itemEvents.$inferSelect[]
  total: number
  page: number
  pageSize: number
}

export interface CreateItemEventData {
  id: string
  name: string
  logo: string
  description: string
  linkSocial: LinkSocial
  level?: number
  parentId?: string | null
  type: ItemEventType['type']
}

export interface UpdateItemEventData {
  name?: string
  logo?: string
  description?: string
  linkSocial?: LinkSocial
  level?: number
  parentId?: string | null
}

export class ItemEventService {
  private db: ReturnType<typeof getDb>

  constructor(d1: D1Database) {
    this.db = getDb(d1)
  }

  async findAll(params?: FindAllItemEventsParams): Promise<PaginatedItemEvents> {
    const page = Math.max(1, params?.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, params?.pageSize ?? 20))
    const offset = (page - 1) * pageSize

    const conditions = []
    if (params?.search) {
      const term = `%${params.search}%`
      conditions.push(like(itemEvents.name, term))
    }
    if (params?.type) {
      conditions.push(eq(itemEvents.type, params.type))
    }
    if (params?.parentId === null) {
      conditions.push(isNull(itemEvents.parentId))
    } else if (params?.parentId !== undefined) {
      conditions.push(eq(itemEvents.parentId, params.parentId))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const sortColMap = {
      name: itemEvents.name,
      createdAt: itemEvents.createdAt,
      level: itemEvents.level,
    } as const
    const sortCol = sortColMap[params?.sortBy ?? 'createdAt'] ?? itemEvents.createdAt
    const orderFn = params?.sortOrder === 'desc' ? desc : asc

    const countResult = await this.db
      .select({ count: count() })
      .from(itemEvents)
      .where(where)
      .get()
    const total = countResult?.count ?? 0

    const rows = await this.db
      .select({
        id: itemEvents.id,
        name: itemEvents.name,
        logo: itemEvents.logo,
        description: itemEvents.description,
        linkSocial: itemEvents.linkSocial,
        level: itemEvents.level,
        parentId: itemEvents.parentId,
        type: itemEvents.type,
        createdBy: itemEvents.createdBy,
        createdAt: itemEvents.createdAt,
        updatedAt: itemEvents.updatedAt,
      })
      .from(itemEvents)
      .where(where)
      .orderBy(orderFn(sortCol))
      .limit(pageSize)
      .offset(offset)
      .all()

    return {
      data: rows,
      total,
      page,
      pageSize,
    }
  }

  async findById(id: string) {
    const result = await this.db
      .select({
        id: itemEvents.id,
        name: itemEvents.name,
        logo: itemEvents.logo,
        description: itemEvents.description,
        linkSocial: itemEvents.linkSocial,
        level: itemEvents.level,
        parentId: itemEvents.parentId,
        type: itemEvents.type,
        createdBy: itemEvents.createdBy,
        createdAt: itemEvents.createdAt,
        updatedAt: itemEvents.updatedAt,
      })
      .from(itemEvents)
      .where(eq(itemEvents.id, id))
      .get()
    return result
  }

  async findChildren(parentId: string) {
    return this.db
      .select({
        id: itemEvents.id,
        name: itemEvents.name,
        logo: itemEvents.logo,
        description: itemEvents.description,
        linkSocial: itemEvents.linkSocial,
        level: itemEvents.level,
        parentId: itemEvents.parentId,
        type: itemEvents.type,
        createdBy: itemEvents.createdBy,
        createdAt: itemEvents.createdAt,
        updatedAt: itemEvents.updatedAt,
      })
      .from(itemEvents)
      .where(eq(itemEvents.parentId, parentId))
      .all()
  }

  async create(data: CreateItemEventData, createdBy: string) {
    const now = new Date().toISOString()
    const result = await this.db
      .insert(itemEvents)
      .values({
        ...data,
        createdBy,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get()
    return result
  }

  async update(id: string, data: UpdateItemEventData) {
    const now = new Date().toISOString()
    const result = await this.db
      .update(itemEvents)
      .set({ ...data, updatedAt: now })
      .where(eq(itemEvents.id, id))
      .returning()
      .get()
    return result
  }

  async delete(id: string) {
    await this.db.delete(itemEvents).where(eq(itemEvents.id, id)).run()
    return { success: true }
  }

  async findByIds(ids: string[]) {
    if (ids.length === 0) return []
    return this.db
      .select({
        id: itemEvents.id,
        name: itemEvents.name,
        logo: itemEvents.logo,
        description: itemEvents.description,
        linkSocial: itemEvents.linkSocial,
        level: itemEvents.level,
        parentId: itemEvents.parentId,
        type: itemEvents.type,
        createdBy: itemEvents.createdBy,
        createdAt: itemEvents.createdAt,
        updatedAt: itemEvents.updatedAt,
      })
      .from(itemEvents)
      .where(sql`${itemEvents.id} IN ${ids}`)
      .all()
  }
}
