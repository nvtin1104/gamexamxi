# Minigame Prediction Platform — Implementation Plan
*Created: 2026-02-25 | Priority: HIGH*

## Overview
Transform existing Cloudflare Worker template into a full Cloudflare-native monorepo with:
- **Backend**: Hono.js on CF Workers + D1 + KV + Durable Objects + Queues + R2
- **Frontend**: Next.js 14 with Neo-Brutalism design on CF Pages
- **Monorepo**: Turborepo + pnpm workspaces

## Phases

| # | Phase | Status | File |
|---|-------|--------|------|
| 01 | Monorepo Setup | ✅ Done | Turborepo + pnpm workspaces |
| 02 | Database Schema | ✅ Done | Drizzle + D1 migrations |
| 03 | Worker Backend | ✅ Done | Hono.js + DOs + Queues + R2 |
| 04 | Frontend Web App | ✅ Done | Next.js 14 + Neo-Brutalism |
| 05 | CI/CD & Docs | ✅ Done | GitHub Actions workflow |

## Key Decisions
- Password hashing: `@noble/hashes` (scrypt) — bcryptjs NOT edge-compatible
- JWT: `jose` v5 (edge-native)
- Next.js deploy: `@cloudflare/next-on-pages`
- ORM: Drizzle v0.28+ with D1 adapter
- wrangler.json format (not .toml — project already uses JSON)
