# Phase 1: Enable Cloudflare Queues Infrastructure
**Status:** Planning | **Priority:** P1 (blocks async workflows) | **Effort:** 2-3 days

## Overview
Enable Cloudflare Queues and implement consumers for:
- **points-queue**: User point transactions
- **achievements-queue**: Achievement unlocks
- **notifications-queue**: User notifications

Currently disabled in `wrangler.toml`. Need to create queues, implement consumer handlers, integrate with services.

## Key Insights
- Memory mentions 3 queues but wrangler.toml has them commented out
- No queue consumer code exists yet
- Points service exists but doesn't produce to queue
- Need idempotent handlers (Queues retry up to 30 days)

## Architecture
```
API Route (POST /api/v1/points)
  → Point Service
    → Queue Producer (append message)
      → Consumer Handler (async)
        → Process transaction
        → Update DB
        → Trigger achievements
```

## Requirements
1. Create 3 queue bindings in wrangler.toml
2. Implement producer calls in Point, Achievement, Notification services
3. Implement consumer handlers
4. Add retry + dead-letter logic
5. Error tracking (Sentry/Grafana)

## Related Files
- `apps/api/src/services/point.service.ts` (producer)
- `apps/api/src/services/index.ts` (service exports)
- `apps/api/wrangler.toml` (queue config)
- `apps/api/src/types/bindings.ts` (Bindings interface)

## Implementation Steps
1. Uncomment queue config in wrangler.toml + update env vars
2. Create queues: `wrangler queues create points-queue`
3. Add queue bindings to Bindings type
4. Modify PointService.addPoints() to call producer
5. Implement consumer handler in `apps/api/src/consumers/points.consumer.ts`
6. Wire consumer in index.ts
7. Test with local dev queue

## Todo Checklist
- [ ] Create queue bindings in wrangler.toml
- [ ] Run `wrangler queues create` for all 3 queues
- [ ] Update Bindings type interface
- [ ] Add producer to PointService.addPoints()
- [ ] Implement PointsConsumer handler
- [ ] Add error tracking & dead-letter
- [ ] Integration test queue flow
- [ ] Deploy and verify production

## Success Criteria
- Points added via API get dequeued within 5 seconds
- Failed messages move to dead-letter after max retries
- No data loss on consumer restarts
- Consumer processes 1000+ messages/min

## Risk Assessment
**High:** Queue message ordering not guaranteed → implement idempotent keys
**Medium:** Consumer crashes lose in-flight messages → add checkpointing
**Low:** Queue quota limits → monitor message count

## Security Considerations
- Queue payloads unencrypted at rest → avoid PII in messages
- Consumer error logs may leak user data → sanitize before logging
- Dead-letter queue accessible by all workers → restrict access if needed

## Next Steps
1. Create wrangler.toml queue config
2. Run local queue tests
3. Code review consumer implementation
4. Deploy to staging → verify under load
5. Move to Phase 2 (Durable Objects)
