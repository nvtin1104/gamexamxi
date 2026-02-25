# Google OAuth 2.0 for Cloudflare Workers + Next.js 14
**Date:** 2026-02-25 | **Scope:** Library evaluation, flow design, security patterns

---

## Executive Summary

**Recommendation:** Use **Arctic v3** library + PKCE + state for production. Arctic is lightweight, runtime-agnostic, explicit PKCE support, and requires zero Web Crypto polyfills on Workers. @hono/oauth-providers is simpler but less explicit about security. Manual approach only if minimal dependencies critical.

---

## 1. OAuth Libraries Comparison

| Library | Pros | Cons | Best For |
|---------|------|------|----------|
| **Arctic v3** | PKCE native, typed, no polyfills, ~5KB | Separate state/verifier storage | Production with full control |
| **@hono/oauth-providers** | Hono-integrated, minimal setup, built-in middleware | Less explicit on PKCE details, hidden state mgmt | Rapid prototyping, Hono-focused stacks |
| **Manual (jose + crypto)** | Full transparency, no deps | Verbose, more error surface | Learning/audit-critical scenarios |

**Winner:** Arctic. Cloudflare endorses it; explicit security model; no edge runtime surprises.

---

## 2. Recommended Flow: Browser → Next.js → Worker → Google

```
┌─────────────┐
│  Next.js 14 │ (origin: app.example.com)
│  Frontend   │
└──────┬──────┘
       │ POST /api/auth/initiate
       ▼
┌─────────────────────────┐
│  Cloudflare Worker      │ (origin: api.example.com)
│  Hono + Arctic          │
│                         │
│ POST /auth/initiate     │──────────────────────────┐
│ - Generate state+PKCE   │                          │
│ - Store in KV           │                          │
│ - Return authURL        │                          │
│                         │                          │
│ GET /auth/callback?code │◄─────────────────────────┘
│ - Validate state        │     Google redirects with code
│ - Exchange code→token   │     to api.example.com/auth/callback
│ - Create JWT            │
│ - Set secure HTTP-only  │
│   cookie + KV session   │
└─────────────────────────┘
       │
       │ redirect to app.example.com
       ▼
┌─────────────┐
│  Next.js    │ authenticated
└─────────────┘
```

**Key Points:**
- Worker handles OAuth flow (backend-to-backend)
- Frontend never sees auth codes or tokens
- PKCE protects against code interception
- State prevents CSRF
- JWT + KV session for subsequent requests

---

## 3. Code Patterns (Condensed)

### Worker: Initialize OAuth
```typescript
import { Google } from 'arctic';
import { generateState, generateCodeVerifier } from 'arctic';

const google = new Google(CLIENT_ID, CLIENT_SECRET, 'https://api.example.com/auth/callback');

export async function initializeOAuth(c: Context) {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  await c.env.KV.put(
    `oauth:${state}`,
    JSON.stringify({ codeVerifier, createdAt: Date.now() }),
    { expirationTtl: 600 } // 10 min
  );

  const authUrl = google.createAuthorizationURL(state, ['openid', 'email', 'profile']);
  return c.json({ authUrl });
}
```

### Worker: Handle Callback
```typescript
export async function handleCallback(c: Context) {
  const code = c.req.query('code');
  const state = c.req.query('state');

  const stored = await c.env.KV.get(`oauth:${state}`);
  if (!stored) return c.json({ error: 'Invalid state' }, 400);

  const { codeVerifier } = JSON.parse(stored);
  const tokens = await google.validateAuthorizationCode(code, codeVerifier);

  const claims = decodeIdToken(tokens.idToken()); // extract user
  const jwt = await signJWT(claims, c.env.JWT_SECRET);

  // Store session in KV
  await c.env.KV.put(`session:${jwt}`, JSON.stringify(claims), { expirationTtl: 86400 });

  // Set secure cookie + redirect
  return c.json({ jwt },
    { headers: { 'Set-Cookie': `auth=${jwt}; HttpOnly; Secure; Path=/; Max-Age=86400` } }
  );
}
```

