# Phase 5: Testing & Monitoring Strategy

## Context & Overview

GameXamXi has no automated tests (the single `queue.integration.test.ts` is a manual-test stub with `console.log`). No vitest config exists. No monitoring/observability in place. This plan adds production-grade testing and monitoring across three layers: unit, integration, E2E -- plus Sentry error tracking and performance observability.

**Key constraints:**
- Cloudflare Workers runtime (no Node.js APIs; must use `@cloudflare/vitest-pool-workers` for unit/integration)
- Dashboard uses Vite + React (not Next.js), TanStack Router
- Website uses Next.js 14 App Router
- Monorepo with pnpm workspaces + Turborepo

---

## Architecture Decision: Testing Stack

| Layer | Tool | Why |
|-------|------|-----|
| Unit + Integration (API) | Vitest + `@cloudflare/vitest-pool-workers` | Official CF testing; runs in miniflare isolate with D1/KV/R2/DO/Queue bindings |
| Unit (Dashboard/Website) | Vitest + `@testing-library/react` | Fast, same runner across monorepo |
| E2E | Playwright | Cross-browser, good CF Workers Pages support |
| Error Tracking | Sentry (`toucan-js` for Workers, `@sentry/react` for frontend) | Industry standard; `toucan-js` is the CF Workers-compatible Sentry SDK |
| Performance | Sentry Performance + `web-vitals` + custom Worker timing | Unified in one platform |

---

## Phase 5A: Unit Tests (API Worker)

### Requirements
- Install: `vitest`, `@cloudflare/vitest-pool-workers`
- Create `apps/api/vitest.config.ts` using `defineWorkersConfig`
- Bind test D1, KV, R2 via `wrangler.toml` `[miniflare]` section or vitest pool config

### Implementation Steps

**5A.1 -- Setup vitest for Workers**

```
# apps/api/
pnpm add -D vitest @cloudflare/vitest-pool-workers
```

Create `apps/api/vitest.config.ts`:
```ts
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          kvNamespaces: ['CACHE', 'SESSIONS'],
          d1Databases: ['DB'],
          r2Buckets: ['STORAGE'],
        },
      },
    },
  },
})
```

Add to `apps/api/package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

Add to root `turbo.json`: `"test": { "dependsOn": ["^build"] }`.

Add to root `package.json`: `"test": "turbo test"`.

**5A.2 -- Token Bucket Rate Limiter Tests**

File: `apps/api/src/middleware/__tests__/rate-limit-per-user.test.ts`

Test cases:
1. Fresh user gets 100 tokens, request succeeds
2. After 100 requests, 101st returns 429
3. Tokens refill proportionally over time (mock `Date.now`)
4. Tokens cap at max (no over-refill)
5. Auth rate limiter: 20 req/min limit by IP
6. Fail-open behavior: KV error still allows request
7. Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` present

Implementation notes:
- Mock `c.env.CACHE` with miniflare KV
- Use `vi.useFakeTimers()` to control time for refill tests
- Extract token bucket logic into a pure function `calculateBucket(bucket, now, limit, window)` for easier unit testing -- recommend a small refactor

**5A.3 -- Token Revocation Service Tests**

File: `apps/api/src/services/__tests__/token-revocation.test.ts`

Test cases:
1. `revokeToken` stores key with correct TTL
2. `revokeToken` with expired token (TTL <= 0) does nothing
3. `isTokenRevoked` returns true for revoked, false for non-revoked
4. `revokeAllUserTokens` stores user-level revocation
5. `areUserTokensRevoked` returns true when token issued before revocation
6. `areUserTokensRevoked` returns false when token issued after revocation
7. `areUserTokensRevoked` handles malformed JSON gracefully
8. `createSession` / `endSession` lifecycle
9. Min TTL enforcement (60s floor)

Implementation notes:
- Instantiate `TokenRevocationService` with miniflare KV + D1
- No mocking needed -- miniflare provides real KV behavior

**5A.4 -- Queue Consumer Tests**

File: `apps/api/src/consumers/__tests__/points.consumer.test.ts`

Test cases:
1. Grant points: new user record created, balance updated
2. Grant points: existing user balance incremented
3. Deduct points: balance decreased
4. Reject negative balance (throws "Insufficient balance")
5. Reject exceeding pointLimit (throws "Balance would exceed limit")
6. Transaction record inserted in `pointTransactions`
7. Batch atomicity: both update + insert succeed or fail together

File: `apps/api/src/consumers/__tests__/dispatcher.test.ts`

