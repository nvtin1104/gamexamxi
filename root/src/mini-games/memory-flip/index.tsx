import { useCallback, useEffect, useRef, useState } from 'react'
import { Clock, Flame, Footprints, Trophy } from 'lucide-react'
import { readJson, writeJson } from '@/lib/storage'
import type { MiniGameProps } from '../types'
import { buildBoard, DECKS, type CardInstance, type DeckId } from './decks'
import './memory-flip.css'

const DECK_KEY = 'gx:memory-flip:deck'
const BEST_KEY = 'gx:memory-flip:best'
const MISMATCH_DELAY = 800
const BASE_POINTS = 100

type BestByDeck = Partial<Record<DeckId, number>>

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Điểm thưởng khi hoàn thành: nhanh và ít lượt được nhiều hơn. */
function finishBonus(elapsedMs: number, moves: number): number {
  const timeBonus = Math.max(0, 600 - Math.floor(elapsedMs / 1000) * 5)
  const moveBonus = Math.max(0, (24 - moves) * 20)
  return timeBonus + moveBonus
}

export default function MemoryFlip({ onScore, onGameOver, paused }: MiniGameProps) {
  const [deckId, setDeckId] = useState<DeckId>(() => {
    const saved = readJson<string>(DECK_KEY, 'vocab')
    return saved === 'icons' ? 'icons' : 'vocab'
  })
  const [cards, setCards] = useState<CardInstance[]>(() => buildBoard(DECKS[deckId]))
  const [open, setOpen] = useState<number[]>([]) // index các thẻ đang mở (tối đa 2)
  const [matched, setMatched] = useState<Set<string>>(() => new Set())
  const [moves, setMoves] = useState(0)
  const [streak, setStreak] = useState(0)
  const [score, setScore] = useState(0)
  const [lastGain, setLastGain] = useState<{ points: number; key: number } | null>(null)
  const [best, setBest] = useState<BestByDeck>(() => readJson<BestByDeck>(BEST_KEY, {}))

  // Đồng hồ: cộng dồn thời gian chạy, dừng khi tạm dừng hoặc đã thắng
  const [elapsed, setElapsed] = useState(0)
  const startedRef = useRef(false)
  const accRef = useRef(0)
  const sinceRef = useRef<number | null>(null)
  const finishedRef = useRef(false)
  const lockRef = useRef(false)
  const timeoutsRef = useRef<number[]>([])

  const later = (fn: () => void, ms: number) => {
    timeoutsRef.current.push(window.setTimeout(fn, ms))
  }

  useEffect(() => () => timeoutsRef.current.forEach((t) => window.clearTimeout(t)), [])

  const deck = DECKS[deckId]
  const totalPairs = deck.pairs.length

  const readElapsed = () => accRef.current + (sinceRef.current === null ? 0 : performance.now() - sinceRef.current)

  const running = startedRef.current && !paused && !finishedRef.current

  useEffect(() => {
    if (!running) {
      if (sinceRef.current !== null) {
        accRef.current += performance.now() - sinceRef.current
        sinceRef.current = null
      }
      return
    }
    sinceRef.current = performance.now()
    const timer = window.setInterval(() => setElapsed(readElapsed()), 250)
    return () => {
      window.clearInterval(timer)
      if (sinceRef.current !== null) {
        accRef.current += performance.now() - sinceRef.current
        sinceRef.current = null
      }
    }
  }, [running])

  useEffect(() => {
    onScore(score)
  }, [score, onScore])

  const reset = useCallback((nextDeck: DeckId) => {
    timeoutsRef.current.forEach((t) => window.clearTimeout(t))
    timeoutsRef.current = []
    setCards(buildBoard(DECKS[nextDeck]))
    setOpen([])
    setMatched(new Set())
    setMoves(0)
    setStreak(0)
    setScore(0)
    setLastGain(null)
    setElapsed(0)
    startedRef.current = false
    finishedRef.current = false
    lockRef.current = false
    accRef.current = 0
    sinceRef.current = null
  }, [])

  const switchDeck = (next: DeckId) => {
    if (next === deckId) return
    setDeckId(next)
    writeJson(DECK_KEY, next)
    reset(next)
  }

  const flip = (index: number) => {
    const card = cards[index]
    if (!card || paused || lockRef.current || finishedRef.current) return
    if (open.includes(index) || matched.has(card.pairId)) return

    if (!startedRef.current) {
      startedRef.current = true
      sinceRef.current = performance.now()
      setElapsed(0)
    }

    if (open.length === 0) {
      setOpen([index])
      return
    }

    const firstIndex = open[0]
    const first = firstIndex === undefined ? undefined : cards[firstIndex]
    if (firstIndex === undefined || !first) return

    const nextMoves = moves + 1
    setMoves(nextMoves)
    setOpen([firstIndex, index])

    if (first.pairId === card.pairId) {
      const multiplier = 1 + streak * 0.5
      const gained = Math.round(BASE_POINTS * multiplier)
      const nextMatched = new Set(matched).add(card.pairId)
      let nextScore = score + gained
      setMatched(nextMatched)
      setStreak(streak + 1)
      setLastGain({ points: gained, key: Date.now() })
      setOpen([])

      if (nextMatched.size === totalPairs) {
        finishedRef.current = true
        const time = readElapsed()
        accRef.current = time
        sinceRef.current = null
        setElapsed(time)
        const bonus = finishBonus(time, nextMoves)
        nextScore += bonus
        if (nextScore > (best[deckId] ?? 0)) {
          const nextBest = { ...best, [deckId]: nextScore }
          setBest(nextBest)
          writeJson(BEST_KEY, nextBest)
        }
        later(() => {
          onGameOver({
            score: nextScore,
            summary: `${deck.label} · ${nextMoves} lượt · ${formatTime(time)} · thưởng hoàn thành +${bonus}`,
          })
        }, 700)
      }
      setScore(nextScore)
    } else {
      setStreak(0)
      lockRef.current = true
      later(() => {
        setOpen([])
        lockRef.current = false
      }, MISMATCH_DELAY)
    }
  }

  return (
    <div className="mf">
      <div className="mf__toolbar">
        <div className="segmented" role="group" aria-label="Chọn bộ thẻ">
          {(Object.keys(DECKS) as DeckId[]).map((id) => (
            <button
              key={id}
              type="button"
              className="segmented__item"
              aria-pressed={deckId === id}
              onClick={() => switchDeck(id)}
            >
              {DECKS[id].label}
            </button>
          ))}
        </div>
        <p className="mf__hint">{deck.hint}</p>
      </div>

      <dl className="mf__stats">
        <div className="mf__stat">
          <dt>
            <Clock size={15} aria-hidden="true" /> Thời gian
          </dt>
          <dd>{formatTime(elapsed)}</dd>
        </div>
        <div className="mf__stat">
          <dt>
            <Footprints size={15} aria-hidden="true" /> Lượt
          </dt>
          <dd>{moves}</dd>
        </div>
        <div className={`mf__stat ${streak >= 2 ? 'mf__stat--hot' : ''}`}>
          <dt>
            <Flame size={15} aria-hidden="true" /> Combo
          </dt>
          <dd>×{(1 + streak * 0.5).toFixed(1)}</dd>
        </div>
        <div className="mf__stat">
          <dt>
            <Trophy size={15} aria-hidden="true" /> Kỷ lục bộ này
          </dt>
          <dd>{(best[deckId] ?? 0).toLocaleString('vi-VN')}</dd>
        </div>
      </dl>

      <div className="mf__board-wrap">
        {lastGain && (
          <span key={lastGain.key} className="mf__gain" aria-hidden="true">
            +{lastGain.points}
          </span>
        )}
        <div className="mf__board" role="group" aria-label={`Bảng thẻ, đã ghép ${matched.size}/${totalPairs} cặp`}>
          {cards.map((card, index) => {
            const isMatched = matched.has(card.pairId)
            const isUp = isMatched || open.includes(index)
            return (
              <button
                key={card.uid}
                type="button"
                className={`mf-card ${isUp ? 'is-up' : ''} ${isMatched ? 'is-matched' : ''}`}
                onClick={() => flip(index)}
                aria-label={isUp ? `${card.face.text}${card.face.tag ? ` (${card.face.tag})` : ''}` : `Thẻ úp số ${index + 1}`}
                aria-pressed={isUp}
                disabled={isMatched}
              >
                <span className="mf-card__inner">
                  <span className="mf-card__back" aria-hidden="true">
                    <span className="mf-card__logo">?</span>
                  </span>
                  <span className="mf-card__face" aria-hidden="true">
                    {card.face.tag && <span className="mf-card__tag">{card.face.tag}</span>}
                    <span className="mf-card__emoji">{card.face.emoji}</span>
                    <span className="mf-card__text">{card.face.text}</span>
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mf__footer">
        <span>
          Đã ghép <strong>{matched.size}</strong>/{totalPairs} cặp
        </span>
        <button type="button" className="btn btn--sm" onClick={() => reset(deckId)}>
          Xáo lại bàn
        </button>
      </div>
    </div>
  )
}
