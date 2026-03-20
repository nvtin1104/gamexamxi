# Phase 3: WebSocket Dashboard Integration

**Status:** ✅ Complete (ready for integration)
**Date Started:** 2026-03-20
**Changes:** 5 hooks/components created

---

## What Was Built

### 1. **useWebSocket Hook**
```typescript
const { status, send, disconnect, isConnected, messageQueue } = useWebSocket({
  url: 'ws://localhost:8787/api/v1/durable-objects/game-room/event-123/ws',
  autoReconnect: true,
  maxRetries: 10,
  initialBackoff: 1000,
  maxBackoff: 30000,
})
```

**Features:**
- ✅ Auto-reconnect with exponential backoff
- ✅ Offline message queueing
- ✅ TanStack Query cache invalidation
- ✅ Status tracking (connecting, connected, disconnected, error)
- ✅ Proper cleanup on unmount

### 2. **WebSocketProvider Context**
```typescript
<WebSocketProvider url="ws://..." queryKeys={['game-room', 'leaderboard']}>
  <GameRoom />
  <Leaderboard />
</WebSocketProvider>
```

**Benefits:**
- Single WebSocket connection shared across components
- No duplicate connections
- Global status management

### 3. **WebSocketStatus Component**
```typescript
<WebSocketStatus size="sm" showLabel />
// Shows: ✓ Live | ↻ Connecting | ✕ Offline | ⚠ Error
```

### 4. **GameRoom Component**
```typescript
<GameRoom
  eventId="event-123"
  eventName="Championship Match"
  options={[
    { optionId: 'opt-1', label: 'Team A', pickCount: 234 },
    { optionId: 'opt-2', label: 'Team B', pickCount: 308 },
  ]}
  onPickChange={(pick) => console.log(pick)}
/>
```

**Features:**
- ✅ Real-time pick count updates
- ✅ User pick highlighting
- ✅ Optimistic UI updates
- ✅ Progress bars for each option
- ✅ Offline mode support
- ✅ Lock when picks close

### 5. **Leaderboard Component**
```typescript
<Leaderboard
  groupId="group-789"
  groupName="Elite Group"
  currentUserId="user-123"
  limit={50}
/>
```

**Features:**
- ✅ Real-time rank updates
- ✅ Live point tracking
- ✅ Current user highlighting
- ✅ Trophy icons for top 3
- ✅ Cached data display when offline
- ✅ Update timestamps

---

## Integration Guide

### Step 1: Setup WebSocketProvider in Layout

```typescript
// apps/dashboard/src/app.tsx
import { WebSocketProvider } from './hooks/WebSocketProvider'

export default function App() {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787'
  const wsUrl = apiUrl.replace('http', 'ws')

  return (
    <WebSocketProvider
      url={wsUrl}
      queryKeys={['game-room', 'leaderboard', 'points-ledger']}
    >
      <YourAppContent />
    </WebSocketProvider>
  )
}
```

### Step 2: Use GameRoom in Event Page

```typescript
// apps/dashboard/src/pages/EventPage.tsx
import { GameRoom } from '../components/GameRoom'
import { useQuery } from '@tanstack/react-query'

export default function EventPage({ eventId }: { eventId: string }) {
  // Fetch initial state
  const { data: event } = useQuery({
    queryKey: ['game-room', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/durable-objects/game-room/${eventId}/state`)
      return res.json()
    },
  })

  if (!event) return <div>Loading...</div>

  return (
    <GameRoom
      eventId={eventId}
      eventName={event.data.eventName}
      options={event.data.options.map((opt: any) => ({
        optionId: opt.optionId,
        label: opt.label || `Option ${opt.optionId}`,
        pickCount: opt.pickCount,
      }))}
    />
  )
}
```

### Step 3: Use Leaderboard in Group Page

```typescript
// apps/dashboard/src/pages/GroupPage.tsx
import { Leaderboard } from '../components/Leaderboard'
import { useQuery } from '@tanstack/react-query'