Test cases:
1. `handleQueueMessage` routes `point_transaction` to points consumer
2. Routes `achievement_unlock` to achievements consumer
3. Routes `notification` to notifications consumer
4. Unknown type throws error

**5A.5 -- Durable Object Tests (GameRoom)**

File: `apps/api/src/durable-objects/__tests__/game-room.test.ts`

Test cases:
1. `initialize` creates default state for new room
2. `initialize` restores from storage for existing room
3. `submitPick` records user pick, increments option stats
4. `submitPick` when room closed returns error
5. Change pick: old option decremented, new incremented
6. Optimistic locking version increments
7. `closePicks` sets `isOpen = false`
8. `getGameState` returns correct totals
9. `getUserPick` returns null for unknown user
10. HTTP `POST /pick` returns 200/400 correctly
11. HTTP `GET /state` returns game state
12. Auto-creates option stats for unknown optionId

Implementation notes:
- Use `@cloudflare/vitest-pool-workers` DO testing utilities
- Instantiate DO via `env.GAME_ROOM.get(id)`

**5A.6 -- Auth Middleware Tests**

File: `apps/api/src/middleware/__tests__/auth.test.ts`

Test cases:
1. Valid Bearer token sets userId, role, accountRole
2. Valid cookie token (no header) works
3. Missing token returns 401
4. Expired/invalid token returns 401
5. `requireRole` allows matching role
6. `requireRole` blocks non-matching role (403)
7. `requirePermission` bypasses for admin/root
8. `requirePermission` checks resolved permissions

Implementation notes:
- Use `hono/testing` helper or call app routes directly
- Sign real JWTs with test secret for valid-token tests

---

## Phase 5B: Integration Tests (API Worker)

### Implementation Steps

**5B.1 -- Queue Producer-Consumer Flow**

File: `apps/api/src/__tests__/queue-flow.integration.test.ts`

Replace existing stub. Test cases:
1. POST `/api/v1/points/grant` enqueues message (verify via miniflare queue inspection)
2. Queue consumer processes message, user balance updated in D1
3. Failed consumer triggers retry (check `_retryCount`)
4. After 3 retries, message stored in dead-letter KV
5. Dead-letter entry has correct structure (messageId, body, error, timestamp)

**5B.2 -- Rate Limiter on Real Routes**

File: `apps/api/src/__tests__/rate-limit.integration.test.ts`

1. Authenticated route: 100 requests succeed, 101st returns 429
2. Auth endpoint (`/api/v1/auth/login`): 20 requests succeed, 21st returns 429
3. Rate limit headers present on every response
4. Different users have independent limits

**5B.3 -- Token Revocation in Auth Flow**

File: `apps/api/src/__tests__/auth-revocation.integration.test.ts`

1. Login -> get token -> revoke token -> subsequent request returns 401
   - Note: current auth middleware does NOT check revocation. This test will FAIL, revealing a gap. Recommend adding revocation check to `authMiddleware`.
2. Revoke all user tokens -> old token rejected, new token works

**5B.4 -- Database Transactions (Drizzle)**

File: `apps/api/src/__tests__/db-transactions.integration.test.ts`

1. Batch operation atomicity (points update + transaction insert)
2. Concurrent writes to same user don't corrupt balance

**5B.5 -- R2 File Upload**

File: `apps/api/src/__tests__/media-upload.integration.test.ts`

1. Upload file via `/api/v1/media` stores in R2
2. File retrievable after upload
3. Invalid file type rejected

---

## Phase 5C: E2E Tests (Playwright)

### Setup

Install at monorepo root:
```
pnpm add -D @playwright/test
npx playwright install chromium
```

Create `playwright.config.ts` at root:
```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3001', // dashboard
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'dashboard', testMatch: 'dashboard/**/*.spec.ts' },
    { name: 'website', testMatch: 'website/**/*.spec.ts',
      use: { baseURL: 'http://localhost:3000' } },
  ],
  webServer: [
    { command: 'pnpm dev:api', port: 8787, reuseExistingServer: true },
    { command: 'pnpm dev:dashboard', port: 3001, reuseExistingServer: true },
    { command: 'pnpm dev:website', port: 3000, reuseExistingServer: true },
  ],
})
```

Add to root `package.json`: `"test:e2e": "playwright test"`.

### Test Specs

**5C.1 -- Dashboard Login Flow**

File: `e2e/dashboard/auth.spec.ts`

1. Login with valid credentials -> redirected to dashboard
2. Login with invalid credentials -> error message shown
3. Login rate limiting -> after 20 rapid attempts, 429 error displayed
4. Logout -> token cleared, redirected to login

