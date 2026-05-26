# Phase 3: Dashboard WebSocket Integration
**Status:** Planning | **Priority:** P1 (blocks real-time UX) | **Effort:** 2-3 days

## Overview
Connect dashboard to DO WebSockets for live updates:
- Event live picks/votes
- Group leaderboard updates
- Point transaction feed
- Achievement unlocks

Requires bidirectional communication + auto-reconnect logic.

## Key Insights
- Dashboard (Vite) already has API client with token refresh
- Can reuse auth token for WebSocket upgrade
- Need to handle connection loss gracefully
- Redux/Zustand can cache state between reconnections

## Architecture
```
Dashboard (React)
  → useWebSocket hook
    → WebSocket("/live/game-room#eventId")
      → GameRoom DO
        → broadcast picks/votes
          → Update React state
          → TanStack Query invalidation
```

## Requirements
1. WebSocket route in worker: `/live/*`
2. Auth middleware for WebSocket upgrade
3. useWebSocket hook in dashboard
4. Auto-reconnect with exponential backoff
5. Message queue for offline actions
6. Update TanStack Query cache on message

## Related Files
- `apps/api/src/index.ts` (add WebSocket route)
- `apps/api/src/middleware/auth.ts` (WebSocket auth)
- `apps/dashboard/src/hooks/` (new useWebSocket.ts)
- `apps/dashboard/src/lib/api-client.ts` (reuse token)

## Implementation Steps
1. Add WebSocket auth middleware in worker
2. Create `/live/:roomType/:roomId` route
3. Implement useWebSocket hook with:
   - Auto-reconnect (exponential backoff)
   - Message queue for offline
   - Error boundary
4. Create message schema (Zod) for each room type
5. Update React components to consume WebSocket
6. Add TanStack Query integration
7. Test reconnection scenarios

## Todo Checklist
- [ ] Add WebSocket auth middleware
- [ ] Create `/live/*` route handler in worker
- [ ] Implement useWebSocket hook
- [ ] Add auto-reconnect logic
- [ ] Create message schemas
- [ ] Update GameRoom view with live data
- [ ] Update LeaderboardRoom view
- [ ] Integration test reconnection
- [ ] Stress test: 50+ concurrent WebSocket clients

## Success Criteria
- WebSocket connects within 1 second
- Reconnect after disconnect within 3 seconds
- Messages arrive within 200ms
- No memory leaks on repeated connect/disconnect
- Offline actions queued and sent on reconnect

## Risk Assessment
**High:** Message ordering → implement sequence numbers
**Medium:** Large broadcast messages → implement streaming/pagination
**Medium:** Token expiry during WebSocket session → handle mid-stream auth failure
**Low:** WebSocket quota limits → monitor concurrent connections

## Security Considerations
- WebSocket URL exposes room IDs → implement access control per user
- Auth token sent in URL → use header-based auth if possible
- Broadcast messages may leak data → filter by user permissions
- Client-side state management → sanitize user-controlled input

## Next Steps
1. Implement useWebSocket hook (basic version)
2. Add to GameRoom component
3. Test manual reconnection
4. Add auto-reconnect logic
5. Code review + stress testing
6. Move to Phase 4 (Auth & I18n improvements)
