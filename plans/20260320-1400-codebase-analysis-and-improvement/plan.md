# GameXamXi Codebase Analysis & Improvement Plan
**Date:** 2026-03-20 | **Status:** Planning | **Priority:** P1

## Project Overview
Full-stack Cloudflare-native minigame prediction platform (Turborepo monorepo).
- **Apps:** API (Hono Workers), Dashboard (Vite React), Website (Next.js)
- **Shared:** Types, schemas, constants via Zod
- **Current:** Functional baseline with gaps in real-time infrastructure

## Critical Blockers
1. **Queues disabled** → blocks async workflows (points, notifications)
2. **No Durable Objects** → can't support real-time multiplayer
3. **No WebSocket** → dashboard lacks live updates
4. **Dashboard is Vite, not Next.js** → memory mismatch, impacts deployment

## Phases

### Phase 1: Queue Infrastructure
[Link to phase-01-queues.md](phase-01-queues.md)
- Enable Cloudflare Queues (points, achievements, notifications)
- Implement consumers in worker
- Add queue message handling

### Phase 2: Durable Objects
[Link to phase-02-durable-objects.md](phase-02-durable-objects.md)
- GameRoom (per event, concurrent multiplayer)
- GroupRoom (per group, leaderboards)
- PointsLedger (per user, transaction ledger)

### Phase 3: WebSocket & Real-time
[Link to phase-03-websocket.md](phase-03-websocket.md)
- Worker WebSocket endpoints
- Dashboard live feed integration
- Event subscriptions

### Phase 4: Auth & I18n
[Link to phase-04-auth-i18n.md](phase-04-auth-i18n.md)
- Multi-language error messages
- Per-user rate limiting
- Auth token improvements

### Phase 5: Testing & Monitoring
[Link to phase-05-testing.md](phase-05-testing.md)
- Unit tests (API routes, services)
- Integration tests (auth flows)
- Monitoring & error tracking

## Architecture Decisions
- Keep Vite for dashboard (faster dev, smaller bundle than Next.js)
- Use DO for state, Queues for async, KV for cache (KISS principle)
- All async jobs deferred to Queues (no blocking on worker)
- Shared Zod schemas reduce type mismatches

## Success Criteria
✓ All phases pass code review
✓ E2E test suite passes
✓ Deployed to production with monitoring
✓ Real-time features (GameRoom) verified under load
✓ Dashboard WebSocket stable for 5+ concurrent connections

## Risks
- D1 query timeouts under heavy load → optimize N+1 queries first
- DO data consistency → implement optimistic locking
- WebSocket disconnections → auto-reconnect with backoff

## Next Steps
1. Review Phase 1 (Queues) implementation plan
2. Approve architecture decisions
3. Begin Phase 1 implementation
4. Code review gates on each phase
