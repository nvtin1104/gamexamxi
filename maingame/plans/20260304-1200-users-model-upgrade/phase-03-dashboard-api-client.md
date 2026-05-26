# Phase 03 — Dashboard API Client: Paginated `users.list()` + Query Params

## Files to change

| File | Change |
|------|--------|
| `apps/dashboard/src/lib/api.ts` | Update `users.list()` to accept query params and return `PaginatedResponse<User>` |

---

## Current state

```ts
// Current — no params, returns { data: User[] }
list: () => request<ApiResponse<User[]>>('/api/v1/users'),
```

After Phase 1, the API returns:
```json
{ "data": [...], "total": 150, "page": 1, "pageSize": 20 }
```

This matches `PaginatedResponse<User>` from `packages/shared/src/types/api.ts`.

---

## Required changes to `apps/dashboard/src/lib/api.ts`

### 1. Add import for `PaginatedResponse`

```ts
import type {
  User, UserProfile, ApiResponse, AuthTokens,
  LoginInput, RegisterInput, CreateUserInput, UpdateUserInput,
  PermissionGroup,
  PaginatedResponse,  // add this
} from '@gamexamxi/shared'
```

### 2. Add `UsersListParams` type (local, no need to put in shared)

```ts
export interface UsersListParams {
  page?: number
  pageSize?: number
  search?: string
  role?: 'admin' | 'mod' | 'user'
  status?: 'active' | 'banned' | 'block'
  sortBy?: 'name' | 'email' | 'createdAt' | 'level' | 'pointsBalance'
  sortOrder?: 'asc' | 'desc'
}
```

### 3. Update `users.list()`

```ts
list: (params?: UsersListParams) => {
  const qs = params
    ? '?' + new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => [k, String(v)])
      ).toString()
    : ''
  return request<PaginatedResponse<User>>(`/api/v1/users${qs}`)
},
```

Note: `PaginatedResponse<T>` from shared is `{ data: T[], total: number, page: number, pageSize: number }` — the API now returns this shape directly (not wrapped in `ApiResponse`). Verify the shared type definition:

> If `PaginatedResponse` is already `{ data: T[], total, page, pageSize }` then it IS the top-level response. No extra `.data` unwrap needed.

---

## Acceptance criteria

- [ ] `api.users.list()` (no args) still compiles and works (params are optional)
- [ ] `api.users.list({ page: 2, search: 'alice', role: 'user' })` builds correct query string
- [ ] Return type is `PaginatedResponse<User>` (consumers get `.data`, `.total`, `.page`, `.pageSize`)
- [ ] No other call-sites in the dashboard are broken (search for `api.users.list` usages)
