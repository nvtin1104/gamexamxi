# Phase 2: Implement Durable Objects for Real-time State
**Status:** Planning | **Priority:** P1 (enables multiplayer) | **Effort:** 4-5 days

## Overview
Deploy 3 Durable Objects to manage real-time, stateful features:
1. **GameRoom** (per event ID) - concurrent multiplayer picks/votes
2. **GroupRoom** (per group ID) - leaderboards, group stats
3. **PointsLedger** (per user ID) - immutable transaction log

## Key Insights
- Memory mentions DO for these, but no code exists yet
- DO instances persist state in storage (up to ~4GB per object)
- Perfect for race condition prevention (atomic state updates)
- WebSocket support needed for live client connections

## Architecture
```
Dashboard Client (WebSocket)
  → DO Stub (persistent connection)
    → GameRoom (event#123)
      → state.storage (picks, votes)
      → broadcast to subscribers
      → Alarm for timeout cleanup

KV / D1
  ← read-through for cache miss
  ← write-back for durability
```

## Requirements
1. Define 3 DO classes (GameRoom, GroupRoom, PointsLedger)
2. Implement state.storage operations
3. Add WebSocket acceptor in each DO
4. Implement broadcast to connected clients
5. Add alarm scheduling (cleanup, rollups)
6. Stub creation + routing in worker

## Related Files
- `apps/api/src/index.ts` (main worker)
- `apps/api/src/types/bindings.ts` (DO bindings)
- `apps/api/wrangler.toml` (DO config)
- New: `apps/api/src/durable-objects/*.ts`

## Implementation Steps
1. Create DO stub classes in `apps/api/src/durable-objects/`
2. Add DO migrations in wrangler.toml
3. Implement WebSocket handler in each DO
4. Add state.storage schema (key-value pairs)
5. Implement broadcast logic
6. Create alarm handlers (cleanup, stats rollup)
7. Add fetch() handlers for client requests
8. Wire stubs in worker routes

## Todo Checklist
- [ ] Create GameRoom.ts (concurrent pick handling)
- [ ] Create GroupRoom.ts (leaderboard aggregation)
- [ ] Create PointsLedger.ts (transaction ledger)
- [ ] Add DO config to wrangler.toml
- [ ] Implement WebSocket broadcast
- [ ] Add state.storage schema + serialization
- [ ] Implement alarm scheduling
- [ ] Integration test DO state persistence
- [ ] Load test (5+ concurrent clients per GameRoom)

## Success Criteria
- GameRoom state survives DO restart
- 10+ concurrent WebSocket clients per room without lag
- Point transactions immutable in PointsLedger
- Alarm cleanup runs on schedule
- Broadcast latency < 200ms

## Risk Assessment
**High:** DO memory limits → implement streaming for large leaderboards
**High:** State corruption on concurrent writes → use optimistic locking
**Medium:** WebSocket disconnects lose in-flight messages → add local queue
**Low:** DO cost scaling → monitor instances created

## Security Considerations
- DO state accessible via fetch() → validate caller identity
- WebSocket auth inherited from parent Worker auth → re-verify in DO
- Broadcast messages expose game state → sanitize before sending
- Storage size limits → audit for unbounded growth

## Next Steps
1. Implement GameRoom.ts (start simple: just accept WebSocket)
2. Test WebSocket connection/reconnection
3. Add state.storage for picks
4. Code review GameRoom implementation
5. Implement GroupRoom and PointsLedger similarly
6. Load test all 3 DOs under concurrent traffic
7. Move to Phase 3 (WebSocket dashboard integration)
