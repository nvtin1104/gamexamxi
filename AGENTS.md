# AGENTS.md — Gamexamxi Development Guide

## Overview

This is a monorepo using pnpm workspaces + Turborepo with three packages:
- `@gamexamxi/api` — Hono on Cloudflare Workers, D1 (SQLite) via Drizzle ORM
- `dashboard` — React 19 SPA, Vite 7, Tailwind v4, shadcn/ui, TanStack Router
- `@gamexamxi/shared` — Pure TypeScript types and Zod schemas

---

## Build / Lint / Test Commands

### Root Commands (run from project root)

```bash
pnpm dev              # All apps in parallel (Turbo)
pnpm dev:api          # API only on :8787
pnpm dev:dashboard    # Dashboard only on :5173
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm db:generate      # Drizzle migration generation
pnpm db:migrate       # Apply migrations to local D1
pnpm db:migrate:prod  # Apply migrations to remote D1
```

### API Commands (apps/api/)

```bash
pnpm dev              # wrangler dev on :8787
pnpm build            # wrangler deploy --dry-run
pnpm deploy           # wrangler deploy to Cloudflare
pnpm lint             # tsc --noEmit
pnpm db:generate      # drizzle-kit generate
pnpm db:migrate       # Apply local migrations
pnpm db:seed          # Seed local database
```

### Dashboard Commands (apps/dashboard/)

```bash
pnpm dev              # Vite dev server on :5173
pnpm build            # tsc -b && vite build
pnpm lint             # eslint .
pnpm preview          # vite preview
```

### Shared Package Commands (packages/shared/)

```bash
pnpm build            # tsc
pnpm lint             # tsc --noEmit
```

### Running a Single Test

**There are currently no test frameworks configured.** If tests are added:
- Vitest: `pnpm vitest run <file>` or `pnpm vitest <file> -w` for watch mode
- Jest: `pnpm jest <file>`

---

## Code Style Guidelines

### TypeScript Configuration

```json
{
  "target": "ES2022",
  "module": "ESNext",
  "moduleResolution": "bundler",
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```

### Import Conventions

- **Absolute imports** in dashboard: use `@/` alias → `./src/`
- **Relative imports** for local files
- **Group imports** by: external libs → internal packages → local utils/types
- **Named exports** preferred; default exports only when single export per file

```typescript
// Good
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware, requireRole } from '../middleware/auth'
import type { Bindings, Variables } from '../types'

// Bad
import Hono, { someFunc } from 'hono'
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files (components) | kebab-case | `user-form.tsx` |
| Files (utilities) | kebab-case | `api-client.ts` |
| Files (services) | kebab-case | `user.service.ts` |
| Files (routes) | kebab-case | `users.ts` |
| Types/Interfaces | PascalCase | `UserProfile` |
| Enums | PascalCase (members too) | `UserRole` |
| Functions | camelCase | `stripSensitive()` |
| Components | PascalCase | `UserForm` |
| Constants | SCREAMING_SNAKE | `MAX_PAGE_SIZE` |
| Database columns | snake_case | `created_at` |

### File Organization

```
apps/
├── api/
│   ├── src/
│   │   ├── routes/      # Hono sub-apps (one file per route)
│   │   ├── services/    # Class-based business logic
│   │   ├── db/schemas/  # Drizzle table definitions
│   │   ├── middleware/  # Auth, rate-limiting
│   │   ├── types/       # Bindings, variables
│   │   └── utils/       # Helper functions
│   └── wrangler.toml

packages/
└── shared/
    └── src/
        ├── types/       # Pure TypeScript interfaces
        ├── schemas/     # Zod schemas for validation
        └── constants/   # Permission constants