**5C.2 -- Game Pick Submission + WebSocket**

File: `e2e/dashboard/game-room.spec.ts`

1. Open game event page -> WebSocket connects (verify via network tab or WS message)
2. Submit pick -> pick reflected in UI
3. Change pick -> old option decremented, new incremented
4. Second browser tab sees real-time update via WebSocket
5. Closed event -> pick button disabled

**5C.3 -- Leaderboard Real-Time Updates**

File: `e2e/dashboard/leaderboard.spec.ts`

1. Leaderboard displays current rankings
2. Points change -> ranking updates (may need to trigger via API)

**5C.4 -- Language Switching (i18n)**

File: `e2e/dashboard/i18n.spec.ts`

1. Default language loads (check page title or nav text)
2. Switch to Vietnamese -> UI text changes
3. Switch back to English -> UI text reverts
4. Language persists on page reload

**5C.5 -- Logout + Token Revocation**

File: `e2e/dashboard/logout.spec.ts`

1. Login -> logout -> attempt API call -> 401
2. Login -> logout -> browser back button -> redirected to login (no cached auth)

---

## Phase 5D: Error Tracking & Monitoring (Sentry)

### Architecture

```
Worker (toucan-js) ──> Sentry
Dashboard (React)  ──> Sentry (via @sentry/react)
Website (Next.js)  ──> Sentry (via @sentry/nextjs)
```

### Implementation Steps

**5D.1 -- Worker Sentry Integration**

Install in `apps/api`: `pnpm add toucan-js`

Create `apps/api/src/utils/sentry.ts`:
- Initialize Toucan with DSN from env (`SENTRY_DSN`)
- Capture request context (URL, method, headers minus auth)
- Attach userId from context variables

Integrate in `apps/api/src/index.ts`:
- Wrap `app.onError` to call `sentry.captureException(err)`
- Wrap queue consumer errors similarly
- Add request timing middleware (measure `Date.now()` delta, report as Sentry transaction)

**5D.2 -- Dashboard Sentry Integration**

Install in `apps/dashboard`: `pnpm add @sentry/react`

Initialize in `apps/dashboard/src/main.tsx`:
- `Sentry.init({ dsn, integrations: [browserTracingIntegration(), replayIntegration()] })`
- Wrap root `<App />` with `Sentry.ErrorBoundary`

**5D.3 -- Website Sentry Integration**

Install in `apps/website`: `pnpm add @sentry/nextjs`

