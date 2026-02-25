# Code Review Summary — Google OAuth Implementation

**Date:** 2026-02-25
**Reviewer:** code-reviewer subagent
**Branch:** main

---

## Scope

- Files reviewed: 5 target files + 2 supporting files
- `apps/worker/src/routes/auth.ts` (lines 192–335, OAuth section; full file for context)
- `apps/worker/src/types.ts`
- `apps/web/src/app/(auth)/login/page.tsx`
- `apps/web/src/app/(auth)/callback/page.tsx`
- `apps/web/src/lib/api.ts`
- `apps/worker/src/lib/auth.ts` (sanitizeUser, JWT)
- `apps/worker/src/lib/kv.ts` (session and oauth_state helpers)
- Review focus: security, correctness, edge cases, React practices

---

## Overall Assessment

The OAuth flow is structurally sound. CSRF state is generated server-side, stored in KV, verified on callback, and deleted after use — the happy path is correct. The useRef one-time guard in the callback page is properly applied. However, three issues are blockers before production: the code parameter is forwarded to the backend without any length/format guard (injection surface), the status check for suspended accounts fires AFTER ggId/avatar writes on the existing-user path (data mutation before authorization check), and the `email_verified` field from Google's userinfo endpoint can be absent or `false` in edge cases that are handled but only for the `false` case — the absent-field case (typed as `boolean | undefined`) evaluates falsy correctly, so that specific sub-case is fine. Details below.

---

## Critical Issues

### C1 — Authorization check fires after DB writes for existing users

**File:** `apps/worker/src/routes/auth.ts`, lines 313–324

**Problem:** When an existing user is found, the route optionally writes `ggId` and `avatar` back to the database (lines 315–321) before checking `user.status !== 'active'` (line 324). A suspended user who hits Google OAuth will have their `ggId` and avatar silently updated in the DB before the 403 is returned. This is a privilege-escalation-adjacent issue: an admin who has suspended the account cannot prevent the account from having its Google link written.

**Current code:**
```ts
} else {
  if (!user.ggId) {
    await db.update(users).set({ ggId: profile.sub }).where(eq(users.id, user.id))
  }
  if (!user.avatar && profile.picture) {
    await db.update(users).set({ avatar: profile.picture }).where(eq(users.id, user.id))
  }
}

if (user.status !== 'active') {           // <-- too late
  return c.json({ error: 'Account suspended or banned', ok: false }, 403)
}
```

**Fix:** Move the status check to immediately after `user` is resolved (before the `if (!user)` branch), or at minimum before the `else` block that writes ggId/avatar.

```ts
// After: let user = await db.query.users.findFirst(...)
if (user && user.status !== 'active') {
  return c.json({ error: 'Account suspended or banned', ok: false }, 403)
}

if (!user) {
  // ... create new user
} else {
  // ... link ggId / avatar (now safe, user is active)
}
```

---

### C2 — `code` parameter forwarded to Google token endpoint with no validation

**File:** `apps/worker/src/routes/auth.ts`, lines 216–239

**Problem:** The `code` value received from the frontend (which received it from the browser URL bar via Google redirect) is passed directly into the token exchange body with only `z.string()` validation — no length cap, no format check. Google authorization codes are short alphanumeric strings (typically ~60 chars). Accepting arbitrarily long strings creates a denial-of-service vector where a crafted request forces a large `application/x-www-form-urlencoded` body upstream. More importantly, if the token endpoint ever parses the body differently (unlikely but not impossible), this is an unguarded injection point.

**Fix:** Add a maxLength constraint to the Zod schema:

```ts
authRouter.post('/google/callback', zValidator('json', z.object({
  code: z.string().max(512),   // Google codes are ~60 chars; 512 is generous
  state: z.string().uuid(),    // state was generated as crypto.randomUUID()
})), ...)
```

Enforcing `z.string().uuid()` on state also closes a theoretical path where a crafted non-UUID state string could create unusual KV key patterns (currently harmless given the `oauth_state:` prefix, but good hygiene).

---

## High Priority Findings

### H1 — Race condition in username uniqueness loop

**File:** `apps/worker/src/routes/auth.ts`, lines 284–289

