import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Flame, Magnet, Timer, Users } from 'lucide-react'
import type { MiniGameProps } from '../types'
import { createGame, ROUND_SECONDS, type GameHandle, type HudState, type Pop } from './engine/create-game'
import './ufo.css'

const INITIAL_HUD: HudState = {
  timeLeft: ROUND_SECONDS,
  score: 0,
  combo: 0,
  multiplier: 1,
  abducted: 0,
  beamOn: false,
}

export default function UfoAbduction3D({ onScore, onGameOver, paused }: MiniGameProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<GameHandle | null>(null)
  const [hud, setHud] = useState<HudState>(INITIAL_HUD)
  const [pops, setPops] = useState<Pop[]>([])
  const [error, setError] = useState<string | null>(null)
  const [touchBeam, setTouchBeam] = useState(false)

  // Giữ callback mới nhất mà không phải tạo lại engine
  const callbacksRef = useRef({ onScore, onGameOver })
  useEffect(() => {
    callbacksRef.current = { onScore, onGameOver }
  }, [onScore, onGameOver])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const game = createGame(stage, {
      onHud: (next) => {
        setHud(next)
        callbacksRef.current.onScore(next.score)
      },
      onPop: (pop) => setPops((prev) => [...prev.slice(-5), pop]),
      onGameOver: (result) => {
        callbacksRef.current.onGameOver({
          score: result.score,
          summary: `Bắt cóc ${result.abducted} mục tiêu (${result.students} học sinh) · combo cao nhất ×${result.bestCombo}`,
        })
      },
      onError: setError,
    })
    gameRef.current = game
    return () => {
      game.dispose()
      gameRef.current = null
    }
  }, [])

  useEffect(() => {
    gameRef.current?.setPaused(paused)
  }, [paused])

  const beamDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setTouchBeam(true)
    gameRef.current?.setTouchBeam(true)
  }
  const beamUp = () => {
    setTouchBeam(false)
    gameRef.current?.setTouchBeam(false)
  }

  const lowTime = hud.timeLeft <= 10

  return (
    <div className="ufo">
      <div ref={stageRef} className="ufo__stage" aria-label="Sân trường 3D — điều khiển bằng bàn phím, chuột hoặc chạm" />

      {error ? (
        <div className="ufo__error nb-card">
          <span aria-hidden="true">🛸</span>
          <p>{error}</p>
        </div>
      ) : (
        <>
          <div className="ufo__hud">
            <div className={`ufo__chip ${lowTime ? 'bg-coral ufo__chip--pulse' : ''}`}>
              <Timer size={16} aria-hidden="true" />
              <span className="sr-only">Thời gian còn lại:</span>
              {hud.timeLeft}s
            </div>
            <div className="ufo__chip">
              <Users size={16} aria-hidden="true" />
              <span className="sr-only">Đã bắt cóc:</span>
              {hud.abducted}
            </div>
            {hud.combo > 1 && (
              <div key={hud.combo} className="ufo__chip bg-butter ufo__chip--pop">
                <Flame size={16} aria-hidden="true" />
                Combo {hud.combo} · ×{hud.multiplier.toFixed(2).replace(/\.?0+$/, '')}
              </div>
            )}
          </div>

          <div className="ufo__time-bar" aria-hidden="true">
            <span style={{ transform: `scaleX(${hud.timeLeft / ROUND_SECONDS})` }} />
          </div>

          {pops.map((pop) => (
            <span
              key={pop.id}
              className={`ufo__pop ${pop.big ? 'ufo__pop--big' : ''}`}
              style={{ left: `${pop.x * 100}%`, top: `${pop.y * 100}%` }}
              onAnimationEnd={() => setPops((prev) => prev.filter((p) => p.id !== pop.id))}
            >
              {pop.text}
            </span>
          ))}

          <p className="ufo__hint">
            <kbd>WASD</kbd> / mũi tên để bay · giữ <kbd>Space</kbd> hoặc chuột trái để bật tia hút
          </p>

          <button
            type="button"
            className={`btn btn--lg ufo__beam-btn ${touchBeam ? 'is-on' : ''}`}
            onPointerDown={beamDown}
            onPointerUp={beamUp}
            onPointerCancel={beamUp}
            onContextMenu={(event) => event.preventDefault()}
            aria-pressed={touchBeam}
          >
            <Magnet size={20} aria-hidden="true" /> Tia hút
          </button>
        </>
      )}
    </div>
  )
}
