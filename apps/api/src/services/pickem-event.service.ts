import { createId } from '@paralleldrive/cuid2'
import { eq, like, and, asc, desc, count } from 'drizzle-orm'
import { getDb } from '../db'
import { pickemEvents, pickemEventOptions, itemEvents } from '../db/schemas'
import { sql } from 'drizzle-orm'

export interface FindAllPickemEventsParams {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: 'title' | 'eventDate' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedPickemEvents {
  data: typeof pickemEvents.$inferSelect[]
  total: number
  page: number
  pageSize: number
}

export interface CreatePickemEventData {
  title: string
  thumbnail: string
  description: string
  winPoints: number
  pickPoints: number
  winExp: number
  pickExp: number
  eventDate: string
  closePicksAt: string
  maxPickItems: number
}

export interface UpdatePickemEventData {
  title?: string
  thumbnail?: string
  description?: string
  winPoints?: number
  pickPoints?: number
  winExp?: number
  pickExp?: number
  eventDate?: string
  closePicksAt?: string
  maxPickItems?: number
}

export interface CreatePickemEventOptionData {
  eventItemId: string
  isWinningOption?: number
}

export interface UpdatePickemEventOptionData {
  isWinningOption?: number
}

export class PickemEventService {
  private db: ReturnType<typeof getDb>

  constructor(d1: D1Database) {
    this.db = getDb(d1)
  }

  async findAll(params?: FindAllPickemEventsParams): Promise<PaginatedPickemEvents> {
    const page = Math.max(1, params?.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, params?.pageSize ?? 20))
    const offset = (page - 1) * pageSize

    const conditions = []
    if (params?.search) {
      const term = `%${params.search}%`
      conditions.push(like(pickemEvents.title, term))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const sortColMap = {
      title: pickemEvents.title,
      eventDate: pickemEvents.eventDate,
      createdAt: pickemEvents.createdAt,
    } as const
    const sortCol = sortColMap[params?.sortBy ?? 'createdAt'] ?? pickemEvents.createdAt
    const orderFn = params?.sortOrder === 'desc' ? desc : asc

    const countResult = await this.db
      .select({ count: count() })
      .from(pickemEvents)
      .where(where)
      .get()
    const total = countResult?.count ?? 0

    const rows = await this.db
      .select({
        id: pickemEvents.id,
        title: pickemEvents.title,
        thumbnail: pickemEvents.thumbnail,
        description: pickemEvents.description,
        winPoints: pickemEvents.winPoints,
        pickPoints: pickemEvents.pickPoints,
        winExp: pickemEvents.winExp,
        pickExp: pickemEvents.pickExp,
        eventDate: pickemEvents.eventDate,
        closePicksAt: pickemEvents.closePicksAt,
        maxPickItems: pickemEvents.maxPickItems,
        createdBy: pickemEvents.createdBy,
        createdAt: pickemEvents.createdAt,
        updatedAt: pickemEvents.updatedAt,
      })
      .from(pickemEvents)
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
        id: pickemEvents.id,
        title: pickemEvents.title,
        thumbnail: pickemEvents.thumbnail,
        description: pickemEvents.description,
        winPoints: pickemEvents.winPoints,
        pickPoints: pickemEvents.pickPoints,
        winExp: pickemEvents.winExp,
        pickExp: pickemEvents.pickExp,
        eventDate: pickemEvents.eventDate,
        closePicksAt: pickemEvents.closePicksAt,
        maxPickItems: pickemEvents.maxPickItems,
        createdBy: pickemEvents.createdBy,
        createdAt: pickemEvents.createdAt,
        updatedAt: pickemEvents.updatedAt,
      })
      .from(pickemEvents)
      .where(eq(pickemEvents.id, id))
      .get()
    return result
  }

  async findByIdWithOptions(id: string) {
    const event = await this.findById(id)
    if (!event) return null

    const options = await this.db
      .select({
        id: pickemEventOptions.id,
        eventId: pickemEventOptions.eventId,
        eventItemId: pickemEventOptions.eventItemId,
        isWinningOption: pickemEventOptions.isWinningOption,
      })
      .from(pickemEventOptions)
      .where(eq(pickemEventOptions.eventId, id))
      .all()

    if (options.length === 0) {
      return { ...event, options: [] }
    }

    const itemIds = options.map(o => o.eventItemId)
    const items = await this.db
      .select({
        id: itemEvents.id,
        name: itemEvents.name,
        logo: itemEvents.logo,
      })
      .from(itemEvents)
      .where(sql`${itemEvents.id} IN ${itemIds}`)
      .all()

    const itemsMap = new Map(items.map(i => [i.id, i]))

    const optionsWithItems = options.map(o => ({
      ...o,
      itemName: itemsMap.get(o.eventItemId)?.name ?? '',
      itemLogo: itemsMap.get(o.eventItemId)?.logo ?? '',
    }))

    return {
      ...event,
      options: optionsWithItems,
    }
  }

  async create(data: CreatePickemEventData, createdBy: string) {
    const now = new Date().toISOString()
    const result = await this.db
      .insert(pickemEvents)
      .values({
        id: createId(),
        ...data,
        createdBy,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get()
    return result
  }

  async update(id: string, data: UpdatePickemEventData) {
    const now = new Date().toISOString()
    const result = await this.db
      .update(pickemEvents)
      .set({ ...data, updatedAt: now })
      .where(eq(pickemEvents.id, id))
      .returning()
      .get()
    return result
  }

  async delete(id: string) {
    await this.db.delete(pickemEvents).where(eq(pickemEvents.id, id)).run()
    return { success: true }
  }

  async addOption(eventId: string, data: CreatePickemEventOptionData) {
    const result = await this.db
      .insert(pickemEventOptions)
      .values({
        id: createId(),
        eventId,
        eventItemId: data.eventItemId,
        isWinningOption: data.isWinningOption ?? 0,
      })
      .returning()
      .get()
    return result
  }

  async updateOption(optionId: string, data: UpdatePickemEventOptionData) {
    const result = await this.db
      .update(pickemEventOptions)
      .set(data)
      .where(eq(pickemEventOptions.id, optionId))
      .returning()
      .get()
    return result
  }

  async deleteOption(optionId: string) {
    await this.db.delete(pickemEventOptions).where(eq(pickemEventOptions.id, optionId)).run()
    return { success: true }
  }

  async getOptionsByEventId(eventId: string) {
    const options = await this.db
      .select({
        id: pickemEventOptions.id,
        eventId: pickemEventOptions.eventId,
        eventItemId: pickemEventOptions.eventItemId,
        isWinningOption: pickemEventOptions.isWinningOption,
      })
      .from(pickemEventOptions)
      .where(eq(pickemEventOptions.eventId, eventId))
      .all()

    if (options.length === 0) return options

    const itemIds = options.map(o => o.eventItemId)
    const items = await this.db
      .select({
        id: itemEvents.id,
        name: itemEvents.name,
        logo: itemEvents.logo,
      })
      .from(itemEvents)
      .where(sql`${itemEvents.id} IN ${itemIds}`)
      .all()

    const itemsMap = new Map(items.map(i => [i.id, i]))

    return options.map(o => ({
      ...o,
      itemName: itemsMap.get(o.eventItemId)?.name ?? '',
      itemLogo: itemsMap.get(o.eventItemId)?.logo ?? '',
    }))
  }
}
