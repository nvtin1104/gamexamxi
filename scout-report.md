# Scout Report: GameXamXi Worker & Shared Files

Date: 2026-02-25
Scope: Apps/worker/src directory structure, middleware, index.ts, routes, and shared constants

---

## Directory Tree: apps/worker/src/

```
apps/worker/src/
├── index.ts
├── types.ts
├── durable-objects/
│   ├── GameRoom.ts
│   ├── GroupRoom.ts
│   └── PointsLedger.ts
├── lib/
│   ├── analytics.ts
│   ├── auth.ts
│   ├── db.ts
│   ├── kv.ts
│   └── utils.ts
├── middleware/
│   ├── adminAuth.ts
│   ├── auth.ts
│   └── ratelimit.ts
├── queue-handlers/
│   ├── achievements.ts
│   ├── notifications.ts
│   └── points.ts
└── routes/
    ├── admin.ts
    ├── auth.ts
    ├── games.ts
    ├── groups.ts
    ├── quests.ts
    ├── shop.ts
    └── users.ts
```

---

## Middleware Files Summary

### 1. auth.ts - JWT + Session Validation
- Reads token from Authorization header (Bearer) or X-Auth-Token header
- Verifies JWT signature using JWT_SECRET
- Checks session exists in KV_SESSIONS (enables logout)
- Sets userId in context for protected routes
- Returns 401 if missing/invalid token or expired session

### 2. ratelimit.ts - IP-Based Rate Limiting
- Login: 10 requests/60 seconds per IP
- Register: 5 requests/60 seconds per IP
- Default: 100 requests/60 seconds per IP
- Extracts IP from CF-Connecting-IP or X-Forwarded-For header
- Returns 429 if limit exceeded
- Skips if KV_RATELIMIT not configured

### 3. adminAuth.ts - Admin Email Whitelist
- Requires authenticated user (from auth middleware)
- Reads admin emails from ADMIN_EMAILS env var (comma-separated)
- If ADMIN_EMAILS empty/unset: allows all authenticated users (dev mode)
- If ADMIN_EMAILS set: enforces email whitelist, returns 403 if not admin
- Looks up user in database to check email

---

## apps/worker/src/index.ts - Full Content

Main Hono app entry point with:
- CORS config: gamexamxi.pages.dev, localhost:3000/3001/8788
- Global middleware: CORS, logger, rate limiting
- Public routes: /api/auth, /api/health
- Protected routes: /api/users, /api/games, /api/groups, /api/shop, /api/quests (require auth)
- Admin routes: /api/admin/* (require auth + admin check)
- WebSocket upgrades: /ws/game/:eventId, /ws/group/:groupId to Durable Objects
- Queue handlers: points-queue, achievements-queue, notifications-queue
- Durable Object exports: GameRoom, GroupRoom, PointsLedger

---

## Routes Directory - File Listing

| File | Purpose |
|------|---------|
| auth.ts | POST /register, POST /login with JWT + welcome points |
| admin.ts | Stats, user mgmt, event mgmt, group list, transaction history |
| games.ts | Prediction event CRUD operations |
| groups.ts | Group creation, membership, leaderboards |
| quests.ts | Daily quest definitions and completions |
| shop.ts | Item shop and purchase logic |
| users.ts | User profile, stats, achievements |

---

## apps/worker/src/routes/auth.ts - First 80 Lines

Registers users with:
- Username (3-20 chars, alphanumeric+underscore only)
- Email (valid email format)
- Password (minimum 8 chars)
- Validates no duplicate email/username
- Hashes password using scrypt
- Creates user in database
- Sends WELCOME_BONUS (100 points) to POINTS_QUEUE
- Creates JWT token
- Creates KV session
- Returns 201 with token + sanitized user

Login verifies:
- Email exists
- Password matches using scrypt verification
- Returns JWT token and user on success
- Returns 401 on mismatch

---

## apps/worker/src/routes/admin.ts - Full Content

GET /api/admin/stats
- Returns: totalUsers, totalEvents, totalGroups, totalTransactions, recentUsers (10)

GET /api/admin/users?limit=20&offset=0&search=
- Paginated user list (max 100 per page)
- Optional search by username or email
- Returns: items, total, limit, offset, hasMore

GET /api/admin/users/:id
- Specific user + last 20 point transactions
- Returns: sanitized user + transactions array

POST /api/admin/users/:id/points
- Grant or deduct points (ADMIN_GRANT / ADMIN_DEDUCT)
- Creates transaction record
- Prevents negative balance (max(0, ...))
- Returns updated user

GET /api/admin/events?limit=20&offset=0&status=
- Paginated events list
- Optional filter by status: OPEN, LOCKED, RESOLVED, CANCELLED
- Returns: items, total, limit, offset, hasMore

DELETE /api/admin/events/:id
- Hard delete prediction event

GET /api/admin/groups?limit=20&offset=0
- Paginated groups list
- Returns: items, total, limit, offset, hasMore

GET /api/admin/transactions?limit=30&offset=0
- Paginated point transaction history
- Default 30 per page (max 100)
- Returns: items, total, limit, offset, hasMore

---

## packages/shared/src/constants.ts - Full Content

USER ROLES
- user, moderator, admin, root

ACCOUNT TYPES
- standard, premium

USER STATUSES
- active, suspended, banned, deleted

SUSPEND TYPES
- temporary, permanent

LEVEL & XP SYSTEM
- Cumulative XP thresholds for levels 1-50
- Key levels: 1(0XP), 2(100), 5(900), 10(5700), 20(40000), 50(500000)
- Max level: 50
- getLevelFromXP(xp) function
- getXPForNextLevel(level) function

XP REWARDS PER ACTION
- Prediction made: 10 XP
- Prediction win: 25 XP
- Login streak: 5 XP
- Quest complete: 50 XP
- Achievement: 30 XP
- Group activity: 5 XP

LOGIN STREAK BONUSES
- Day 1: 10 pts
- Day 2: 15 pts
- Day 3: 20 pts
- Day 5: 30 pts
- Day 7: 50 pts
- Day 14: 100 pts
- Day 30: 200 pts
- calculateLoginBonus(streak) function returns highest matching milestone

ACHIEVEMENT CODES (12 total)
- FIRST_PREDICTION, TEN_PREDICTIONS, FIFTY_PREDICTIONS
- STREAK_7, STREAK_30
- FIRST_WIN, TEN_WINS
- GROUP_CREATOR, SOCIAL_BUTTERFLY, SHOPAHOLIC

GLOBAL LIMITS
- Max groups per user: 10
- Max group members: 50
- Default welcome points: 100
- Default point reward: 100
- Leaderboard size: 100
- Session TTL: 30 days (86400 * 30 seconds)
- Cache TTL short: 30 seconds
- Cache TTL medium: 5 minutes (300 seconds)
- Cache TTL long: 1 hour (3600 seconds)

---

## File Statistics

Total files in apps/worker/src: 23 TypeScript files
- Middleware: 3 files (auth, ratelimit, adminAuth)
- Routes: 7 files (auth, admin, games, groups, quests, shop, users)
- Lib: 5 files (db, kv, auth, analytics, utils)
- Durable Objects: 3 files (GameRoom, GroupRoom, PointsLedger)
- Queue Handlers: 3 files (points, achievements, notifications)
- Core: 2 files (index.ts, types.ts)

Key integration points:
- All routes inject Env and Variables types
- All protected routes require authMiddleware
- Admin routes require adminAuthMiddleware after authMiddleware
- Rate limiting applied globally before route matching
- Queue consumers handle async operations (points, achievements, notifications)

