# Deploy hub `root/` lên Cloudflare Pages

Hub là site tĩnh (Vite build → `dist/`). Không cần Worker, D1, KV hay secret nào.

## Cách 1 — Kết nối GitHub (khuyến nghị, tự deploy mỗi lần push)

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → chọn repo `gamexamxi`.
2. Build settings:

   | Mục | Giá trị |
   |-----|---------|
   | Framework preset | `None` (hoặc `Vite`) |
   | Root directory | `root` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Environment variable | `NODE_VERSION = 20` (hoặc mới hơn) |
   | Environment variable (tuỳ chọn) | `VITE_CONTACT_EMAIL = hop-thu-cua-ban@vidu.com` — form liên hệ sẽ mở ứng dụng email |

3. **Save and Deploy**. Mỗi nhánh khác `main` sẽ có preview URL riêng (`<branch>.<project>.pages.dev`).
4. **Custom domains** → thêm domain chính (vd. `gamexamxi.com`).

## Cách 2 — Deploy thủ công bằng Wrangler

```bash
cd root
npm install
npx wrangler login
npm run pages:deploy        # = npm run build && npx wrangler pages deploy dist
```

Lần đầu Wrangler sẽ hỏi tên project Pages.

## Thử cấu hình Pages ở máy local

```bash
cd root
npm run pages:dev           # build + wrangler pages dev dist (áp dụng _redirects, _headers)
```

Kiểm tra: mở trực tiếp `http://localhost:8788/play/ufo-abduction-3d` rồi tải lại trang — phải vào được game (SPA fallback).

## Các file cấu hình Pages trong `root/public/`

- `_redirects` — short link `/go/*` tới web game độc lập + dòng cuối `/* /index.html 200` (SPA fallback, luôn để cuối).
- `_headers` — cache 1 năm cho `/assets/*` (tên file có hash), CSP và các header bảo mật cho mọi trang.

Nếu thêm nguồn bên ngoài (ảnh CDN, analytics…), nhớ mở rộng `Content-Security-Policy` trong `_headers`.

## Tối ưu đã có

- Mỗi mini-game là một chunk riêng (dynamic `import()`); `three` (~135KB gzip) chỉ tải khi vào game UFO.
- React tách chunk `react` để cache lâu giữa các lần deploy.
- Font Google tải với `display=swap` + `preconnect`.

## Kết nối web game độc lập

Xem `standalone-games/README.md` (subdomain riêng cho mỗi game + `hub-bridge.js`).

## Dọn tài nguyên cũ (tuỳ chọn)

Phiên bản trước của repo có API (Worker + D1 + KV + R2) và dashboard Pages. Mã nguồn đã bị xoá khỏi nhánh này nhưng **tài nguyên trên Cloudflare vẫn còn** — vào Dashboard để xoá thủ công nếu không dùng nữa.
