# GameXamXi — Hướng dẫn Deploy & Local Dev

> Cập nhật: 2026-02-26 · Wrangler ≥ 4.68 · pnpm ≥ 9 · Node ≥ 20

---

## Mục Lục

1. [Yêu cầu](#1-yêu-cầu)
2. [Chạy local dev](#2-chạy-local-dev)
3. [Thiết lập Cloudflare (1 lần duy nhất)](#3-thiết-lập-cloudflare-1-lần-duy-nhất)
4. [Cập nhật wrangler.json](#4-cập-nhật-wranlerjson)
5. [Deploy lên production](#5-deploy-lên-production)
6. [Troubleshooting Windows](#6-troubleshooting-windows)

---

## 1. Yêu cầu

| Tool | Version |
|------|---------|
| Node.js | ≥ 20 |
| pnpm | ≥ 9 |
| Tài khoản Cloudflare | Free tier |

```bash
# Cài dependencies
pnpm install
```

---

## 2. Chạy Local Dev

### 2.1 — Tạo `.dev.vars` cho Worker

Tạo file `apps/worker/.dev.vars` (không commit file này):

```dotenv
JWT_SECRET=dev-secret-change-in-production-min-32-chars
RESEND_API_KEY=re_placeholder_not_needed_for_dev
```

### 2.2 — Apply migration database local

```bash
pnpm --filter @gamexamxi/worker exec -- wrangler login
pnpm --filter @gamexamxi/worker exec -- wrangler d1 migrations apply gamexamxi-db --local
```

> SQLite local được tạo tại `apps/worker/.wrangler/state/v3/d1/`.

### 2.3 — Chạy Worker

```bash
pnpm --filter @gamexamxi/worker dev
# → http://localhost:8787
```

### 2.4 — Tạo `.env.local` cho Web

```bash
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_WS_URL=ws://localhost:8787
```

### 2.5 — Tạo `.env.local` cho Dashboard

```bash
# apps/dashboard/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8787
```

### 2.6 — Chạy tất cả cùng lúc

```bash
# Từ root monorepo — chạy worker + web + dashboard song song
pnpm dev:all
```

Hoặc từng app riêng:

```bash
pnpm --filter @gamexamxi/worker dev    # port 8787
pnpm --filter @gamexamxi/web dev       # port 3000
pnpm --filter @gamexamxi/dashboard dev # port 3001
```

> **Lưu ý local dev về upload (R2):** `wrangler dev` vẫn sẽ kết nối tới R2 bucket thật trên Cloudflare. Không có R2 emulator. Nếu chưa tạo bucket → upload sẽ lỗi. Xem mục 3.3 để tạo bucket.

---

## 3. Thiết Lập Cloudflare (1 lần duy nhất)

> ⚠️ **Windows Users:** Wrangler trên Windows PowerShell có thể bị crash libuv. Giải pháp: dùng **WSL** hoặc **Git Bash**, hoặc tạo resources qua **Cloudflare Dashboard** (xem mục 6).

### 3.1 — Đăng nhập Wrangler

```bash
pnpm --filter @gamexamxi/worker exec -- wrangler login
```

### 3.2 — Tạo KV Namespaces

> ⚠️ Wrangler v4 đổi syntax: dùng `wrangler kv namespace` (có space), **không phải** `kv:namespace`.

```bash
# Production namespaces
pnpm --filter @gamexamxi/worker exec -- wrangler kv namespace create KV_SESSIONS
pnpm --filter @gamexamxi/worker exec -- wrangler kv namespace create KV_CACHE
pnpm --filter @gamexamxi/worker exec -- wrangler kv namespace create KV_LEADERBOARD
pnpm --filter @gamexamxi/worker exec -- wrangler kv namespace create KV_RATELIMIT

# Preview namespaces (dùng cho wrangler dev)
pnpm --filter @gamexamxi/worker exec -- wrangler kv namespace create KV_SESSIONS --preview
pnpm --filter @gamexamxi/worker exec -- wrangler kv namespace create KV_CACHE --preview
pnpm --filter @gamexamxi/worker exec -- wrangler kv namespace create KV_LEADERBOARD --preview
pnpm --filter @gamexamxi/worker exec -- wrangler kv namespace create KV_RATELIMIT --preview
```

Mỗi lệnh in ra `id`. Ví dụ:
```
✅ Created namespace "KV_SESSIONS" with ID "abc123def456..."
```

Copy tất cả các IDs để cập nhật `wrangler.json` ở bước 4.

### 3.3 — Tạo R2 Bucket

```bash
pnpm --filter @gamexamxi/worker exec -- wrangler r2 bucket create gamexamxi-media
```

Verify:
```bash
pnpm --filter @gamexamxi/worker exec -- wrangler r2 bucket list
```

### 3.4 — Tạo Queues

```bash
pnpm --filter @gamexamxi/worker exec -- wrangler queues create points-queue
pnpm --filter @gamexamxi/worker exec -- wrangler queues create achievements-queue
pnpm --filter @gamexamxi/worker exec -- wrangler queues create notifications-queue
pnpm --filter @gamexamxi/worker exec -- wrangler queues create points-dlq
```

### 3.5 — Set Secrets

```bash
# Nhập khi được hỏi (không lưu vào file)
pnpm --filter @gamexamxi/worker exec -- wrangler secret put JWT_SECRET
# → Nhập chuỗi random ≥ 32 chars. Tạo nhanh: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

pnpm --filter @gamexamxi/worker exec -- wrangler secret put RESEND_API_KEY
# → Nhập API key từ https://resend.com
```

### 3.6 — Apply migrations lên D1 remote

```bash
pnpm --filter @gamexamxi/worker exec -- wrangler d1 migrations apply gamexamxi-db --remote
```

---

## 4. Cập nhật wrangler.json

Sau khi tạo KV namespaces, thay các giá trị `REPLACE_*` trong `apps/worker/wrangler.json`:

```json
"kv_namespaces": [
  {
    "binding": "KV_SESSIONS",
    "id": "<KV_SESSIONS production id>",
    "preview_id": "<KV_SESSIONS preview id>"
  },
  {
    "binding": "KV_CACHE",
    "id": "<KV_CACHE production id>",
    "preview_id": "<KV_CACHE preview id>"
  },
  {
    "binding": "KV_LEADERBOARD",
    "id": "<KV_LEADERBOARD production id>",
    "preview_id": "<KV_LEADERBOARD preview id>"
  },
  {
    "binding": "KV_RATELIMIT",
    "id": "<KV_RATELIMIT production id>",
    "preview_id": "<KV_RATELIMIT preview id>"
  }
]
```

Verify hiện tại đang có:
- `r2_buckets.bucket_name` = `"gamexamxi-media"` ✅
- `vars.R2_PUBLIC_DOMAIN` = URL gateway R2 của bucket ✅

---

## 5. Deploy lên Production (qua Git)

> ⚡ Mọi thứ tự động deploy khi push lên `main`:
> - **Worker (API)**: GitHub Actions → `wrangler deploy`
> - **Web + Dashboard**: Cloudflare Pages (Git integration) → tự build Next.js

### 5.1 — Setup GitHub Actions cho Worker

Workflow đã có sẵn tại `.github/workflows/deploy.yml`.  
Chỉ cần thêm **secrets** trong GitHub repo:

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Thêm **Repository secrets**:
   ```
   CF_API_TOKEN   = Cloudflare API Token (tạo ở dash.cloudflare.com → My Profile → API Tokens)
   CF_ACCOUNT_ID  = Account ID (trang chính của Cloudflare Dashboard)
   ```

> **Tạo API Token:** dash.cloudflare.com → My Profile → API Tokens → Create Token  
> Template: **Edit Cloudflare Workers** (bao gồm Workers, D1, KV, R2, Queues)

### 5.2 — Setup Cloudflare Pages cho Web

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages**
2. **Connect to Git** → chọn repo `gamexamxi`
3. **Project name**: `gamexamxi-web`
4. **Build settings**:
   - Framework preset: **Next.js**
   - Build command: `pnpm --filter @gamexamxi/web build`
   - Build output directory: `apps/web/.next`
   - Root directory: `/` (giữ mặc định)
5. **Environment variables** (Settings → Environment variables):
   ```
   NEXT_PUBLIC_API_URL = https://gamexamxi-api.<subdomain>.workers.dev
   NEXT_PUBLIC_WS_URL  = wss://gamexamxi-api.<subdomain>.workers.dev
   NODE_VERSION        = 22
   PNPM_VERSION        = 9
   ```

### 5.3 — Setup Cloudflare Pages cho Dashboard

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages**
2. **Connect to Git** → chọn **cùng repo** `gamexamxi`
3. **Project name**: `gamexamxi-dashboard`
4. **Build settings**:
   - Framework preset: **Next.js**
   - Build command: `pnpm --filter @gamexamxi/dashboard build`
   - Build output directory: `apps/dashboard/.next`
   - Root directory: `/` (giữ mặc định)
5. **Environment variables**:
   ```
   NEXT_PUBLIC_API_URL = https://gamexamxi-api.<subdomain>.workers.dev
   NODE_VERSION        = 22
   PNPM_VERSION        = 9
   ```

### 5.4 — (Quan trọng) Xóa/disable project cũ bị lỗi

Nếu bạn đã có 1 Cloudflare project đang chạy `npx wrangler deploy` từ root → **xóa hoặc disable nó**:

1. dash.cloudflare.com → Workers & Pages → chọn project bị lỗi
2. Settings → Delete project

> Project cũ lỗi vì chạy `wrangler deploy` từ root monorepo. Worker giờ deploy qua GitHub Actions.

### 5.3 — Kiểm tra sau deploy

```bash
# Check worker health
curl https://gamexamxi-api.<subdomain>.workers.dev/api/health

# Xem live logs
pnpm --filter @gamexamxi/worker exec -- wrangler tail

# Kiểm tra uploads table
pnpm --filter @gamexamxi/worker exec -- wrangler d1 execute gamexamxi-db \
  --command "SELECT id,key,filename,created_at FROM uploads ORDER BY created_at DESC LIMIT 5;" \
  --remote --json

# Liệt kê objects trong R2
pnpm --filter @gamexamxi/worker exec -- wrangler r2 object list gamexamxi-media
```

---

## 6. Troubleshooting Windows

### Lỗi: `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)`

Đây là bug libuv của wrangler trên Windows PowerShell. Giải pháp:

**Option A — Dùng WSL (khuyên dùng):**
```bash
# Trong WSL terminal
cd /mnt/c/project/gamexamxi
pnpm --filter @gamexamxi/worker exec -- wrangler kv namespace create KV_SESSIONS
```

**Option B — Tạo resources qua Cloudflare Dashboard:**
- KV: [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → KV → Create namespace
- R2: → R2 → Create bucket
- Queues: → Workers & Pages → Queues → Create queue
- Copy IDs và paste vào `apps/worker/wrangler.json`

**Option C — Chạy wrangler trực tiếp (không qua pnpm filter):**
```bash
cd apps/worker
npx wrangler kv namespace create KV_SESSIONS
```

### Lỗi: `KV namespace 'REPLACE_KV_SESSIONS_ID' is not valid [code: 10042]`

→ Chưa tạo KV namespaces hoặc chưa cập nhật IDs trong `apps/worker/wrangler.json`. Làm bước 3.2 và 4.

### Lỗi: `Queue "points-queue" does not exist`

→ Chạy bước 3.4 để tạo queues.

### Lỗi: `no such table: uploads`

→ Migrations chưa được apply lên remote, chạy bước 3.6.

### Lỗi: `Command "wrangler" not found` khi dùng `pnpm --filter`

→ Chạy `pnpm install` để install lại dependencies, hoặc cd vào `apps/worker` rồi dùng `npx wrangler`.

### Reset local database

```bash
rm -rf apps/worker/.wrangler/state/v3/d1/
pnpm --filter @gamexamxi/worker exec -- wrangler d1 migrations apply gamexamxi-db --local
```