**Problem:** Username uniqueness is checked with a `while` loop of sequential DB reads, then the insert happens outside the loop with no unique-constraint retry. Between the last `findFirst` and the `insert`, another concurrent request could claim the same username, causing a unique constraint violation (unhandled 500).

```ts
while (await db.query.users.findFirst({ where: eq(users.username, username) })) {
  attempt++
  username = `${base.slice(0, 13)}_${attempt.toString().padStart(2, '0')}`
}
// <-- another request could insert `username` here
const [created] = await db.insert(users).values({ username, ... }).returning()
if (!created) return c.json({ error: 'Failed to create user', ok: false }, 500)
```

This "failed to create" check (`if (!created)`) does not catch a constraint violation — Drizzle will throw, not return an empty array. The unhandled exception will propagate as a 500 with a stack trace (depending on Hono error handler).

**Fix:** Wrap the insert in try/catch for unique constraint errors and retry with a new suffix, or — simpler — append a random 4-char hex suffix instead of sequential counters so collision probability is negligible, then catch and surface a proper error.

---

### H2 — `email_verified` check is bypassable if Google returns the field as a string

**File:** `apps/worker/src/routes/auth.ts`, line 266

```ts
if (!profile.email_verified) {
```

The userinfo v3 endpoint returns `email_verified` as a boolean in JSON. The typed definition `email_verified?: boolean` is correct. However if for any reason the response is parsed from an older endpoint that returned `"true"` as a string, the falsy check would pass (`!"true"` === `false`). This is low-probability but worth noting: prefer an explicit check:

```ts
if (profile.email_verified !== true) {
```

---

### H3 — Token stored in KV but session key is the raw JWT (no hashing)

**File:** `apps/worker/src/lib/kv.ts`, line 6

```ts
session: (token: string) => `session:${token}`,
```

The session KV key is `session:<raw_jwt>`. If KV key enumeration were ever possible (e.g., via a misconfigured admin tool or future Cloudflare feature), raw JWTs would be directly exposed as keys. A more robust approach is to use `session:<sha256(token)>` as the key so the KV namespace itself leaks no usable tokens. This is a defense-in-depth concern, not an active vulnerability.

---

## Medium Priority Improvements

### M1 — `googleUrl()` state is stored in `KV_SESSIONS` namespace

**File:** `apps/worker/src/routes/auth.ts`, line 198
**File:** `apps/worker/src/lib/kv.ts`, line 31

The oauth state key `oauth_state:<uuid>` is stored in `KV_SESSIONS` (which also holds session tokens). It should logically be in `KV_CACHE` or a dedicated namespace to keep concerns separated. The `KVKeys.oauthState` helper exists in `kv.ts` but is not used in `auth.ts` — the route uses an inline string `oauth_state:${state}` instead of calling `KVKeys.oauthState(state)`. This is a consistency gap.

**Fix:** Replace the two inline `oauth_state:${state}` / `` `oauth_state:${state}` `` strings with `KVKeys.oauthState(state)`.

---

### M2 — Login streak applied to suspended users on the regular `/login` path

**File:** `apps/worker/src/routes/auth.ts`, lines 143–147

The `/login` route checks `status !== 'active'` at line 143 and returns 403 — correctly placed. But compare to the Google callback (C1 above): the pattern is inconsistent. The `/login` route checks status first; the Google callback checks it last. Unifying the pattern makes the code easier to audit.

---

### M3 — New Google user does not get `applyLoginStreak` until after being created

This is by design (first login, no streak yet), but `applyLoginStreak` is called unconditionally after both the new-user and existing-user paths (line 328). For a brand new user `loginStreak` will be `0` and `lastLoginAt` will be `null`, so `newStreak` becomes `1` and `bonus = calculateLoginBonus(1)`. This is correct behavior, just worth documenting with a comment since it looks like it might fire twice on first login.

---

### M4 — `callback/page.tsx` useEffect dependency array includes `setAuth`

**File:** `apps/web/src/app/(auth)/callback/page.tsx`, line 35

```ts
}, [searchParams, router, setAuth])
```

