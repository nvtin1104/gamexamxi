# Project Guidelines — Gamexamxi

## Architecture

Monorepo (pnpm workspaces + Turborepo) with three packages:

| Package | Stack | Location |
|---------|-------|----------|
| `@gamexamxi/api` | Hono on Cloudflare Workers, D1 (SQLite) via Drizzle ORM | `apps/api/` |
| `dashboard` | React 19 SPA, Vite 7, Tailwind v4, shadcn/ui | `apps/dashboard/` |
| `@gamexamxi/shared` | Pure TypeScript types (no runtime code) | `packages/shared/` |

Cloudflare bindings: `DB` (D1), `CACHE` (KV), `SESSIONS` (KV), `STORAGE` (R2), `JOB_QUEUE` (Queue).

## Build and Test

```bash
pnpm dev              # All apps in parallel (Turbo)
pnpm dev:api          # API only on :8787
pnpm dev:dashboard    # Dashboard only
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm db:generate      # Drizzle migration generation
pnpm db:migrate       # Apply migrations to local D1
pnpm db:migrate:prod  # Apply migrations to remote D1
```

Dashboard deploys to Cloudflare Pages (`wrangler pages deploy dist/`). API deploys via `wrangler deploy`.

## Code Style

- **Language:** TypeScript strict mode (`noUncheckedIndexedAccess`, `noUnusedLocals`)
- **Target:** ES2022, ESNext modules, `bundler` module resolution
- **UI language:** Vietnamese — all user-facing text (labels, errors, messages) must be in Vietnamese
- **Path alias:** `@/` → `./src/` in the dashboard app

## Project Conventions

### API (`apps/api/`)

- **Routes:** Each file in `src/routes/` exports a `Hono` sub-app, mounted under `/api/v1/`. Use `zValidator('json', schema)` or `zValidator('query', schema)` for validation. See [`routes/users.ts`](apps/api/src/routes/users.ts).
- **Services:** Class-based, constructor takes `D1Database`, instantiates Drizzle via `getDb()`. Methods: `findAll()`, `findById()`, `create()`, `update()`, `delete()`. See [`services/user.service.ts`](apps/api/src/services/user.service.ts).
- **Schemas:** `sqliteTable()` with CUID2 `$defaultFn` for IDs, `integer({ mode: 'timestamp' })` for dates, string-literal enums. See [`db/schemas/users.ts`](apps/api/src/db/schemas/users.ts).
- **Responses:** Success: `{ data: T }` or `{ data: T[], total, page, pageSize }`. Error: `{ error: string }`.
- **IDs:** CUID2 everywhere (collision-resistant, URL-safe).

### Dashboard (`apps/dashboard/`)

- **Components:** shadcn/ui (Radix + CVA + tailwind-merge). Add via `npx shadcn@latest add <component>`.
- **Tables:** `@tanstack/react-table` with server-side pagination/sort/filter pattern.
- **Entry flow:** `main.tsx` → `App.tsx` → `page.tsx` (no client router yet).
- **Charts:** Recharts. **Icons:** Lucide React. **Toasts:** Sonner.
- **Layout width:** Never add `max-w-*` classes to page containers or layout wrappers. Content must use full available width. Exception: shadcn/ui internal components (Dialog, AlertDialog, Tooltip, etc.) may keep their built-in `max-w` defaults.

### Shared (`packages/shared/`)

Types only — `User`, `UserProfile`, `ApiResponse<T>`, `PaginatedResponse<T>`, `AuthTokens`, `PermissionGroup`, etc. Import as `@gamexamxi/shared`.

## Security

- **Auth:** JWT HS256 via `hono/jwt`. Access tokens: 1h. Refresh tokens: 7d (stored in KV).
- **Passwords:** PBKDF2 SHA-256, 100k iterations, 16-byte random salt (Web Crypto API).
- **Middleware chain:** `authMiddleware` → `requireRole()` → `requirePermission()`. Admin bypasses permission checks.
- **Sensitive fields:** `stripSensitive()` removes `passwordHash`; `lastLoginIp` only visible to admin.
- **CORS:** `ALLOWED_ORIGINS` env var. **Rate limiting:** middleware at `middleware/rate-limit.ts`.
- **JWT_SECRET:** `wrangler secret put` in production; dev fallback in `wrangler.toml`.
