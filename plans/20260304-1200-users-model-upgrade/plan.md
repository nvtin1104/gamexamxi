# Plan: Users Model Upgrade

**Created:** 2026-03-04  
**Branch:** `feat/astro`  
**Status:** Pending

## Goal

Upgrade the Users feature end-to-end: server-side pagination/filtering/sorting, align shared types with DB schema, add missing UI fields, secure admin endpoints, and improve the user detail view.

## Phases

| # | Phase | File |
|---|-------|------|
| 1 | API — server-side pagination, filtering, sorting + security guards | `phase-01-api-pagination-filter.md` |
| 2 | Shared types — align `User` and `UpdateUserInput` with DB schema | `phase-02-shared-types.md` |
| 3 | Dashboard API client — paginated `users.list()` + query params | `phase-03-dashboard-api-client.md` |
| 4 | UI — server-side DataTable, responsive table, search/filter/sort wired to API | `phase-04-ui-table-responsive.md` |
| 5 | User detail — missing fields in `UserDetailCard`, `UserEditForm`, `UserDetailPage` | `phase-05-user-detail.md` |

## Principles

- **YAGNI** — only add what the requirements explicitly call for
- **KISS** — prefer simple, readable code over clever abstractions
- **DRY** — reuse existing `DataTable`, `request()`, Drizzle patterns; extend rather than rewrite
- **Security** — `DELETE` and `PATCH` on `/users/:id` must be admin-only; no role escalation without `requireRole('admin')`

## Key constraints

- Drizzle ORM on Cloudflare D1 (SQLite) — use `like`, `and`, `or`, `asc`, `desc`, `count` from `drizzle-orm`
- `DataTable` must remain backward-compatible (existing call-sites pass `data` only; server-side is opt-in via new props)
- `passwordHash` must NEVER be exposed in any API response
- `lastLoginIp` is sensitive — only expose to `admin` role
- No new packages unless absolutely necessary

## Dependencies between phases

```
Phase 1 (API)
  └─► Phase 2 (shared types) ─► Phase 3 (API client) ─► Phase 4 (UI table)
                                                      └─► Phase 5 (user detail)
```

Phases 2–5 can only start after Phase 1 is merged (shared type changes will break the build otherwise).
