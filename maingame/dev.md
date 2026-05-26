# Hướng dẫn phát triển (Development Guide)

## 1. Cài đặt môi trường
- Yêu cầu: Node.js >= 20, pnpm >= 9
- Clone repo về máy
- Cài đặt các package:
  ```bash
  pnpm install
  ```

## 2. Khởi chạy backend (API)
- Vào thư mục backend:
  ```bash
  cd apps/api
  pnpm dev
  # hoặc
  npx wrangler dev
  ```
- API sẽ chạy ở `http://localhost:8787`
- Kiểm tra health:
  ```bash
  curl http://localhost:8787/health
  ```

## 3. Khởi chạy dashboard (frontend)
- Vào thư mục dashboard:
  ```bash
  cd apps/dashboard
  pnpm dev
  # hoặc
  npx astro dev
  ```
- Dashboard sẽ chạy ở `http://localhost:4321`

## 4. Quản lý database
- Migrate schema cho D1:
  ```bash
  cd apps/api
  pnpm db:migrate
  # hoặc
  wrangler d1 migrations apply gamexamxi-db --local
  ```
- File migration nằm ở `apps/api/drizzle/`

## 5. Thêm package mới
- Thêm vào đúng workspace (api, dashboard, shared)
- Ví dụ:
  ```bash
  pnpm add <package> -F @gamexamxi/api
  pnpm add <package> -F @gamexamxi/dashboard
  ```

## 6. Kiểm tra lỗi TypeScript
- Backend:
  ```bash
  cd apps/api
  pnpm lint
  ```
- Frontend:
  ```bash
  cd apps/dashboard
  pnpm lint
  # hoặc
  npx astro check
  ```

## 7. Cấu hình môi trường
- Sửa các biến trong `wrangler.toml` (API) và `.env` (dashboard nếu cần)
- Đảm bảo JWT_SECRET được set bằng lệnh:
  ```bash
  wrangler secret put JWT_SECRET
  ```

## 8. Quy trình phát triển
- Sử dụng các script trong `package.json` để build, lint, migrate, test
- Đảm bảo tuân thủ chuẩn code, kiểm tra lỗi trước khi commit
- Đọc kỹ các file README, dev.md, deloy.md để biết quy trình chuẩn
