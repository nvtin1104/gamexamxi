# Phase 01 — API: Server-side Pagination, Filtering, Sorting + Security

## Files to change

| File | Change |
|------|--------|
| `apps/api/src/services/user.service.ts` | Add `findAll(params)` overload with filter/sort/paginate |
| `apps/api/src/routes/users.ts` | Parse query params, add `requireRole('admin')` guards, fix `passwordHash` on POST, expand `updateUserSchema` |

---

## 1. `user.service.ts` — `findAll(params?)`

### Signature

```ts
export interface FindAllParams {
  page?: number        // 1-indexed, default 1
  pageSize?: number    // default 20, max 100
  search?: string      // LIKE match on name OR email
  role?: 'admin' | 'mod' | 'user'
  status?: 'active' | 'banned' | 'block'
  sortBy?: 'name' | 'email' | 'createdAt' | 'level' | 'pointsBalance'
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedUsers {
  data: (typeof users.$inferSelect)[]
  total: number
  page: number
  pageSize: number
}

async findAll(params?: FindAllParams): Promise<PaginatedUsers>
```

### Implementation notes

- Import `count`, `like`, `and`, `or`, `asc`, `desc`, `ilike` from `drizzle-orm`
  - D1/SQLite: use `like` (case-insensitive by default for ASCII). Wrap with `%${search}%`.
- Build `where` clause:
  ```ts
  const conditions = []
  if (search) conditions.push(or(like(users.name, `%${search}%`), like(users.email, `%${search}%`)))
  if (role)   conditions.push(eq(users.role, role))
  if (status) conditions.push(eq(users.status, status))
  const where = conditions.length ? and(...conditions) : undefined
  ```
- Count query: `db.select({ count: count() }).from(users).where(where).get()`
- Data query with `limit` + `offset` + `orderBy`
- Map result to **omit `passwordHash` and `lastLoginIp`** before returning (unless caller is admin — but service doesn't know role; handle at route layer)
- Keep existing `findById`, `findByEmail`, `create`, `update`, `delete`, `findWithProfile` unchanged

### Sensitive field stripping

Add a helper in the service:

```ts
function stripSensitive(user: typeof users.$inferSelect, isAdmin = false) {
  const { passwordHash, lastLoginIp, ...safe } = user
  return isAdmin ? { ...safe, lastLoginIp } : safe
}
```

Route layer passes `isAdmin` based on `c.var.role === 'admin'`.

---

## 2. `routes/users.ts` — query param schema + guards

### Query param schema (Zod)

```ts
const listQuerySchema = z.object({
  page:      z.coerce.number().int().min(1).default(1),
  pageSize:  z.coerce.number().int().min(1).max(100).default(20),
  search:    z.string().max(100).optional(),
  role:      z.enum(['admin', 'mod', 'user']).optional(),
  status:    z.enum(['active', 'banned', 'block']).optional(),
  sortBy:    z.enum(['name', 'email', 'createdAt', 'level', 'pointsBalance']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})
```

### `GET /` handler

```ts
usersRoute.get('/', zValidator('query', listQuerySchema), async (c) => {
  const params = c.req.valid('query')
  const isAdmin = c.var.role === 'admin'
  const service = new UserService(c.env.DB)
  const result = await service.findAll(params)
  return c.json({
    data: result.data.map(u => stripSensitive(u, isAdmin)),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  })
})
```

### `POST /` — fix missing `passwordHash`

The current `createUserSchema` does not include `password` / `passwordHash`. This is a pre-existing bug (type error already surfaced in LSP). Fix by adding `password` field and hashing it:

```ts
import { hashPassword } from '../utils/password' // already used in auth routes

const createUserSchema = z.object({
  email:    z.string().email(),
  name:     z.string().min(2).max(100),
  role:     z.enum(['admin', 'mod', 'user']).default('user'),
  password: z.string().min(8),
})

// In handler:
const { password, ...rest } = body
const passwordHash = await hashPassword(password)
const user = await service.create({ ...rest, passwordHash })
```

### `PATCH /:id` — expanded schema + admin-only role change

```ts
const updateUserSchema = z.object({
  name:           z.string().min(2).max(100).optional(),
  email:          z.string().email().optional(),
  role:           z.enum(['admin', 'mod', 'user']).optional(),
  status:         z.enum(['active', 'banned', 'block']).optional(),
  avatar:         z.string().url().optional(),
  phone:          z.string().max(20).optional(),
  address:        z.string().max(255).optional(),
  birthdate:      z.coerce.date().optional(),
  banReason:      z.string().max(500).optional(),
  blockReason:    z.string().max(500).optional(),
  blockExpiresAt: z.coerce.date().optional(),
})
```

Guard: if body contains `role` or `status`, require admin:

```ts
usersRoute.patch('/:id', zValidator('json', updateUserSchema), async (c) => {
  const body = c.req.valid('json')
  if ((body.role !== undefined || body.status !== undefined) && c.var.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }
  // ...
})
```

### `DELETE /:id` — admin-only guard

```ts
usersRoute.delete('/:id', async (c) => {
  if (c.var.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  // ...
})
```

---

## Acceptance criteria

- [ ] `GET /api/v1/users?page=2&pageSize=10&search=alice&role=user&sortBy=createdAt&sortOrder=desc` returns correct slice with `total`, `page`, `pageSize`
- [ ] `passwordHash` never appears in any response
- [ ] `lastLoginIp` only appears for admin callers
- [ ] `DELETE /api/v1/users/:id` returns 403 for non-admin
- [ ] `PATCH /api/v1/users/:id` with `{ role: 'admin' }` returns 403 for non-admin
- [ ] `POST /api/v1/users` no longer throws TypeScript error about missing `passwordHash`
