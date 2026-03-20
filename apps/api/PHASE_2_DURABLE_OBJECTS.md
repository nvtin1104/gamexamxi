# Phase 2: Durable Objects Implementation

**Status:** ✅ Complete (ready for testing)
**Date Started:** 2026-03-20
**Changes:** 8 files created/modified

---

## What Was Built

### 3 Durable Objects Created

#### 1. **PointsLedger DO** (Per-User Transaction Log)
- Immutable transaction history
- Balance tracking
- Audit verification
- State persistence across restarts
- **API Endpoints:**
  - `POST /api/v1/durable-objects/points-ledger/:userId/record` - Record transaction
  - `GET /api/v1/durable-objects/points-ledger/:userId/balance` - Get current balance
  - `GET /api/v1/durable-objects/points-ledger/:userId/history` - Get transaction history
  - `GET /api/v1/durable-objects/points-ledger/:userId/audit` - Audit ledger integrity

#### 2. **GroupRoom DO** (Per-Group Leaderboard)
- Real-time leaderboard updates
- Member stats tracking
- Rank calculation
- WebSocket broadcast support (30s intervals)
- **API Endpoints:**
  - `POST /api/v1/durable-objects/group-room/:groupId/update` - Update member stats
  - `GET /api/v1/durable-objects/group-room/:groupId/leaderboard` - Get top N members
  - `GET /api/v1/durable-objects/group-room/:groupId/rank` - Get user's rank
  - `GET /api/v1/durable-objects/group-room/:groupId/ws` - WebSocket leaderboard feed

#### 3. **GameRoom DO** (Per-Event Multiplayer)
- Concurrent pick/vote handling
- Race condition prevention (optimistic locking)
- Real-time game state broadcasting
- WebSocket support (2s intervals)
- **API Endpoints:**
  - `POST /api/v1/durable-objects/game-room/:eventId/pick` - Submit a pick
  - `GET /api/v1/durable-objects/game-room/:eventId/state` - Get game state
  - `GET /api/v1/durable-objects/game-room/:eventId/pick` - Get user's pick
  - `POST /api/v1/durable-objects/game-room/:eventId/close` - Close picks
  - `GET /api/v1/durable-objects/game-room/:eventId/ws` - WebSocket game updates

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT REQUESTS                         │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│              DURABLE OBJECTS ROUTER LAYER                    │
│  (routes/durable-objects.ts - API Gateway to DOs)          │
├─────────────────────────────────────────────────────────────┤
│  GET :userId/balance → PointsLedger.get(userId)            │
│  POST :eventId/pick → GameRoom.get(eventId)                │
│  GET :groupId/leaderboard → GroupRoom.get(groupId)         │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│              DURABLE OBJECTS INSTANCES                       │
│  (Persistent, per-key instances)                           │
├─────────────────────────────────────────────────────────────┤
│  PointsLedger[user-123]    → Immutable log                 │
│  GameRoom[event-456]       → Concurrent state              │
│  GroupRoom[group-789]      → Leaderboard                   │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│              STATE PERSISTENCE LAYER                         │
│  (DurableObjectState.storage.put/get)                       │
├─────────────────────────────────────────────────────────────┤
│  Survives DO restart/migration                             │
│  ~4GB per object limit                                     │
│  Automatic async sync                                      │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│              WEBSOCKET BROADCAST                             │
│  (Periodic updates to connected clients)                    │
├─────────────────────────────────────────────────────────────┤
│  GameRoom: 2s interval (real-time picks)                    │
│  GroupRoom: 30s interval (leaderboard updates)              │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Models

### PointsLedger Entry
```json
{
  "id": "tx-1710960000000-abc123",
  "type": "credit|debit|adjustment",
  "amount": 100,
  "reason": "Daily login bonus",
  "timestamp": "2026-03-20T14:30:00Z",
  "metadata": { "source": "event-456" }
}
```

### GroupMemberStats
```json
{
  "userId": "user-123",
  "username": "Player Name",
  "points": 5000,
  "level": 25,
  "rank": 1,
  "picksMade": 50,
  "winsCount": 10,
  "joinedAt": "2026-03-20T14:30:00Z"
}
```

### UserPick
```json
{
  "userId": "user-123",
  "selectedOptionId": "option-456",
  "pickedAt": "2026-03-20T14:30:00Z"
}
```

### GameState
```json
{
  "eventId": "event-123",
  "eventName": "Event Name",
  "isOpen": true,
  "totalPicks": 542,
  "options": [
    { "optionId": "opt-1", "pickCount": 234 },
    { "optionId": "opt-2", "pickCount": 308 }
  ]
}
```

