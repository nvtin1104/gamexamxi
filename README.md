# Gamexamxi 🛸

Hub game cho học sinh: landing page + mini-game chơi ngay trên trình duyệt, và cổng dẫn tới các web game độc lập. Deploy tĩnh trên Cloudflare Pages.

- **Lật Thẻ Trí Nhớ** — ôn từ vựng Anh–Việt / biểu tượng học đường, combo, kỷ lục.
- **UFO Bắt Cóc Sân Trường** — game 3D (three.js): lái đĩa bay, tia hút vật lý xoắn ốc, 60 giây.

```bash
cd root
npm install
npm run dev     # http://localhost:5173
```

| Thư mục | Nội dung |
|---------|----------|
| [`root/`](root) | App chính (Vite + React + TS) — deploy với Root directory = `root` |
| [`standalone-games/`](standalone-games) | Template & hướng dẫn web game độc lập |
| [`docs/deploy-cloudflare-pages.md`](docs/deploy-cloudflare-pages.md) | Hướng dẫn deploy |
| [`AGENTS.md`](AGENTS.md) | Quy ước code & kiến trúc |
