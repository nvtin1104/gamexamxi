# Project Guidelines — Gamexamxi

Hub game tĩnh cho học sinh trên Cloudflare Pages. Hướng dẫn đầy đủ nằm trong `AGENTS.md` ở thư mục gốc — luôn đọc file đó trước.

## Tóm tắt

- App chính: `root/` (Vite 7 + React 19 + TypeScript strict + CSS tokens + three.js). Không có backend.
- Lệnh (trong `root/`): `npm run dev`, `npm run build`, `npm run lint`.
- Danh sách game: `root/src/landing/game-registry.ts` (`internal` = mini-game lazy-load tại `/play/<id>`, `external-web` = web game độc lập trên subdomain).
- Mini-game: `root/src/mini-games/<id>/index.tsx`, `export default` component nhận `MiniGameProps`, chạy trong `GameShell`.
- Web game độc lập: dùng `standalone-games/_template/hub-bridge.js`.

## Quy tắc

- Text giao diện bằng tiếng Việt.
- File kebab-case, import alias `@/`, named export (trừ component mini-game).
- Không đặt `max-width` cố định cho layout trang.
- Dùng design tokens Soft Neo-Brutalism trong `root/src/styles/tokens.css`; không dùng `#000`.
- localStorage qua `root/src/lib/storage.ts`.
- Game WebGL phải `dispose()` toàn bộ geometry/material/renderer khi unmount.
