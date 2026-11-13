import { findGame, getAllowedOrigins } from '@/landing/game-registry'
import { toast } from '@/components/ui/toast'
import { MAX_REPORTED_SCORE, recordBest } from './scores'

/**
 * Cầu nối điểm số giữa hub và các web game độc lập.
 *
 * 1. Query param khi người chơi bấm "← Về Hub Chính":
 *      https://hub/?gx_game=<id>&gx_score=<n>
 * 2. postMessage (game nhúng trong iframe hoặc mở dạng popup):
 *      window.opener.postMessage({ type: 'gx:score', gameId, score }, '<origin hub>')
 *
 * Điểm chỉ được chấp nhận khi `gameId` là web game độc lập có trong registry và
 * (với postMessage) `event.origin` khớp origin của game đó. Điểm lưu cục bộ nên chỉ
 * mang tính giải trí — không dùng cho xếp hạng có giải thưởng.
 */

function parseScore(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > MAX_REPORTED_SCORE) return null
  return n
}

function acceptScore(gameId: unknown, rawScore: unknown, origin?: string): void {
  if (typeof gameId !== 'string') return
  const game = findGame(gameId)
  if (!game || game.type !== 'external-web') return
  if (origin !== undefined && new URL(game.url).origin !== origin) return
  const score = parseScore(rawScore)
  if (score === null) return
  const isRecord = recordBest(game.id, score)
  toast(isRecord ? `Kỷ lục mới ở ${game.title}: ${score} điểm!` : `+${score} điểm từ ${game.title}`, 'score')
}

function consumeQueryScore(): void {
  const url = new URL(window.location.href)
  const gameId = url.searchParams.get('gx_game')
  const score = url.searchParams.get('gx_score')
  if (gameId === null && score === null) return
  acceptScore(gameId, score)
  url.searchParams.delete('gx_game')
  url.searchParams.delete('gx_score')
  window.history.replaceState(null, '', url)
}

/** Gọi một lần khi app khởi động. Trả về hàm gỡ listener. */
export function initHubBridge(): () => void {
  consumeQueryScore()
  const allowed = getAllowedOrigins()
  const onMessage = (event: MessageEvent) => {
    if (!allowed.has(event.origin)) return
    const data: unknown = event.data
    if (!data || typeof data !== 'object') return
    const payload = data as { type?: unknown; gameId?: unknown; score?: unknown }
    if (payload.type !== 'gx:score') return
    acceptScore(payload.gameId, payload.score, event.origin)
  }
  window.addEventListener('message', onMessage)
  return () => window.removeEventListener('message', onMessage)
}
