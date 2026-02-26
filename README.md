# GameXamXi — Minigame Prediction Platform

> Full-stack Cloudflare-native prediction game. Dự đoán kết quả, kiếm điểm, so tài với bạn bè.

**Stack**: Cloudflare Workers + D1 + KV + Durable Objects + Queues + R2 · Hono.js · Next.js 14 · Drizzle ORM · Turborepo

---

## Yêu Cầu

| Tool | Version |
|------|---------|
| Node.js | ≥ 20 |
| pnpm | ≥ 9 |
| Wrangler CLI | ≥ 4 (có trong devDeps) |
| Tài khoản Cloudflare | Free tier là đủ |

---

## 1. Cài Đặt

```bash
# Clone & cài dependencies
git clone <repo-url> gamexamxi
cd gamexamxi
pnpm install
```

---

> 📖 **Xem hướng dẫn đầy đủ tại [DEPLOY.md](./DEPLOY.md)** — bao gồm local dev, deploy production, và troubleshooting Windows.

---

## 2. Chạy Local (Dev)

### Bước 2.1 — Đăng nhập Cloudflare

```bash
pnpm --filter @gamexamxi/worker exec wrangler login
```

### Bước 2.2 — Apply migration database local

```bash
pnpm --filter @gamexamxi/worker exec wrangler d1 migrations apply gamexamxi-db --local
```

> Lần đầu chạy lệnh này sẽ tạo SQLite local tại `.wrangler/state/v3/d1/`.

### Bước 2.3 — Tạo file `.dev.vars` cho Worker

```bash
# apps/worker/.dev.vars
cat > apps/worker/.dev.vars << 'EOF'
JWT_SECRET=dev-secret-change-in-production-min-32-chars
RESEND_API_KEY=re_placeholder_not_needed_for_dev
EOF
```

### Bước 2.4 — Chạy Worker

```bash
pnpm --filter @gamexamxi/worker dev
# Worker chạy tại: http://localhost:8787
```

### Bước 2.5 — Tạo `.env.local` cho Web

```bash
cat > apps/web/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_WS_URL=ws://localhost:8787
EOF
```

### Bước 2.6 — Chạy Web App

```bash
# Terminal mới
pnpm --filter @gamexamxi/web dev
# Web chạy tại: http://localhost:3000
```

### Chạy cả hai cùng lúc (nếu dùng tmux/parallel)

```bash
# Cài concurrently nếu chưa có
pnpm add -Dw concurrently

# Chạy song song
pnpm --filter @gamexamxi/worker dev &
pnpm --filter @gamexamxi/web dev
```

---

## 3. Thiết Lập Cloudflare (Lần Đầu Deploy)

> Chỉ cần làm một lần. Sau đó CI/CD tự động.

### Bước 3.1 — Tạo KV Namespaces

```bash
cd apps/worker

pnpm exec wrangler kv namespace create KV_SESSIONS
pnpm exec wrangler kv namespace create KV_CACHE
pnpm exec wrangler kv namespace create KV_LEADERBOARD
pnpm exec wrangler kv namespace create KV_RATELIMIT
```

Mỗi lệnh sẽ in ra ID. Ví dụ:
```
✅ Created namespace "KV_SESSIONS" with ID "abc123..."
```

Cũng tạo preview IDs cho local dev:
```bash
pnpm exec wrangler kv namespace create KV_SESSIONS --preview
pnpm exec wrangler kv namespace create KV_CACHE --preview
pnpm exec wrangler kv namespace create KV_LEADERBOARD --preview
pnpm exec wrangler kv namespace create KV_RATELIMIT --preview
```

### Bước 3.2 — Cập nhật `apps/worker/wrangler.json`

Thay các giá trị `REPLACE_*` bằng IDs thực:

```json
"kv_namespaces": [
  {
    "binding": "KV_SESSIONS",
    "id": "abc123...",          // ← ID từ bước 3.1
    "preview_id": "xyz789..."   // ← Preview ID từ bước 3.1
  },
  ...
]
```

### Bước 3.3 — Tạo R2 Bucket

