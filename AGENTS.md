# AGENTS.md — Gamexamxi Development Guide

## Overview

Gamexamxi là **hub game tĩnh cho học sinh**, deploy trên **Cloudflare Pages**. Không có backend/API.

```
gamexamxi/
├── root/               # Cloudflare Pages project chính: landing page + mini-game tích hợp
├── standalone-games/   # Template & hướng dẫn cho web game độc lập (mỗi game = 1 Pages project riêng)
└── docs/               # Hướng dẫn deploy
```

- `root/` — Vite 7 + React 19 + TypeScript (strict), CSS thuần với design tokens, `three` cho game 3D.
- Game lớn **không** đặt trong `root/`: tạo web project riêng, deploy lên subdomain, rồi khai báo trong registry.

---

## Commands (chạy trong `root/`, dùng npm)

```bash
npm install
npm run dev           # Vite dev server :5173
npm run build         # tsc --noEmit && vite build → dist/
npm run lint          # tsc --noEmit
npm run preview       # Xem bản build
npm run pages:dev     # Build + wrangler pages dev (thử _redirects/_headers)
npm run pages:deploy  # Build + wrangler pages deploy dist
```

Chưa có test framework. Nếu thêm: Vitest (`npx vitest run <file>`).

Cloudflare Pages: **Root directory = `root`**, **Build command = `npm run build`**, **Output = `dist`**. Chi tiết: `docs/deploy-cloudflare-pages.md`.

---

## Kiến trúc `root/src/`

| Đường dẫn | Vai trò |
|-----------|---------|
| `landing/game-registry.ts` | Nguồn sự thật duy nhất cho danh sách game (`internal` / `external-web`) |
| `landing/sections/*` | Các section landing: nav-bar, hero, catalog, game-card, about, contact, footer |
| `landing/contact-service.ts` | Validate + gửi form liên hệ (hiện là `mailto:`/client-only) |
| `components/game-shell.tsx` | Khung chung cho mini-game: nút quay lại, điểm live, modal hướng dẫn & kết quả |
| `components/ui/*` | Modal (focus trap), Toast |
| `router/router.tsx` | Router History API tối giản (`/`, `/play/:id`) |
| `lib/scores.ts` | Kỷ lục từng game + tổng điểm (localStorage, `useSyncExternalStore`) |
| `lib/hub-bridge.ts` | Nhận điểm từ web game độc lập (query `gx_game/gx_score` + `postMessage`) |
| `mini-games/<id>/index.tsx` | Mỗi mini-game, `export default` component nhận `MiniGameProps` |
| `styles/tokens.css` | Design tokens Soft Neo-Brutalism |

### Thêm một mini-game tích hợp

1. Tạo `root/src/mini-games/<id>/index.tsx`, `export default function X(props: MiniGameProps)`.
2. Gọi `props.onScore(n)` khi điểm đổi, `props.onGameOver({ score, summary })` khi hết ván, dừng đồng hồ khi `props.paused`.
3. Khai báo entry `type: 'internal'` trong `game-registry.ts` với `load: () => import('@/mini-games/<id>')` — Vite tự tách chunk.
4. Game dùng WebGL/Canvas phải giải phóng toàn bộ tài nguyên khi unmount (xem `ufo-abduction-3d/engine/dispose.ts`).

### Thêm một web game độc lập

Xem `standalone-games/README.md`.

---

## Code Style

- TypeScript strict, `noUncheckedIndexedAccess`, `noUnusedLocals/Parameters`.
- Import tuyệt đối bằng alias `@/` → `root/src/`; nhóm import: thư viện → nội bộ → file cùng thư mục.
- Named export; `export default` chỉ cho component mini-game (để lazy-load).
- File kebab-case (`game-card.tsx`), component PascalCase, hằng số SCREAMING_SNAKE.
- **Toàn bộ text hiển thị bằng tiếng Việt.**
- **Không** giới hạn bề rộng container trang (`max-width` cố định cho layout); dùng padding `var(--gutter)`. Ngoại lệ: modal/toast.
- Icon: `lucide-react`. Không thêm thư viện UI/CSS-in-JS — dùng class trong `styles/components.css`.
- localStorage luôn qua `lib/storage.ts` (bọc try/catch).

## Design System — Soft Neo-Brutalism

Tokens trong `root/src/styles/tokens.css`:

- Nền `--bg #FAF6F0`, thẻ `--surface #FFFFFF` / `--surface-sand #F2ECE1`, mực `--ink #1E1E24` (không dùng `#000`).
- Accent: `--sage` (CTA, học tập), `--butter` (nổi bật, điểm), `--sky` (3D), `--coral` (thoát/cảnh báo), `--lavender` (web game độc lập).
- Viền `2px solid var(--ink)`, bo `16px`, bóng `4px 4px 0`; hover `translate(-2px,-2px)` + bóng 6px; active `translate(2px,2px)` + bóng 2px (`.nb-press`, `.btn`).
- Font Be Vietnam Pro. Tôn trọng `prefers-reduced-motion`.

## Security

- Trang tĩnh: CSP và header bảo mật trong `root/public/_headers`.
- Điểm từ web game ngoài chỉ được nhận khi `gameId` có trong registry; `postMessage` kiểm tra `event.origin` khớp origin của game.
- Template `hub-bridge.js` chỉ chấp nhận URL quay về thuộc allowlist (chống open redirect), `postMessage` luôn có `targetOrigin` cụ thể.
- Điểm lưu ở trình duyệt người chơi → chỉ mang tính giải trí.
