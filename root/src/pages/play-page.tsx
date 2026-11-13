import { Component, lazy, Suspense, useMemo, type ReactNode } from 'react'
import { GameShell } from '@/components/game-shell'
import { findInternalGame } from '@/landing/game-registry'
import { Link } from '@/router/router'
import { NotFound } from './not-found'

export function PlayPage({ gameId }: { gameId: string }) {
  const game = findInternalGame(gameId)
  // lazy() phải tạo một lần cho mỗi game — PlayPage được key theo gameId
  const Game = useMemo(() => (game ? lazy(game.load) : null), [game])

  if (!game || !Game || game.status !== 'live') return <NotFound />

  return (
    <LoadBoundary>
      <Suspense
        fallback={
          <div className="shell-loading" role="status">
            <span className="shell-loading__ufo" aria-hidden="true">
              {game.emoji}
            </span>
            Đang tải {game.title}…
          </div>
        }
      >
        <GameShell game={game} Game={Game} />
      </Suspense>
    </LoadBoundary>
  )
}

/** Bắt lỗi tải chunk (mất mạng, deploy mới đổi hash) và lỗi runtime của game. */
class LoadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Lỗi khi tải hoặc chạy game:', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="not-found">
        <div className="nb-card not-found__card">
          <div className="not-found__emoji" aria-hidden="true">
            🧯
          </div>
          <h1>Ối, game chưa tải được</h1>
          <p>Kiểm tra kết nối mạng rồi thử lại nhé. Nếu trình duyệt quá cũ, game 3D có thể không chạy.</p>
          <div className="modal__actions">
            <button type="button" className="btn btn--sage btn--lg" onClick={() => window.location.reload()}>
              Thử lại
            </button>
            <Link href="/" className="btn btn--coral btn--lg">
              ← Quay lại Trang chủ
            </Link>
          </div>
        </div>
      </main>
    )
  }
}