```bash
pnpm exec wrangler r2 bucket create gamexamxi-media
```

### Bước 3.4 — Tạo Queues

```bash
pnpm exec wrangler queues create points-queue
pnpm exec wrangler queues create achievements-queue
pnpm exec wrangler queues create notifications-queue
pnpm exec wrangler queues create points-dlq  # dead letter queue
```

### Bước 3.5 — Set Secrets

```bash
# Nhập khi được hỏi (không lưu vào file)
pnpm exec wrangler secret put JWT_SECRET
# → Nhập: một chuỗi ngẫu nhiên ≥ 32 ký tự (dùng: openssl rand -base64 32)

pnpm exec wrangler secret put RESEND_API_KEY
# → Nhập: API key từ https://resend.com (free 3000 emails/month)
```

---

## 4. Deploy

### Deploy Worker

```bash
# Apply migration lên D1 production trước
pnpm --filter @gamexamxi/worker exec wrangler d1 migrations apply gamexamxi-db --remote

# Deploy Worker
pnpm --filter @gamexamxi/worker exec wrangler deploy
```

Output sẽ cho URL dạng:
```
https://gamexamxi-api.<subdomain>.workers.dev
```

### Deploy Frontend lên Cloudflare Pages

**Cách 1 — Wrangler CLI:**

```bash
# Build trước
NEXT_PUBLIC_API_URL=https://gamexamxi-api.<subdomain>.workers.dev \
NEXT_PUBLIC_WS_URL=wss://gamexamxi-api.<subdomain>.workers.dev \
pnpm --filter @gamexamxi/web build

# Deploy lên Pages
pnpm --filter @gamexamxi/web exec wrangler pages deploy .next \
  --project-name=gamexamxi-web
```

**Cách 2 — Cloudflare Dashboard (khuyên dùng lần đầu):**

