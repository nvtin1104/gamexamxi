import { useCallback, useEffect, useState, type ComponentType } from 'react'
import { CircleHelp, RotateCcw, Star } from 'lucide-react'
import { Link, navigate } from '@/router/router'
import { countPlay, recordBest, useBestScore } from '@/lib/scores'
import { readJson, writeJson } from '@/lib/storage'
import type { InternalGame } from '@/landing/game-registry'
import type { GameResult, MiniGameProps } from '@/mini-games/types'
import { Modal } from './ui/modal'
import './game-shell.css'

interface GameShellProps {
  game: InternalGame
  Game: ComponentType<MiniGameProps>
}

const SEEN_KEY = 'gx:seen-instructions'

/**
 * Khung chung cho mọi mini-game tích hợp: nút quay lại, điểm live,
 * modal hướng dẫn (tự mở lần đầu) và modal kết quả ván chơi.
 */
export function GameShell({ game, Game }: GameShellProps) {
  const [score, setScore] = useState(0)
  const [restartKey, setRestartKey] = useState(0)
  const [result, setResult] = useState<(GameResult & { isRecord: boolean }) | null>(null)
  const [helpOpen, setHelpOpen] = useState(() => !readJson<string[]>(SEEN_KEY, []).includes(game.id))
  const best = useBestScore(game.id)

  useEffect(() => {
    document.title = `${game.title} — Gamexamxi`
  }, [game.title])

  const closeHelp = useCallback(() => {
    setHelpOpen(false)
    const seen = readJson<string[]>(SEEN_KEY, [])
    if (!seen.includes(game.id)) writeJson(SEEN_KEY, [...seen, game.id])
  }, [game.id])

  const handleGameOver = useCallback(
    (final: GameResult) => {
      setScore(final.score)
      const isRecord = recordBest(game.id, final.score)
      countPlay()
      setResult({ ...final, isRecord })
    },
    [game.id],
  )

  const restart = () => {
    setResult(null)
    setScore(0)
    setRestartKey((k) => k + 1)
  }

  return (
    <div className="shell">
      <header className="shell__bar">
        <Link href="/" className="btn btn--coral shell__back">
          ← <span className="shell__back-label">Quay lại Trang chủ</span>
        </Link>
        <h1 className="shell__title">
          <span aria-hidden="true">{game.emoji}</span> {game.title}
        </h1>
        <div className="shell__stats">
          <span className="pill" aria-live="polite">
            <Star size={16} fill="currentColor" aria-hidden="true" />
            <span className="sr-only">Điểm hiện tại:</span>
            {score.toLocaleString('vi-VN')}
          </span>
          <span className="badge shell__best" title="Kỷ lục của bạn">
            Kỷ lục {best.toLocaleString('vi-VN')}
          </span>
          <button
            type="button"
            className="btn btn--icon"
            onClick={() => setHelpOpen(true)}
            aria-label="Xem hướng dẫn chơi"
          >
            <CircleHelp size={20} />
          </button>
        </div>
      </header>

      <main className="shell__stage">
        <Game
          key={restartKey}
          restartKey={restartKey}
          paused={helpOpen || result !== null}
          onScore={setScore}
          onGameOver={handleGameOver}
        />
      </main>

      <Modal
        open={helpOpen}
        title={`Cách chơi ${game.title}`}
        onClose={closeHelp}
        actions={
          <button type="button" className="btn btn--sage btn--lg" onClick={closeHelp}>
            Đã hiểu, chơi thôi!
          </button>
        }
      >
        <ol className="shell__steps">
          {game.instructions.map((step) => (
            <li key={step.text}>
              <span className="shell__step-icon" aria-hidden="true">
                {step.icon}
              </span>
              {step.text}
            </li>
          ))}
        </ol>
      </Modal>

      <Modal
        open={result !== null}
        title={result?.isRecord ? '🏆 Kỷ lục mới!' : '🎉 Hết ván!'}
        onClose={restart}
        dismissible={false}
        actions={
          <>
            <button type="button" className="btn btn--sage btn--lg" onClick={restart}>
              <RotateCcw size={18} aria-hidden="true" /> Chơi lại
            </button>
            <button type="button" className="btn btn--coral btn--lg" onClick={() => navigate('/')}>
              ← Về Trang chủ
            </button>
          </>
        }
      >
        <div className="shell__result">
          <div className="shell__result-score">{result?.score.toLocaleString('vi-VN')}</div>
          <div className="shell__result-label">điểm</div>
          {result?.summary && <p className="shell__result-summary">{result.summary}</p>}
          <p className="shell__result-best">Kỷ lục của bạn: {best.toLocaleString('vi-VN')} điểm</p>
        </div>
      </Modal>
    </div>
  )
}
