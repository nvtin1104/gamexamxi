# GameXamXi Codebase Scout Report
**Date**: 2026-02-25 | **Scope**: Complete codebase inventory for dashboard implementation

---

## 1. ROOT-LEVEL CONFIGURATION

### Key Files
- **package.json** (monorepo root)
  - pnpm workspaces, Node >=20, pnpm >=9
  - Scripts: build, dev, deploy, type-check, lint, db:generate, db:migrate
  - DevDeps: ESLint, TypeScript 5.7.3, Turbo 2.3.3

- **turbo.json**
  - UI: tui
  - Tasks: build, dev (nocache), deploy, test, type-check
  - Caching configured per task

- **pnpm-workspace.yaml**
  - Workspaces: apps/*, packages/*

---

## 2. APPS DIRECTORY

### 2.1 apps/web (Next.js 14 Frontend)

**Package.json - Dependencies**:
- @gamexamxi/shared (workspace)
- @tanstack/react-query ^5.66.9
- @tanstack/react-query-devtools ^5.66.9
- framer-motion ^11.18.2
- next ^14.2.30
- react ^18.3.1, react-dom ^18.3.1
- zustand ^5.0.3
- clsx ^2.1.1

**Pages/Routes**:
- src/app/layout.tsx - Root layout with Neo-Brutalism fonts
- src/app/(auth)/login/page.tsx - Email/password form
- src/app/(auth)/register/page.tsx - Registration
- src/app/(main)/page.tsx - Dashboard/Home with LIVE GAMES feed
- src/app/(main)/games/page.tsx - Games list
- src/app/(main)/leaderboard/page.tsx - Rankings
- src/app/(main)/shop/page.tsx - Shop items
- src/app/(main)/groups/page.tsx - User groups

**UI Components** (src/components/ui/):
- Button.tsx - Framer Motion, 6 variants, 5 sizes
- Input.tsx - Text input with label
- Card.tsx - Brutal bordered card
- Badge.tsx - Status badge

**Libraries**:
- src/lib/api.ts - Fetch-based API client with authApi, gamesApi, groupsApi, shopApi, usersApi
- src/lib/utils.ts - formatPoints(), timeUntil() helpers
- src/lib/realtime.ts - WebSocket handlers
- src/store/auth.ts - Zustand store, localStorage persistence

**Config Files**:
- next.config.js - output: standalone, R2 image patterns
- tailwind.config.ts - Neo-Brutalism design (primary #FF3B00, secondary #FFE500, accent #00FF88)

**Current State**: ✅ Auth, main pages, UI lib, API client | ❌ No dashboard

---

### 2.2 apps/worker (Cloudflare Workers Backend)

**Package.json - Dependencies**:
- @gamexamxi/shared (workspace)
- hono ^4.7.2
- @hono/zod-validator ^0.4.2
- drizzle-orm ^0.38.3
- jose ^5.10.0 (JWT, edge-native)
- @noble/hashes ^1.7.1 (scrypt, edge-native)

**Main Entry** (src/index.ts):
- Hono app with CORS (gamexamxi.pages.dev, localhost:3000, localhost:8787)
- fetch handler for HTTP routes
- queue handler for messages (points-queue, achievements-queue, notifications-queue)
- Durable Objects exported: GameRoom, GroupRoom, PointsLedger

**Routes** (src/routes/):
- auth.ts - register, login, logout, /me
- games.ts - CRUD events, predict, resolve, stats
- groups.ts - CRUD groups, members, quests
- users.ts - profiles, me, leaderboard, transactions
- shop.ts - list items, purchase
- quests.ts - quest endpoints

**Middleware** (src/middleware/):
- auth.ts - JWT verification via KV_SESSIONS
- ratelimit.ts - KV_RATELIMIT based rate limiting

**Durable Objects** (src/durable-objects/):
- GameRoom - /ws/game/:eventId
- GroupRoom - /ws/group/:groupId
- PointsLedger - transaction ledger

**Queue Handlers** (src/queue-handlers/):
- points.ts - PointsQueueMessage
- achievements.ts - AchievementQueueMessage
- notifications.ts - NotificationQueueMessage

**Libraries** (src/lib/):
- db.ts - Drizzle ORM
- kv.ts - Session, cache, leaderboard, ratelimit helpers
- auth.ts - JWT, hashPassword (scrypt), verifyPassword, sanitizeUser
- analytics.ts - Analytics Engine
- utils.ts - Helpers

**Configuration** (wrangler.json - JSON format):
- D1: gamexamxi-db (ID: 78f194c2-8672-4913-862e-24cd19a4de76)
- KV: KV_SESSIONS, KV_CACHE, KV_LEADERBOARD, KV_RATELIMIT
- R2: gamexamxi-public
- Queues: points-queue, achievements-queue, notifications-queue, points-dlq
- Durable Objects: GAME_ROOM, GROUP_ROOM, POINTS_LEDGER
- Analytics: gamexamxi_events dataset

**Current State**: ✅ Auth, games, groups, shop, users, WS, queues, middleware | ❌ No admin routes

---

## 3. PACKAGES DIRECTORY

### 3.1 packages/shared (Types)

**Types in src/types.ts**:
- Queue Messages: PointsQueueMessage, AchievementQueueMessage, NotificationQueueMessage
- API: ApiResponse<T>, PaginatedResponse<T>
- Entities: User, Group, GroupMember, GroupQuest, PredictionEvent, Prediction
- Domain: Achievement, ShopItem, UserItem, PointTransaction
- Enums: UserRole (OWNER/ADMIN/MEMBER), GroupStyle, EventStatus, EventType, BadgeRarity, QuestStatus
- WebSocket: WSMessageType, WSMessage<T>

### 3.2 packages/db (Schema & Migrations)

**Tables** (src/schema/):
- users.ts: users, pointTransactions, userAchievements, userItems
- games.ts: predictionEvents, predictions
- groups.ts: (inferred)
- shop.ts: (inferred)

**Migrations**: 0001_init_schema.sql in migrations/

---

## 4. DESIGN SYSTEM

**Colors**:
- primary: #FF3B00, secondary: #FFE500, accent: #00FF88
- bg: #F5F0E8, surface: #FFFFFF, dark: #0A0A0A, muted: #8A8A8A

**Fonts**:
- Display: Bebas Neue | Mono: Space Mono | Body: IBM Plex Mono

**Neo-Brutalism**:
- 3px borders, thick shadows (4px 4px 0px), no border-radius
- Framer Motion micro-interactions on buttons

---

## 5. AUTHENTICATION

**Flow**:
1. Register/Login → scrypt password hash (@noble/hashes)
2. JWT created with jose v5 (edge-compatible)
3. Token stored in KV_SESSIONS namespace
4. Client stores in Zustand (localStorage)
5. Protected routes verify JWT + KV session

**Implementation**:
- src/middleware/auth.ts checks Authorization: Bearer <token>
- src/lib/auth.ts: createJWT(), hashPassword(), verifyPassword()
- Zustand useAuthStore: setAuth(), updateUser(), clearAuth()

---

## 6. CURRENT FEATURES

### Implemented
- ✅ User registration/login (with login streak bonus)
- ✅ Profile management
- ✅ Prediction events (CRUD)
- ✅ Predictions (user guesses)
- ✅ Groups (CRUD + members + quests)
- ✅ Shop (items + purchases)
- ✅ Leaderboard (global rankings)
- ✅ WebSocket real-time (GameRoom, GroupRoom)
- ✅ Queue system (points, achievements, notifications)
- ✅ Points transactions

### Not Implemented
- ❌ Admin role/permissions
- ❌ Admin dashboard UI
- ❌ Event statistics dashboard
- ❌ User management admin tools
- ❌ Analytics views
- ❌ Content management (achievements, items)
- ❌ Notifications inbox
- ❌ Admin API routes

---

## 7. KEY FILE PATHS

**Frontend**:
- C:\project\gamexamxi\apps\web\src\app\ (pages)
- C:\project\gamexamxi\apps\web\src\components\ui\ (Button, Input, Card, Badge)
- C:\project\gamexamxi\apps\web\src\lib\api.ts (API client)
- C:\project\gamexamxi\apps\web\src\store\auth.ts (Zustand)

**Backend**:
- C:\project\gamexamxi\apps\worker\src\index.ts (main entry)
- C:\project\gamexamxi\apps\worker\src\routes\ (endpoints)
- C:\project\gamexamxi\apps\worker\src\middleware\ (auth, ratelimit)
- C:\project\gamexamxi\apps\worker\wrangler.json (config)

**Shared**:
- C:\project\gamexamxi\packages\shared\src\types.ts (all types)
- C:\project\gamexamxi\packages\db\src\schema\ (tables)

---

## 8. READY FOR DASHBOARD

**Next Steps**:
1. Create dashboard workspace (apps/dashboard) OR add admin routes to apps/web
2. Add admin role to User type in packages/shared
3. Create admin middleware in apps/worker
4. Build admin API routes (GET /api/admin/users, /events, /analytics, etc.)
5. Create dashboard UI pages matching Neo-Brutalism design
6. Integrate with existing API client system

**Already Available**:
- Auth system (JWT + KV)
- Database schema with relationships
- Hono.js routing framework
- Drizzle ORM for queries
- KV namespaces for caching
- D1 database for analytics
- Existing UI component library

---

**Report Generated**: 2026-02-25
**Scout Complete**: Ready for implementation