`setAuth` from a Zustand store selector is a stable reference (Zustand guarantees this), so including it in the dep array is harmless but unnecessary. The `useRef` guard (`called.current`) correctly prevents re-execution regardless of dep changes — the guard is the true protection. The dep array concern is cosmetic.

---

### M5 — Open redirect not possible but worth confirming

After successful Google OAuth, the app redirects to `router.replace('/')` — hardcoded. There is no `redirect_to` query param processed on the callback page, so open redirect is not a concern here. Confirming this is a positive finding.

---

## Low Priority Suggestions

### L1 — `GOOGLE_REDIRECT_URI` typed as plain `string`, not validated at startup

**File:** `apps/worker/src/types.ts`, line 30

`GOOGLE_REDIRECT_URI` is a `string` in `Env`. If misconfigured (e.g., non-HTTPS in production), Google will reject the code exchange silently. Adding a startup validation log or an assertion that the URI starts with `https://` in non-dev environments would catch misconfiguration early.

---

### L2 — `googleUrl` fetch in `login/page.tsx` does not validate the returned URL

**File:** `apps/web/src/app/(auth)/login/page.tsx`, line 51

```ts
window.location.href = url
```

The `url` value comes from the worker's `/api/auth/google` endpoint. If the worker is compromised or returns a crafted URL, the browser would follow it. In practice this is a trusted internal API, but a `url.startsWith('https://accounts.google.com/')` check on the client before assigning `window.location.href` would make the client a secondary defense.

---

### L3 — `sanitizeUser` exposes `ggId` to API consumers

**File:** `apps/worker/src/lib/auth.ts`, line 76

`sanitizeUser` strips `password` but returns `ggId` in the response. Google's sub ID is a stable unique identifier for the user's Google account. Exposing it in API responses means any API consumer (or XSS attacker) can learn the user's Google sub ID. Consider omitting it alongside `password`.

---

## Positive Observations

- CSRF state is generated with `crypto.randomUUID()` (cryptographically strong), stored in KV with 10-minute TTL, deleted immediately after single use. This is textbook correct.
- State verified before code exchange — no code exchange happens with an invalid state.
- `email_verified` check correctly rejects unverified Google accounts.
- `useRef(false)` guard in callback page correctly prevents double-invocation under React Strict Mode.
- `ggId`-or-email lookup (`or(eq(users.ggId, profile.sub), eq(users.email, profile.email))`) handles account merging cleanly.
- `sanitizeUser` strips `password` before returning user object.
- Welcome bonus only fires for genuinely new users (inside the `if (!user)` branch).
- KV oauth state uses a dedicated key prefix consistent with `KVKeys.oauthState`, even if that helper isn't called directly.
- Username generation caps at 16 chars and strips leading/trailing underscores.

---

## Recommended Actions (Prioritized)

1. **[BLOCKER — C1]** Move `user.status !== 'active'` check to before the `ggId`/avatar update block on the existing-user path.
2. **[BLOCKER — C2]** Add `z.string().max(512)` to `code` and `z.string().uuid()` to `state` in the callback Zod schema.
3. **[HIGH — H1]** Wrap the `db.insert(users)` in the new-user path in a try/catch for unique constraint violations; add a retry or use a random suffix to reduce collision probability.
4. **[HIGH — H2]** Change `if (!profile.email_verified)` to `if (profile.email_verified !== true)`.
5. **[MEDIUM — M1]** Replace inline `oauth_state:${state}` strings with `KVKeys.oauthState(state)` for consistency.
6. **[LOW — L3]** Omit `ggId` from `sanitizeUser` return value.
7. **[LOW — L2]** Add a URL prefix check before assigning `window.location.href = url` in the login page.

---

## Metrics

- Type Coverage: `Env` type complete for OAuth fields; callback Zod schema weak (see C2)
- Test Coverage: Not assessed (no test files found for auth routes)
- Linting Issues: 0 identified (code is syntactically clean)
- Security Issues: 2 critical, 2 high, 1 medium

---

## Unresolved Questions

- Is there a Hono global error handler that catches unhandled Drizzle unique constraint exceptions (H1)? If not, the 500 response may leak a DB error message.
- `GOOGLE_REDIRECT_URI` — is this validated anywhere in the wrangler.json or startup code to enforce HTTPS in production?