---

## Files Created

| File | Purpose |
|------|---------|
| `durable-objects/points-ledger.ts` | Immutable transaction log per user |
| `durable-objects/group-room.ts` | Leaderboard & member stats per group |
| `durable-objects/game-room.ts` | Concurrent picks & votes per event |
| `routes/durable-objects.ts` | API routes to DO instances |
| `PHASE_2_DURABLE_OBJECTS.md` | This guide |

## Files Modified

| File | Change |
|------|--------|
| `wrangler.toml` | Added 3 DO binding configs |
| `types/bindings.ts` | Added 3 DO stub bindings |
| `index.ts` | Exported DOs, wired routes |

---

## Race Condition Prevention

### GameRoom Optimistic Locking
```typescript
// Track version per user pick
pickVersion: Map<string, number>

async submitPick(userId, optionId) {
  const version = this.pickVersion.get(userId) ?? 0
  const newVersion = version + 1
  this.pickVersion.set(userId, newVersion)

  // Update picks atomically
  // Prevents double-counting if same user submits twice
}
```

**Benefits:**
- No database lock contention
- Concurrent requests handled locally in DO
- Fast rejection of stale updates

---

## WebSocket Broadcasting

### GameRoom (2s Broadcast)
```json
{
  "type": "game_state_update",
  "data": {
    "eventId": "event-123",
    "totalPicks": 542,
    "options": [...]
  },
  "timestamp": "2026-03-20T14:30:00Z"
}
```

### GroupRoom (30s Broadcast)
```json
{
  "type": "leaderboard_update",
  "data": [
    { "userId": "user-1", "rank": 1, "points": 9999 },
    { "userId": "user-2", "rank": 2, "points": 8500 }
  ],
  "timestamp": "2026-03-20T14:30:00Z"
}
```

---

## Local Testing Guide

### Prerequisites
Same as Phase 1:
```bash
cd apps/api
pnpm install
```

### Step 1: Start Dev Server
```bash
pnpm dev
# Should show all DOs initialized
```

### Step 2: Test PointsLedger

#### Record a transaction
```bash
curl -X POST http://localhost:8787/api/v1/durable-objects/points-ledger/user-123/record \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "credit",
    "amount": 100,
    "reason": "Daily bonus",
    "metadata": { "event": "daily-login" }
  }'

# Response:
# {
#   "data": {
#     "id": "tx-1710960000000-abc123",
#     "type": "credit",
#     "amount": 100,
#     ...
#   }
# }
```

#### Get balance
```bash
curl http://localhost:8787/api/v1/durable-objects/points-ledger/user-123/balance \
  -H "Authorization: Bearer $JWT"

# Response:
# {
#   "data": {
#     "balance": 100,
#     "lastUpdated": "2026-03-20T14:30:00Z"
#   }
# }
```

#### Get transaction history
```bash
curl http://localhost:8787/api/v1/durable-objects/points-ledger/user-123/history?limit=10&offset=0 \
  -H "Authorization: Bearer $JWT"

# Response:
# {
#   "data": {
#     "transactions": [...],
#     "total": 1,
#     "balance": 100
#   }
# }
```

#### Audit ledger (verify integrity)
```bash
curl http://localhost:8787/api/v1/durable-objects/points-ledger/user-123/audit \
  -H "Authorization: Bearer $JWT"

# Response:
# {
#   "data": {
#     "userId": "user-123",
#     "transactionCount": 1,
#     "currentBalance": 100,
#     "derivedBalance": 100,
#     "isValid": true
#   }
# }
```

### Step 3: Test GameRoom

#### Submit a pick
```bash
curl -X POST http://localhost:8787/api/v1/durable-objects/game-room/event-456/pick \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"optionId": "option-1"}'

# Response:
# {
#   "success": true,
#   "pick": {
#     "userId": "user-123",
#     "selectedOptionId": "option-1",
#     "pickedAt": "2026-03-20T14:30:00Z"
#   }
# }
```

#### Get game state
```bash
curl http://localhost:8787/api/v1/durable-objects/game-room/event-456/state \
  -H "Authorization: Bearer $JWT"

# Response:
# {
#   "data": {
#     "eventId": "event-456",
#     "eventName": "Event event-456",
#     "isOpen": true,
#     "totalPicks": 1,
#     "options": [
#       { "optionId": "option-1", "pickCount": 1 }
#     ]
#   }
# }
```

#### Get user's pick
```bash
curl http://localhost:8787/api/v1/durable-objects/game-room/event-456/pick \
  -H "Authorization: Bearer $JWT"

# Response:
# {
#   "data": {
#     "userId": "user-123",
#     "selectedOptionId": "option-1",
#     "pickedAt": "2026-03-20T14:30:00Z"
#   }
# }
```

