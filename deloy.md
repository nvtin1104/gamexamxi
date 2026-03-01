# Hướng dẫn deploy (Deployment Guide)

## 1. Chuẩn bị
- Đảm bảo đã cài đặt `wrangler` và `pnpm`
- Đăng nhập Cloudflare bằng lệnh:
  ```bash
  wrangler login
  ```
- Kiểm tra các binding trong `wrangler.toml` đã đúng (D1, KV, R2, Queues...)

## 2. Deploy backend (API)
- Vào thư mục backend:
  ```bash
  cd apps/api
  pnpm build
  pnpm deploy
  # hoặc
  wrangler deploy
  ```
- Sau khi deploy, API sẽ chạy trên Cloudflare Workers
- Chạy migrate D1 trên remote:
  ```bash
  wrangler d1 migrations apply gamexamxi-db --remote
  ```

## 3. Deploy dashboard (frontend)
- Vào thư mục dashboard:
  ```bash
  cd apps/dashboard
  pnpm build
  wrangler pages deploy dist/
  ```
- Dashboard sẽ chạy trên Cloudflare Pages
- Có thể kết nối GitHub để tự động CI/CD

## 4. Cấu hình môi trường production
- Đảm bảo JWT_SECRET đã được set trên Cloudflare:
  ```bash
  wrangler secret put JWT_SECRET
  ```
- ALLOWED_ORIGINS chỉ cho phép domain dashboard production
- R2 bucket phải để private, chỉ truy cập qua signed URL hoặc proxy

## 5. Kiểm tra sau deploy
- Test các endpoint API, dashboard
- Kiểm tra logs trên Cloudflare dashboard
- Đảm bảo các binding, database, storage hoạt động đúng

## 6. Rollback / update
- Khi cần rollback, deploy lại version cũ bằng wrangler
- Khi update, chỉ cần build và deploy lại như trên

## 7. Tài liệu tham khảo
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Astro Docs](https://docs.astro.build/)
- [Wrangler Docs](https://developers.cloudflare.com/workers/wrangler/)