```

### UI/Component Guidelines

- **Vietnamese language** for all user-facing text (labels, errors, messages)
- **shadcn/ui components** — add via `npx shadcn@latest add <component>`
- **Layout**: Never add `max-w-*` classes to page containers or layout wrappers. Content must use full available width. Exception: shadcn/ui internal components (Dialog, AlertDialog, Tooltip, etc.) may keep built-in `max-w`.
- **Tailwind v4**: Use utility classes; avoid custom CSS unless necessary
- **Icons**: Lucide React
- **Toasts**: Sonner
- **Tables**: TanStack React Table with server-side pagination/sort/filter
- **Charts**: Recharts

### API Patterns

**Routes** (`apps/api/src/routes/`):
- Each file exports a Hono sub-app mounted under `/api/v1/`
- Use `zValidator('json', schema)` or `zValidator('query', schema)` for validation
- Response format: `{ data: T }` or `{ data: T[], total, page, pageSize }`
- Error format: `{ error: string }`

**Services**:
- Class-based with constructor taking `D1Database`
- Instantiate Drizzle via `getDb()`
- Methods: `findAll()`, `findById()`, `create()`, `update()`, `delete()`

**Database Schemas**:
- Use `sqliteTable()` with CUID2 `$defaultFn` for IDs
- Use `integer({ mode: 'timestamp' })` for dates
- Use string-literal enums for fixed sets

**IDs**: CUID2 everywhere (collision-resistant, URL-safe)

### Error Handling

- **API routes**: Use try/catch with `console.error()` and return `{ error: ' Vietnamese message' }` with appropriate status code
- **Frontend**: Display Vietnamese error messages to users via toast notifications
- **Never expose** internal error details to clients in production

### Security Guidelines

- **Auth**: JWT HS256 via `hono/jwt`. Access tokens: 1h. Refresh tokens: 7d (stored in KV)
- **Passwords**: PBKDF2 SHA-256, 100k iterations, 16-byte random salt (Web Crypto API)
- **Middleware chain**: `authMiddleware` → `requireRole()` → `requirePermission()`. Admin bypasses permission checks
- **Sensitive fields**: Use `stripSensitive()` to remove `passwordHash`; `lastLoginIp` only visible to admin
- **CORS**: Use `ALLOWED_ORIGINS` env var
- **Rate limiting**: Use middleware at `middleware/rate-limit.ts`
- **JWT_SECRET**: Store via `wrangler secret put` in production; dev fallback in `wrangler.toml`

### Cloudflare Bindings

Environment variables available in API:
- `DB` — D1 (SQLite)
- `CACHE` — KV
- `SESSIONS` — KV
- `STORAGE` — R2
- `JOB_QUEUE` — Queue

### Google OAuth (Login with Google)

**Setup Google Cloud Project:**
1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Choose **Web application**
6. Add authorized JavaScript origins:
   - `http://localhost:8787` (dev)
   - `https://your-domain.com` (prod)
7. Copy the **Client ID**

**Configure in Cloudflare:**
```bash
cd apps/api
wrangler secret put GOOGLE_CLIENT_ID
# Paste your Google OAuth Client ID when prompted
```

**API Endpoint:**
```
POST /api/v1/auth/google
Content-Type: application/json

{
  "idToken": "<Google ID token from client>"
}
```

**Response:**
```json
{
  "data": {
    "user": {
      "id": "...",
      "email": "user@gmail.com",
      "name": "Full Name",
      "accountRole": "user",
      "role": "user"
    },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

**Cookie Settings:**
- Access token: HttpOnly cookie, 1 hour expiry
- Refresh token: HttpOnly cookie, 7 days expiry

**Client Implementation:**
- Use Google Identity Services SDK (`google.accounts.id.initialize` + `requestIdToken`)
- Send `idToken` to `/api/v1/auth/google`
- For cross-origin requests, set `credentials: 'include'` in fetch options

---

## Existing Copilot Rules

This project has `.github/copilot-instructions.md` which contains additional guidance. Always follow those rules in addition to this AGENTS.md.

---

## Development Workflow

1. **Start development**: `pnpm dev` (runs all apps)
2. **Make changes** following the code style above
3. **Type check**: Run `pnpm lint` before committing
4. **Build**: Run `pnpm build` to verify compilation
5. **Database changes**: Run `pnpm db:generate` then `pnpm db:migrate`

---

## Dashboard Deployment

```bash
cd apps/dashboard
pnpm build
wrangler pages deploy dist/
```

## API Deployment

```bash
cd apps/api
pnpm deploy
```

## Client App (Astro)

### Google OAuth Configuration

Tạo file `.env` trong `apps/client/`:

```bash
# Google OAuth Client ID (public, không cần bí mật)
PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# API URL
PUBLIC_API_URL=http://localhost:8787
```

### Login Modal

Client sử dụng Google Identity Services SDK để hiển thị nút đăng nhập Google trong modal.

**Flow:**
1. User click "Đăng nhập" trong header
2. Modal hiện ra với Google Sign-In button + form email/password
3. Khi đăng nhập bằng Google:
   - Google trả về `idToken`
   - Client gửi `idToken` lên `/api/v1/auth/google`
   - API trả về user + tokens + set cookies
4. Tokens được lưu vào localStorage + cookies (HttpOnly)

### Running Client

```bash
cd apps/client
pnpm dev     # Astro dev server
pnpm build   # Build for production
```