Follow `@sentry/nextjs` wizard: creates `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, wraps `next.config.js`.

**5D.4 -- Alert Thresholds**

Configure in Sentry dashboard (not code):
- Error rate > 10/min -> Slack/email alert
- P95 response time > 2s -> warning
- Unhandled rejection spike -> critical
- Queue dead-letter rate > 5% -> critical

---

## Phase 5E: Performance Monitoring

### Implementation Steps

**5E.1 -- Worker Request Timing Middleware**

File: `apps/api/src/middleware/timing.ts`

Simple middleware:
```ts
export const timingMiddleware = createMiddleware(async (c, next) => {
  const start = Date.now()
  await next()
  const duration = Date.now() - start
  c.header('X-Response-Time', `${duration}ms`)
  // Report to Sentry as span if > threshold
})
```

Apply globally in `index.ts` before other middleware.

**5E.2 -- Custom Metrics via Sentry**

Track in Worker code (ad-hoc spans):
- Queue message processing time (in consumer dispatcher)
- DO operation time (in DO fetch handler)
- D1 query time (wrapper around `getDb`)
- KV access time (wrapper or timing in rate limiter)

**5E.3 -- Web Vitals (Dashboard + Website)**

Dashboard: `web-vitals` library already available via `@sentry/react` browserTracing.
Website: `@sentry/nextjs` captures Web Vitals automatically.

No additional code needed beyond Sentry init.

**5E.4 -- Bundle Size Tracking**

Add to CI pipeline (GitHub Actions):
```yaml
- name: Build & measure bundle
  run: |
    pnpm --filter @gamexamxi/dashboard build
    du -sh apps/dashboard/dist/assets/*.js | tee bundle-sizes.txt
    pnpm --filter @gamexamxi/api build
    du -sh apps/api/dist/*.js | tee -a bundle-sizes.txt
```

Optional: use `bundlewatch` or `size-limit` for PR gate.

---

## Implementation Order & Dependencies

```
5A (Unit Tests)          -- no deps, start first
  5A.1 Setup             -- prerequisite for all 5A.*
  5A.2-5A.6              -- parallel after 5A.1

5B (Integration Tests)   -- depends on 5A.1 (same vitest setup)
  5B.1-5B.5              -- parallel

5C (E2E Tests)           -- independent of 5A/5B
  5C setup               -- prerequisite
  5C.1-5C.5              -- sequential (share auth state) or parallel with isolated contexts

5D (Sentry)              -- independent, can start anytime
  5D.1-5D.3              -- parallel per app
  5D.4                   -- after 5D.1-5D.3 deployed

5E (Performance)         -- depends on 5D (Sentry as reporting backend)
  5E.1-5E.2              -- after 5D.1
  5E.3                   -- after 5D.2/5D.3
  5E.4                   -- independent
```

Estimated effort: ~3-4 days for one developer.

---

## Testing Checklist

### Unit Tests (5A)
- [ ] vitest config with `@cloudflare/vitest-pool-workers` working
- [ ] Rate limiter: 7 test cases passing
- [ ] Token revocation: 9 test cases passing
- [ ] Queue consumers: 7 test cases passing
- [ ] GameRoom DO: 12 test cases passing
- [ ] Auth middleware: 8 test cases passing

### Integration Tests (5B)
- [ ] Queue flow end-to-end: 5 test cases
- [ ] Rate limit on routes: 4 test cases
- [ ] Auth revocation flow: 2 test cases (may reveal gap)
- [ ] DB transactions: 2 test cases
- [ ] R2 upload: 3 test cases

### E2E Tests (5C)
- [ ] Dashboard login + rate limit: 4 specs
- [ ] Game pick + WebSocket: 5 specs
- [ ] Leaderboard: 2 specs
- [ ] i18n switching: 4 specs
- [ ] Logout + revocation: 2 specs

### Monitoring (5D + 5E)
- [ ] Sentry DSN configured per environment
- [ ] Worker errors captured in Sentry
- [ ] Dashboard errors captured with replay
- [ ] `X-Response-Time` header on all API responses
- [ ] Bundle size tracked in CI

---

## Success Criteria

1. `pnpm test` runs all unit + integration tests across monorepo, all green
2. `pnpm test:e2e` runs Playwright suite, all green
3. Sentry dashboard shows incoming events from all 3 apps
4. Worker response time P95 < 200ms (measured via `X-Response-Time`)
5. Zero unhandled exceptions in production for 24h post-deploy

---

## Security Considerations

1. **Sentry DSN**: store as env var, not hardcoded. Use `SENTRY_DSN` in wrangler vars (non-secret; DSN is public-facing by design but limit via Sentry allowed domains)
2. **Test data isolation**: all tests use miniflare local bindings, never touch production D1/KV/R2
3. **No secrets in tests**: JWT_SECRET for tests is a hardcoded test value in vitest config, never the production secret
4. **E2E test accounts**: use dedicated test credentials, never admin accounts
5. **Sentry PII scrubbing**: configure `beforeSend` to strip Authorization headers and user emails from error reports
6. **Rate limiter fail-open**: current design allows requests on KV errors -- acceptable for availability but log/alert on these failures via Sentry

---

## Key Insights / Discovered Issues

1. **Auth middleware does NOT check token revocation.** The `TokenRevocationService` exists but `authMiddleware` never calls `isTokenRevoked` or `areUserTokensRevoked`. Integration test 5B.3 will expose this. Recommend adding revocation check to auth middleware as part of this phase.

2. **Dashboard is Vite + React (NOT Next.js).** Memory doc says "Next.js 14" but `package.json` shows Vite + TanStack Router. Sentry integration should use `@sentry/react`, not `@sentry/nextjs`.

3. **Existing test file is a stub.** `queue.integration.test.ts` has zero assertions -- just `console.log` statements. Replace entirely.

4. **Rate limiter has a subtle bug.** The sliding-window `rateLimiter` (IP-based) uses `expirationTtl: windowSeconds` but the `resetAt` is set to `now + windowSeconds * 1000` (milliseconds). The TTL in KV is in seconds and matches `windowSeconds`, but the record could expire before `resetAt` is reached if the first request comes early in the window. Not a critical bug but worth a test case.

5. **No `vitest` dependency anywhere in the monorepo.** Must be installed fresh.

---

## Unresolved Questions

1. Does the team have a Sentry account/project already, or does one need to be created?
2. Should E2E tests run against local dev or a staging deployment on CF Workers?
3. Is there a CI/CD pipeline (GitHub Actions) already configured, or does that need to be set up as part of this phase?
4. Budget for Sentry plan (free tier has limited event quota -- may need Team plan for replay + performance)?
