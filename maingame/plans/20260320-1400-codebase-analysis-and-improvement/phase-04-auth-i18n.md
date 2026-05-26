# Phase 4: Auth Hardening & Internationalization
**Status:** Planning | **Priority:** P2 (UX polish) | **Effort:** 3-4 days

## Overview
1. Replace hardcoded Vietnamese error messages with i18n
2. Add per-user rate limiting
3. Improve token refresh logic
4. Add logout/revocation

## Key Insights
- Auth errors currently hardcoded in Vietnamese
- No i18n framework yet
- Rate limiting only at global level (all users share quota)
- Token refresh works but could be more robust

## Architecture
```
Error → i18n lookup → localized message → client
Rate limiter → per-user bucket → 429 response
Token → JWT claims → expiry check → refresh flow
```

## Requirements
1. i18n framework (react-i18next + i18n backend)
2. Per-user rate limit (Redis-style, KV-based)
3. Token revocation list (KV cache)
4. Session logout (KV clear)
5. Refresh token rotation

## Related Files
- `apps/api/src/middleware/auth.ts` (error messages, rate limit)
- `apps/dashboard/src/` (i18n setup)
- `apps/website/src/` (i18n setup)
- `apps/api/src/services/auth.service.ts` (token logic)

## Implementation Steps
1. Create translation files (en, vi)
2. Setup react-i18next in dashboard
3. Replace hardcoded strings with i18n keys
4. Implement per-user rate limiter (using KV)
5. Add rate limit header responses
6. Implement token revocation check
7. Add session logout endpoint
8. Test multi-language error flows

## Todo Checklist
- [ ] Create i18n locale files (en, vi, others)
- [ ] Setup i18next in dashboard
- [ ] Setup i18next in website
- [ ] Replace error messages with i18n keys
- [ ] Implement per-user rate limit middleware
- [ ] Add rate limit response headers
- [ ] Implement logout endpoint
- [ ] Add token revocation KV check
- [ ] Test i18n language switching
- [ ] Test rate limit enforcement

## Success Criteria
- All error messages localizable
- Dashboard displays correct language based on browser locale
- Rate limit: 100 requests/minute per user
- Logout invalidates token immediately
- Token refresh seamless on 401

## Risk Assessment
**Medium:** i18n library size → tree-shake unused locales
**Low:** Rate limit key collisions → use user ID + endpoint combo
**Low:** Token revocation KV cache → set short TTL

## Security Considerations
- i18n files may expose error detail → keep messages generic
- Rate limit bypass via IP spoofing → add user-agent verification
- Token revocation adds latency → cache invalidation (5 min)

## Next Steps
1. Design i18n file structure
2. Create translations for auth + validation errors
3. Setup i18next in dashboard
4. Implement per-user rate limit
5. Code review internationalization
6. Move to Phase 5 (Testing & Monitoring)
