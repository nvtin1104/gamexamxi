# Phase 5: Testing, Monitoring & Hardening
**Status:** Planning | **Priority:** P2 (quality gate) | **Effort:** 3-4 days

## Overview
Establish testing infrastructure + production monitoring:
1. Unit tests for services/routes
2. Integration tests for auth flows
3. E2E tests for critical user journeys
4. Production monitoring (errors, latency, DO performance)

## Key Insights
- No test files exist yet (no `.test.ts` or `.spec.ts`)
- Services layer is well-isolated (testable)
- Turborepo can run tests in parallel
- Wrangler supports local testing

## Architecture
```
Unit Tests (Jest)
  → Service layer
  → Middleware

Integration Tests (Vitest + @testing-library)
  → Full routes
  → Auth flows
  → DB interactions (test DB)

E2E Tests (Playwright)
  → User journeys
  → Dashboard workflows
```

## Requirements
1. Jest setup for API unit tests
2. Vitest for integration tests
3. Playwright for E2E tests
4. Error tracking (Sentry/Axiom)
5. Performance monitoring (Cloudflare Analytics)
6. Log aggregation (Axiom/Grafana Loki)

## Related Files
- `apps/api/` (new `__tests__/` dir)
- `apps/dashboard/` (new `__tests__/` dir)
- `turbo.json` (add test task)
- `package.json` (add test scripts)

## Implementation Steps
1. Install testing dependencies (Jest, Vitest, Playwright)
2. Setup test config files
3. Write unit tests for PointService
4. Write unit tests for auth middleware
5. Write integration test for `/api/v1/auth/login`
6. Write E2E test for complete sign-up flow
7. Add pre-commit hooks (run tests)
8. Setup CI/CD to run tests on PR
9. Add Sentry error tracking
10. Dashboard Cloudflare Analytics

## Todo Checklist
- [ ] Install Jest + dependencies
- [ ] Install Vitest + dependencies
- [ ] Install Playwright
- [ ] Create test config files
- [ ] Write 5+ unit tests (PointService)
- [ ] Write 3+ integration tests (auth routes)
- [ ] Write 2+ E2E tests (critical flows)
- [ ] Setup Sentry integration
- [ ] Add Cloudflare Analytics dashboard
- [ ] Add pre-commit test hook
- [ ] Add CI/CD test job
- [ ] Achieve 70%+ code coverage

## Success Criteria
- All tests pass locally + in CI
- Test suite runs in < 5 minutes
- Code coverage > 70%
- No failed tests block PRs
- Production errors tracked in Sentry
- DO performance visible in Analytics

## Risk Assessment
**Medium:** Test maintenance overhead → focus on high-risk paths only
**Low:** Local test data conflicts → use isolated test fixtures
**Low:** E2E flakiness → add retry logic + explicit waits

## Security Considerations
- Test DB contains dummy data → ensure separate from prod
- Test API keys in .env.test → don't commit secrets
- Sentry samples PII in errors → sanitize before sending
- E2E tests may hit real auth flow → use test account

## Next Steps
1. Setup Jest + basic config
2. Write unit test for PointService.addPoints()
3. Write integration test for /auth/login
4. Get team feedback on test strategy
5. Code review test implementation
6. Add to CI/CD pipeline
7. Plan QA + load testing

## Deployment Checklist
Before production release:
- [ ] All tests passing (unit + integration + E2E)
- [ ] Code coverage > 70%
- [ ] Sentry configured + alerts set
- [ ] Analytics dashboard created
- [ ] Load test (1000+ concurrent users)
- [ ] Security audit complete
- [ ] Staging deployment successful
- [ ] Rollback plan documented