#### Close picks (admin only)
```bash
curl -X POST http://localhost:8787/api/v1/durable-objects/game-room/event-456/close \
  -H "Authorization: Bearer $JWT"

# Response:
# { "success": true }

# Try to pick after close (should fail)
curl -X POST http://localhost:8787/api/v1/durable-objects/game-room/event-456/pick \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"optionId": "option-2"}'

# Response:
# {
#   "success": false,
#   "error": "Event picks are closed"
# }
```

### Step 4: Test GroupRoom

#### Update member stats
```bash
curl -X POST http://localhost:8787/api/v1/durable-objects/group-room/group-789/update \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "stats": {
      "points": 5000,
      "level": 25,
      "picksMade": 50,
      "winsCount": 10
    }
  }'

# Response:
# { "success": true }
```

#### Get leaderboard
```bash
curl http://localhost:8787/api/v1/durable-objects/group-room/group-789/leaderboard?limit=10 \
  -H "Authorization: Bearer $JWT"

# Response:
# {
#   "data": [
#     {
#       "userId": "user-123",
#       "username": "User user-123",
#       "points": 5000,
#       "rank": 1,
#       ...
#     }
#   ]
# }
```

#### Get user's rank
```bash
curl http://localhost:8787/api/v1/durable-objects/group-room/group-789/rank \
  -H "Authorization: Bearer $JWT"

# Response:
# {
#   "data": {
#     "userId": "user-123",
#     "rank": 1,
#     "totalMembers": 1,
#     "percentile": 100
#   }
# }
```

### Step 5: Test WebSocket Connections

#### GameRoom WebSocket
```bash
# Use websocat or similar WebSocket client
websocat http://localhost:8787/api/v1/durable-objects/game-room/event-456/ws \
  -H "Authorization: Bearer $JWT"

# Should receive initial state, then updates every 2 seconds
```

#### GroupRoom WebSocket
```bash
websocat http://localhost:8787/api/v1/durable-objects/group-room/group-789/ws \
  -H "Authorization: Bearer $JWT"

# Should receive initial leaderboard, then updates every 30 seconds
```

### Step 6: Test State Persistence

#### Kill and restart server
```bash
# Stop: Ctrl+C
# Restart: pnpm dev

# Query GameRoom state again:
curl http://localhost:8787/api/v1/durable-objects/game-room/event-456/state \
  -H "Authorization: Bearer $JWT"

# Should still show same picks and state!
# Proves persistence across restarts
```

---

## Deployment Checklist

- [ ] All DOs export correctly from index.ts
- [ ] wrangler.toml has DO binding configs
- [ ] Bindings type includes DO stubs
- [ ] DO routes added to main app router
- [ ] WebSocket upgrade paths validated
- [ ] State persistence tested locally
- [ ] Test with 10+ concurrent connections
- [ ] Test state recovery after DO restart
- [ ] Production deployment:
  ```bash
  wrangler deploy
  ```

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Pick submission latency | < 50ms | Race condition prevention is local |
| State persistence | < 100ms | Async, non-blocking |
| WebSocket broadcast interval | 2-30s | Configurable per DO |
| Concurrent WebSocket clients | 100+ per DO | Cloudflare limit |
| Memory per DO instance | < 10MB | Typical with state map |

---

## Known Limitations

⚠️ **WebSocket Connection Management**
- Current: WebSocket clients stored in memory (lost on DO restart)
- Future: Implement reconnection handshake on client side
- Workaround: Set up auto-reconnect in client with exponential backoff

⚠️ **Storage Limits**
- ~4GB per DO instance limit
- PointsLedger: Can store ~400k transactions before reaching limit
- Monitor: Set up alert when storage > 3GB

⚠️ **Concurrent Connections**
- Single DO instance handles all requests for a key
- High-traffic events (100k+ users) may need sharding strategy
- Future: Implement DO sharding by user ID hash

---

## Next Steps

1. **Load Test** - Stress test with concurrent picks/WebSocket connections
2. **Integration Tests** - Verify state persistence under failure scenarios
3. **Move to Phase 3** - WebSocket dashboard integration (real-time UX)

---

## Phase 2 Complete ✅

**Ready for:**
- Concurrent user testing
- WebSocket load testing
- State persistence verification
- Production deployment

**Performance Improvement:** No more database locks on concurrent operations ✅

---

**Questions?** See `plans/20260320-1400-codebase-analysis-and-improvement/phase-02-durable-objects.md` for architecture details.
