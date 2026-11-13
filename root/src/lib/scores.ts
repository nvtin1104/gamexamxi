import { useSyncExternalStore } from 'react'
import { readJson, writeJson } from './storage'

const SCORES_KEY = 'gx:scores'
const PLAYS_KEY = 'gx:plays'
const CHANGE_EVENT = 'gx:scores-change'

export const MAX_REPORTED_SCORE = 1_000_000

type ScoreMap = Record<string, number>

let cache: ScoreMap | null = null

function load(): ScoreMap {
  if (!cache) {
    const raw = readJson<unknown>(SCORES_KEY, {})
    cache = {}
    if (raw && typeof raw === 'object') {
      for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0) cache[id] = Math.floor(value)
      }
    }
  }
  return cache
}

function emit() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function getBest(gameId: string): number {
  return load()[gameId] ?? 0
}

export function getTotal(): number {
  return Object.values(load()).reduce((sum, value) => sum + value, 0)
}

/** Ghi điểm cao nhất của một game. Trả về `true` nếu là kỷ lục mới. */
export function recordBest(gameId: string, score: number): boolean {
  const safe = Math.max(0, Math.min(MAX_REPORTED_SCORE, Math.floor(score)))
  const scores = load()
  if (safe <= (scores[gameId] ?? 0)) return false
  cache = { ...scores, [gameId]: safe }
  writeJson(SCORES_KEY, cache)
  emit()
  return true
}

export function getPlays(): number {
  return readJson<number>(PLAYS_KEY, 0)
}

export function countPlay(): void {
  writeJson(PLAYS_KEY, getPlays() + 1)
  emit()
}

function subscribe(callback: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === SCORES_KEY) {
      cache = null
      callback()
    }
  }
  window.addEventListener(CHANGE_EVENT, callback)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback)
    window.removeEventListener('storage', onStorage)
  }
}

export function useTotalScore(): number {
  return useSyncExternalStore(subscribe, getTotal, () => 0)
}

export function useBestScore(gameId: string): number {
  return useSyncExternalStore(subscribe, () => getBest(gameId), () => 0)
}

export function usePlays(): number {
  return useSyncExternalStore(subscribe, getPlays, () => 0)
}