1. Vào [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create**
2. Chọn **Pages** → **Connect to Git**
3. Chọn repo → Framework: **Next.js**
4. Build settings:
   - **Build command**: `cd apps/web && pnpm build`
   - **Build output directory**: `apps/web/.next`
   - **Root directory**: `/` (root của monorepo)
5. **Environment variables**:
   ```
   NEXT_PUBLIC_API_URL = https://gamexamxi-api.<subdomain>.workers.dev
   NEXT_PUBLIC_WS_URL  = wss://gamexamxi-api.<subdomain>.workers.dev
   NODE_VERSION        = 20
   ```

---

## 5. CI/CD Tự Động (GitHub Actions)

Sau khi setup lần đầu, mọi push lên `main` sẽ tự deploy.

### Bước 5.1 — Lấy Cloudflare API Token

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **My Profile** → **API Tokens**
2. **Create Token** → template **Edit Cloudflare Workers**
3. Thêm quyền: `D1:Edit`, `Pages:Edit`, `Workers KV Storage:Edit`
4. Copy token

### Bước 5.2 — Thêm Secrets vào GitHub

Vào **Settings** → **Secrets and variables** → **Actions**:

| Secret | Giá trị |
|--------|---------|
| `CF_API_TOKEN` | Token từ bước 5.1 |
| `CF_ACCOUNT_ID` | Cloudflare Account ID (trong Dashboard URL) |
| `NEXT_PUBLIC_API_URL` | `https://gamexamxi-api.<subdomain>.workers.dev` |
| `NEXT_PUBLIC_WS_URL` | `wss://gamexamxi-api.<subdomain>.workers.dev` |

### Workflow

```
push → main
  ├── type-check (tsc)
  ├── deploy-worker (wrangler deploy)
  └── deploy-pages (cloudflare/pages-action)
```

---

## 6. Cấu Trúc Dự Án

```
gamexamxi/
├── apps/
│   ├── worker/               # Cloudflare Worker — API backend
│   │   ├── src/
│   │   │   ├── index.ts      # Entry point (Hono app + queue handler)
│   │   │   ├── routes/       # auth, games, groups, shop, users, quests
│   │   │   ├── durable-objects/  # GameRoom, GroupRoom, PointsLedger
│   │   │   ├── queue-handlers/   # points, achievements, notifications
│   │   │   ├── middleware/   # auth (JWT), ratelimit (KV)
│   │   │   └── lib/          # db, kv, auth, analytics, utils
│   │   └── wrangler.json
│   │
│   └── web/                  # Next.js 14 — Frontend
│       └── src/
│           ├── app/          # App Router pages
│           ├── components/   # UI components (Neo-Brutalism)
│           ├── lib/          # api client, realtime WS
│           └── store/        # Zustand auth store
│
├── packages/
│   ├── db/                   # Drizzle schema + D1 migrations
│   └── shared/               # Types & constants dùng chung
│
├── .github/workflows/deploy.yml
├── turbo.json
└── pnpm-workspace.yaml
```

---

## 7. API Endpoints

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/api/auth/register` | ❌ | Đăng ký |
| POST | `/api/auth/login` | ❌ | Đăng nhập |
| POST | `/api/auth/logout` | ✅ | Đăng xuất |
| GET | `/api/games` | ✅ | Danh sách events |
| POST | `/api/games` | ✅ | Tạo event |
| POST | `/api/games/:id/predict` | ✅ | Gửi dự đoán |
| POST | `/api/games/:id/resolve` | ✅ | Kết thúc event |
| GET | `/api/groups` | ✅ | Groups của tôi |
| POST | `/api/groups` | ✅ | Tạo group |
| POST | `/api/groups/join` | ✅ | Tham gia bằng invite code |
| GET | `/api/shop` | ✅ | Danh sách shop |
| POST | `/api/shop/:id/purchase` | ✅ | Mua item |
| GET | `/api/users/leaderboard/global` | ✅ | Bảng xếp hạng |
| GET | `/ws/game/:eventId` | — | WebSocket live game |
| GET | `/ws/group/:groupId` | — | WebSocket group chat |

---

## 8. Commands Hữu Ích

```bash
# Type check toàn bộ
pnpm --filter @gamexamxi/worker exec tsc --noEmit
pnpm --filter @gamexamxi/web exec tsc --noEmit

# Xem D1 database local
pnpm --filter @gamexamxi/worker exec wrangler d1 execute gamexamxi-db \
  --local --command "SELECT * FROM users LIMIT 10"

# Xem logs Worker trên production
pnpm --filter @gamexamxi/worker exec wrangler tail

# Liệt kê KV keys
pnpm --filter @gamexamxi/worker exec -- wrangler kv key list \
  --namespace-id=<KV_SESSIONS_ID>

# Wrangler dry-run (kiểm tra build không deploy)
pnpm --filter @gamexamxi/worker exec wrangler deploy --dry-run
```

---

## 9. Ước Tính Chi Phí

| Service | Free Tier | Đủ cho |
|---------|-----------|--------|
| Workers | 100k req/day | ~3k users/day |
| D1 | 5GB, 5M rows/day | MVP → 50k users |
| KV | 100k reads, 1k writes/day | MVP |
| Queues | 1M ops/month | MVP |
| R2 | 10GB, 1M ops | ~10k uploads |
| Pages | Unlimited, 500 builds | ✅ |
| Durable Objects | $0.15/1M req | Pay-as-you-go |

> **Paid plan $5/month** mở rộng Workers lên 10M req/month — đủ cho ~300k users/month.

---

## Troubleshooting

**`wrangler: command not found`**
```bash
pnpm install  # cài lại dependencies
```

**`KV namespace not found`**
→ Chưa cập nhật IDs trong `apps/worker/wrangler.json` sau bước 3.2.

**CORS error khi gọi API từ web**
→ Thêm origin của Pages vào danh sách allowed origins trong `apps/worker/src/index.ts`.

**WebSocket không connect được local**
→ Đảm bảo Worker đang chạy tại `localhost:8787` và `.env.local` có `NEXT_PUBLIC_WS_URL=ws://localhost:8787`.

**D1 migration failed**
```bash
# Reset local DB
rm -rf apps/worker/.wrangler/state/v3/d1/
pnpm --filter @gamexamxi/worker exec wrangler d1 migrations apply gamexamxi-db --local
```
