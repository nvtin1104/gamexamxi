# Phase 04 — UI: Server-side DataTable, Responsive Table, Search/Filter/Sort

## Files to change

| File | Change |
|------|--------|
| `apps/dashboard/src/components/ui/data-table.tsx` | Add server-side pagination mode (opt-in, backward-compatible) |
| `apps/dashboard/src/components/users/UserManagement.tsx` | Wire server-side params; debounce search; drive table state from URL or local state |
| `apps/dashboard/src/components/users/UserColumns.tsx` | Add missing columns; fix responsive widths |
| `apps/dashboard/src/components/users/UsersTable.tsx` | Mark as deprecated (add `@deprecated` JSDoc comment; do not delete yet) |

---

## 1. `data-table.tsx` — server-side mode

### New props (all optional — backward-compatible)

```ts
interface DataTableProps<TData> {
  // ... existing props unchanged ...

  // Server-side mode
  serverSide?: boolean          // if true, skip client-side filter/sort/paginate
  totalRows?: number            // total record count from server
  onParamsChange?: (params: {
    page: number
    pageSize: number
    search: string
    sortBy: string | undefined
    sortOrder: 'asc' | 'desc'
    filters: Record<string, string>
  }) => void
}
```

### Behavior when `serverSide={true}`

- Remove `getFilteredRowModel`, `getSortedRowModel`, `getPaginationRowModel` from `useReactTable` options
- Add `manualPagination: true`, `manualSorting: true`, `manualFiltering: true`
- Set `rowCount: totalRows` (TanStack Table v8.10+: used to compute `pageCount`)
- Pagination footer shows `totalRows` instead of `table.getFilteredRowModel().rows.length`
- Search input and filter selects call `onParamsChange` (debounced 300ms for search)
- Sorting header click calls `onParamsChange`

### Debounce utility (inline — no new package)

```ts
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
```

### Responsive table wrapper

Wrap `<div className="rounded-md border">` with:
```tsx
<div className="w-full overflow-x-auto rounded-md border">
```

This ensures the table scrolls horizontally on small viewports instead of breaking layout.

---

## 2. `UserManagement.tsx` — server-side wiring

### State

```ts
const [params, setParams] = React.useState<UsersListParams>({
  page: 1,
  pageSize: 20,
  sortOrder: 'asc',
})
const [result, setResult] = React.useState<{ data: User[]; total: number }>({
  data: [],
  total: 0,
})
const [isLoading, setIsLoading] = React.useState(false)
```

### Fetch effect

```ts
React.useEffect(() => {
  let cancelled = false
  setIsLoading(true)
  api.users.list(params)
    .then(res => { if (!cancelled) setResult({ data: res.data, total: res.total }) })
    .catch(err => toast.error(err.message))
    .finally(() => { if (!cancelled) setIsLoading(false) })
  return () => { cancelled = true }
}, [params])
```

### Pass to `DataTable`

```tsx
<DataTable
  columns={userColumns}
  data={result.data}
  serverSide
  totalRows={result.total}
  pageSize={params.pageSize}
  onParamsChange={(p) => setParams({
    page: p.page,
    pageSize: p.pageSize,
    search: p.search || undefined,
    sortBy: p.sortBy as UsersListParams['sortBy'],
    sortOrder: p.sortOrder,
    role: (p.filters.role as User['role']) || undefined,
    status: (p.filters.status as User['status']) || undefined,
  })}
  searchColumn="email"
  searchPlaceholder="Tìm theo tên hoặc email…"
  filters={[
    { columnId: 'role',   placeholder: 'Vai trò', options: [
      { label: 'Admin', value: 'admin' },
      { label: 'Mod',   value: 'mod'   },
      { label: 'User',  value: 'user'  },
    ]},
    { columnId: 'status', placeholder: 'Trạng thái', options: [
      { label: 'Hoạt động', value: 'active'  },
      { label: 'Bị block',  value: 'block'   },
      { label: 'Bị ban',    value: 'banned'  },
    ]},
  ]}
  isLoading={isLoading}
/>
```

---

## 3. `UserColumns.tsx` — column additions + widths

Add the following columns (after existing ones, before the Actions column):

| Column | Header | Cell | Width |
|--------|--------|------|-------|
| `emailVerifiedAt` | Email xác thực | Green checkmark if truthy, else red X | 120px |
| `pointsBalance` | Điểm | Number formatted | 90px |
| `banReason` | Lý do ban | Truncated text (max 30 chars), tooltip on hover | 140px |

Set explicit `size` on all columns to prevent layout thrash:

| Column | Size |
|--------|------|
| avatar+name | 200px |
| email | 220px |
| role | 90px |
| status | 100px |
| level | 70px |
| emailVerifiedAt | 120px |
| pointsBalance | 90px |
| banReason | 140px |
| createdAt | 110px |
| actions | 80px |

---

## Acceptance criteria

- [ ] `DataTable` used without `serverSide` prop still works exactly as before (client-side)
- [ ] With `serverSide={true}`, pagination controls call `onParamsChange` instead of slicing local data
- [ ] Search input is debounced (300ms) — no request on every keystroke
- [ ] Table scrolls horizontally on narrow viewports instead of breaking layout
- [ ] Changing page, search, role filter, status filter, or sort column triggers exactly one API request
- [ ] Loading skeleton shows while fetch is in-flight
- [ ] `UserManagement` no longer fetches all users on mount without pagination
