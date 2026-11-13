# Web game độc lập (Standalone Games)

Game lớn (RPG, mô phỏng nhiều màn, game nhiều người chơi…) **không** nằm trong `root/`. Mỗi game là một web project riêng, deploy thành một **Cloudflare Pages project riêng** trên subdomain, và được hub liên kết qua registry.

```
gamexamxi.com            ← root/ (hub)
rpg.gamexamxi.com        ← standalone-games/hoc-vien-phieu-luu (repo hoặc thư mục riêng)
math.gamexamxi.com       ← standalone-games/thanh-pho-toan-hoc
```

## 1. Tạo game mới

1. Copy `_template/` thành thư mục mới (hoặc dùng bất kỳ framework nào: Vite, Phaser, Godot web export, Unity WebGL…).
2. Nhúng `hub-bridge.js` vào trang chính của game:

   ```html
   <script
     src="/hub-bridge.js"
     data-game-id="hoc-vien-phieu-luu"
     data-hub-origins="https://gamexamxi.com,http://localhost:5173"
     defer
   ></script>
   ```

   - `data-game-id` phải trùng `id` trong `root/src/landing/game-registry.ts`.
   - `data-hub-origins` là allowlist origin của hub (production + dev). Script chỉ chấp nhận `?return=` thuộc danh sách này.

3. Gửi điểm khi người chơi đạt điểm mới:

   ```js
   window.GxHub.reportScore(1200)
   ```

   Script tự hiện badge **"← Về Hub Chính"**. Khi bấm, người chơi quay về `https://gamexamxi.com/?gx_game=<id>&gx_score=<điểm cao nhất>` và hub ghi nhận kỷ lục.

4. Đọc theme nếu muốn đồng bộ giao diện: `window.GxHub.theme` (mặc định `soft-brutal`, hub truyền qua `?theme=`).

## 2. Hai kênh đồng bộ điểm

| Kênh | Khi nào | Bảo mật |
|------|---------|---------|
| Query param `gx_game` + `gx_score` | Người chơi bấm badge quay về hub (mặc định, mở cùng tab) | Hub chỉ nhận `gameId` có trong registry, điểm là số nguyên 0–1.000.000 |
| `postMessage({ type: 'gx:score', gameId, score }, hubOrigin)` | Game mở dạng popup (`window.opener`) hoặc nhúng iframe (`window.parent`) | Hub kiểm tra `event.origin` khớp origin của game trong registry |

Điểm lưu ở `localStorage` của trình duyệt → chỉ mang tính giải trí, không dùng cho giải thưởng.

## 3. Deploy & kết nối với hub

1. Tạo Cloudflare Pages project mới cho game (Root directory = thư mục game, build theo framework của game).
2. **Custom domains** → thêm `rpg.gamexamxi.com`.
3. Trong `root/src/landing/game-registry.ts`, cập nhật entry:

   ```ts
   {
     id: 'hoc-vien-phieu-luu',
     type: 'external-web',
     url: 'https://rpg.gamexamxi.com',
     params: { theme: 'soft-brutal', ref: 'hub' },
     status: 'live', // đổi từ 'coming-soon'
     // ...
   }
   ```

4. (Tuỳ chọn) Short link trong `root/public/_redirects`:

   ```
   /go/hoc-vien-phieu-luu  https://rpg.gamexamxi.com/?ref=hub  302
   ```

> Cloudflare Pages `_redirects` **chỉ redirect** (301/302) sang domain khác, không proxy. Muốn game nằm dưới đường dẫn của hub (vd. `gamexamxi.com/worlds/rpg/*`) cần thêm Worker hoặc Pages Function làm reverse proxy — hiện chưa làm vì hub là trang tĩnh thuần.

## 4. Checklist trước khi chuyển `status: 'live'`

- [ ] `data-game-id` khớp registry, `data-hub-origins` có domain production của hub
- [ ] Badge "← Về Hub Chính" không che UI quan trọng của game (đổi vị trí bằng CSS nếu cần)
- [ ] `reportScore` được gọi khi có điểm mới
- [ ] Giao diện tiếng Việt, chạy được trên điện thoại
- [ ] Thử vòng: hub → game → ghi điểm → về hub → thấy toast "+điểm" và kỷ lục trên thẻ game