export default function GroupPage({ groupId }: { groupId: string }) {
  const { user } = useAuth() // Get current user

  return (
    <Leaderboard
      groupId={groupId}
      groupName="Your Group Name"
      currentUserId={user.id}
      limit={50}
    />
  )
}
```

### Step 4: Setup Environment Variables

```bash
# apps/dashboard/.env.local
VITE_API_URL=http://localhost:8787
VITE_WS_URL=ws://localhost:8787

# Production
# VITE_API_URL=https://api.gamexamxi.com
# VITE_WS_URL=wss://api.gamexamxi.com
```

---

## WebSocket Message Protocol

### GameRoom Messages

**Initial State:**
```json
{
  "type": "initial_state",
  "data": {
    "eventId": "event-123",
    "eventName": "Championship",
    "isOpen": true,
    "totalPicks": 542,
    "options": [
      { "optionId": "opt-1", "pickCount": 234 },
      { "optionId": "opt-2", "pickCount": 308 }
    ]
  },
  "timestamp": "2026-03-20T14:30:00Z"
}
```

**Live Update (every 2 seconds):**
```json
{
  "type": "game_state_update",
  "data": {
    "eventId": "event-123",
    "eventName": "Championship",
    "isOpen": true,
    "totalPicks": 543,
    "options": [
      { "optionId": "opt-1", "pickCount": 234 },
      { "optionId": "opt-2", "pickCount": 309 }
    ]
  },
  "timestamp": "2026-03-20T14:30:02Z"
}
```

### GroupRoom Messages

**Initial Leaderboard:**
```json
{
  "type": "initial_leaderboard",
  "data": [
    {
      "userId": "user-1",
      "username": "Player One",
      "points": 9999,
      "level": 50,
      "rank": 1,
      "picksMade": 100,
      "winsCount": 25
    }
  ],
  "timestamp": "2026-03-20T14:30:00Z"
}
```

**Live Update (every 30 seconds):**
```json
{
  "type": "leaderboard_update",
  "data": [
    {
      "userId": "user-1",
      "username": "Player One",
      "points": 10050,
      "level": 50,
      "rank": 1,
      "picksMade": 101,
      "winsCount": 25
    }
  ],
  "timestamp": "2026-03-20T14:30:30Z"
}
```

---

## Reconnection Logic

The `useWebSocket` hook implements exponential backoff:

```
Attempt 1: Immediate
Attempt 2: 1.5 seconds
Attempt 3: 2.25 seconds
Attempt 4: 3.375 seconds
...
Max: 30 seconds
Max Attempts: 10
```

**Timeline:**
- Connection lost → Immediately retries
- Still failing → Waits 1.5s, tries again
- Still failing → Waits 2.25s, tries again
- And so on... up to max 30s delay between attempts

**User Experience:**
- ✓ Shows "Connecting..." indicator during retry
- ✓ Queues messages sent during outage
- ✓ Auto-syncs queue when connection resumes
- ✓ Invalidates React Query cache to refetch fresh data

---

## Offline Mode

When WebSocket is disconnected:

1. **UI Updates:**
   - Components show cached data from TanStack Query
   - Status indicator shows "Offline"
   - Buttons disabled or show "Offline Mode" message

2. **Message Queue:**
   - User picks/actions stored in memory
   - Queue flushed when connection resumes
   - Each queued message has unique ID + timestamp

3. **Cache:**
   - Previous data displayed (5-30 seconds old)
   - User warned: "Showing cached data"
   - Auto-refreshes on reconnect

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| WebSocket latency | < 50ms | Browser overhead |
| Broadcast interval | 2-30s | Configurable per room |
| Reconnect time | < 3s | On good connection |
| Max backoff | 30s | After max retries |
| Concurrent clients | 100+ | Per DO instance |

---

## Testing Checklist

### Local Testing

```bash
# 1. Start dev servers
cd apps/dashboard && pnpm dev
# In another terminal
cd apps/api && pnpm dev

# 2. Open dashboard
# http://localhost:5173/game-room/event-123

# 3. Verify WebSocket connects
# Check browser DevTools → Network → WS
# Should see: ws://localhost:8787/.../game-room/event-123/ws

# 4. Submit a pick
# Watch real-time update
# Pick count should increment immediately

