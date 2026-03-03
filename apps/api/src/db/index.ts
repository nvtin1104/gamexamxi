import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schemas'

/** Create a Drizzle ORM instance from a D1 binding */
export const getDb = (d1: D1Database) => drizzle(d1, { schema })

export type Database = ReturnType<typeof getDb>