### Next.js: Fetch Auth URL
```typescript
// app/auth/page.tsx
const res = await fetch('https://api.example.com/auth/initiate', { method: 'POST' });
const { authUrl } = await res.json();
window.location.href = authUrl; // Redirect to Google
```

---

## 4. PKCE vs State: Both Required

| Feature | State | PKCE |
|---------|-------|------|
| **Prevents** | CSRF, XSS redirect hijack | Authorization code theft (man-in-middle) |
| **How** | Random echo check | Crypto challenge-response |
| **For** | All OAuth flows | SPAs + native apps (recommended for all) |

**Pattern:** Generate both, store both in KV with state key, validate both on callback.

Arctic handles both transparently:
```typescript
const state = generateState(); // CSRF
const verifier = generateCodeVerifier(); // PKCE
const url = google.createAuthorizationURL(state, scopes);
// ^^ includes code_challenge internally
```

---

## 5. Security Checklist

✓ **State validation:** Compare request state vs KV-stored state
✓ **PKCE:** Arctic generates code_challenge from verifier
✓ **Code expiry:** State/verifier stored with 10min TTL
✓ **Token storage:** Server-side KV + HttpOnly cookie (never localStorage)
✓ **JWT secret:** In wrangler secret (not code)
✓ **Redirect URI whitelist:** Register only `https://api.example.com/auth/callback` in Google Console
✓ **CORS:** Worker explicitly allows POST /auth/initiate from `https://app.example.com`

---

## 6. Redirect URI Across Domains

**Setup in Google Cloud Console:**
- Authorized redirect URI: `https://api.example.com/auth/callback` (Worker origin)

**Flow:**
1. Next.js (app.example.com) initiates on Worker (api.example.com)
2. Worker redirects user to `https://accounts.google.com/o/oauth2/v2/auth?...`
3. Google redirects back to `https://api.example.com/auth/callback?code=...`
4. Worker processes, sets cookie, redirects to `https://app.example.com/dashboard`

No mismatch error: Google only knows about Worker's callback URI. Frontend never appears in OAuth flow.

---

## 7. Implementation Path

1. **Install Arctic:** `pnpm add arctic jose` (in worker package)
2. **Add KV namespace:** `wrangler kv:namespace create KV_SESSIONS --preview false`
3. **Update wrangler.json:** Add KV binding + JWT_SECRET env var
4. **Create routes:** POST /auth/initiate, GET /auth/callback
5. **Next.js integration:** Fetch /auth/initiate, redirect to authUrl
6. **Test locally:** `wrangler dev` + ngrok for callback (or use Wrangler OAuth shortcuts)

---

## Unresolved Questions
- Token refresh: Should Google refresh_token be stored in KV? (Likely yes for long sessions)
- CORS preflight: Does OPTIONS /auth/initiate need explicit handling?
- Production monitoring: How to log OAuth failures without exposing tokens?

---

## Sources
- [Arctic v3 documentation](https://arcticjs.dev/)
- [Arctic Google provider docs](https://arcticjs.dev/providers/google)
- [Arctic OAuth 2.0 with PKCE guide](https://arcticjs.dev/guides/oauth2-pkce)
- [@hono/oauth-providers - npm](https://www.npmjs.com/package/@hono/oauth-providers)
- [Google OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Demystifying OAuth Security: State vs. Nonce vs. PKCE](https://auth0.com/blog/demystifying-oauth-security-state-vs-nonce-vs-pkce/)
- [Bringing OAuth 2.0 to Wrangler - Cloudflare Blog](https://blog.cloudflare.com/wrangler-oauth/)
- [Protecting APIs with JWT Validation - Cloudflare Blog](https://blog.cloudflare.com/protecting-apis-with-jwt-validation/)
- [OAuth Auth Server through Workers - Cloudflare Blog](https://blog.cloudflare.com/oauth-2-0-authentication-server/)
- [GitHub: cloudflare/workers-oauth-provider](https://github.com/cloudflare/workers-oauth-provider)
- [JWT token storage and KV sessions - Cloudflare Workers docs](https://developers.cloudflare.com/workers/runtime-apis/kv/)