# 5. Test offline mode
# DevTools → Network → Throttle to "Offline"
# Submit pick → Should queue
# Re-enable network → Should sync
```

### Network Conditions Testing

```bash
# Use Chrome DevTools Network Throttling:
# 1. Fast 3G (simulate slow connection)
# 2. Slow 3G (simulate very slow)
# 3. Offline (test offline queue)

# Verify:
# - Auto-reconnect triggers
# - Queue doesn't lose messages
# - Status indicator updates
```

### Load Testing

```bash
# Simulate 50+ concurrent WebSocket clients
# Use tool: artillery, k6, or locust

# Test scenario:
# 1. 50 clients connect to GameRoom
# 2. Each submits pick every 2 seconds
# 3. Verify:
#    - No race conditions
#    - Broadcast reaches all clients < 2s
#    - Server handles load without errors
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│            Dashboard Application                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ WebSocketProvider Context                   │   │
│  │ (Manages single connection + cache)         │   │
│  └─────────────────────────────────────────────┘   │
│           ↓                                         │
│  ┌─────────────────────────────────────────────┐   │
│  │ useWebSocket Hook                           │   │
│  │ • Auto-reconnect                            │   │
│  │ • Offline queue                             │   │
│  │ • Status tracking                           │   │
│  │ • TanStack Query invalidation               │   │
│  └─────────────────────────────────────────────┘   │
│           ↓                                         │
│  ┌──────────────────┬──────────────────────────┐   │
│  │ GameRoom         │ Leaderboard              │   │
│  │                  │                          │   │
│  │ • Shows picks    │ • Shows ranks            │   │
│  │ • Live updates   │ • Live updates           │   │
│  │ • Offline safe   │ • Offline safe           │   │
│  │ • Status bar     │ • Status bar             │   │
│  └──────────────────┴──────────────────────────┘   │
│           ↓                                         │
│  ┌─────────────────────────────────────────────┐   │
│  │ WebSocketStatus Component                   │   │
│  │ Shows: ✓ Live | ↻ Connecting | ✕ Offline   │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
           ↓ WebSocket Connection
┌─────────────────────────────────────────────────────┐
│         Cloudflare Worker (API)                     │
├─────────────────────────────────────────────────────┤
│ /api/v1/durable-objects/game-room/:eventId/ws      │
│ /api/v1/durable-objects/group-room/:groupId/ws     │
│           ↓                                         │
│ ┌──────────────────┬─────────────────────────────┐ │
│ │ GameRoom DO      │ GroupRoom DO                │ │
│ │ Broadcasting...  │ Broadcasting...             │ │
│ │ ↓                │ ↓                           │ │
│ │ game_state_      │ leaderboard_update         │ │
│ │ update (2s)      │ (30s)                       │ │
│ └──────────────────┴─────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## Common Issues & Solutions

### WebSocket Won't Connect
**Problem:** Browser shows 'ws' request failing with 403/404
**Solution:**
- Check VITE_API_URL environment variable
- Verify worker is running: `wrangler dev`
- Check CORS settings in wrangler.toml

### Messages Arriving Out of Order
**Problem:** Client receives leaderboard update before initial state
**Solution:**
- This is expected! Use message.type to handle both flows:
  ```typescript
  if (message.type === 'initial_leaderboard' || message.type === 'leaderboard_update') {
    setEntries(message.data)
  }
  ```

### High Memory Usage on Dashboard
**Problem:** WebSocket context holding too much state
**Solution:**
- Implement message deduplication
- Limit message queue to 100 items: `setMessageQueue(prev => prev.slice(-100))`
- Unsubscribe from WebSocket when component unmounts

### Offline Queue Growing Indefinitely
**Problem:** Messages pile up if network is disconnected long
**Solution:**
- Set max queue size: `if (queue.length > 1000) queue.shift()`
- Show user warning when queue > 100 items
- Implement TTL on queued messages (5 min expiry)

---

## Phase 3 Complete ✅

**Ready for:**
- Integration with game/leaderboard pages
- User acceptance testing
- Load testing with concurrent clients
- Production deployment

**What's Next:**
- Phase 4: Auth hardening + i18n
- Phase 5: Testing + monitoring

---

**Questions?** See `plans/20260320-1400-codebase-analysis-and-improvement/phase-03-websocket.md` for architecture details.
