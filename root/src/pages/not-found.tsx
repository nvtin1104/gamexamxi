import { Link } from '@/router/router'

export function NotFound() {
  return (
    <main className="not-found">
      <div className="nb-card not-found__card">
        <div className="not-found__emoji" aria-hidden="true">
          🛸💨
        </div>
        <h1>404 — Đĩa bay đã cuốn mất trang này</h1>
        <p>Đường dẫn không tồn tại hoặc game đã được chuyển đi nơi khác.</p>
        <Link href="/" className="btn btn--sage btn--lg">
          ← Quay lại Trang chủ
        </Link>
      </div>
    </main>
  )
}
