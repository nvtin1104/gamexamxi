import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return inputs
    .flat()
    .filter(Boolean)
    .join(' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function formatPoints(points: number): string {
  if (points >= 1_000_000) return `${(points / 1_000_000).toFixed(1)}M`
  if (points >= 1_000) return `${(points / 1_000).toFixed(1)}K`
  return points.toString()
}

export function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function timeUntil(date: string): string {
  const diff = new Date(date).getTime() - Date.now()
  if (diff <= 0) return 'Ended'
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  if (hours > 24) return `${Math.floor(hours / 24)}d left`
  if (hours > 0) return `${hours}h ${minutes}m left`
  return `${minutes}m left`
}

export function getGroupTheme(style: string): string {
  const themes: Record<string, string> = {
    FRIENDS: 'bg-friends',
    COUPLE: 'bg-couple',
    FAMILY: 'bg-family',
  }
  return themes[style] ?? 'bg-primary'
}

export function getRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    COMMON: 'bg-surface text-dark',
    RARE: 'bg-secondary text-dark',
    EPIC: 'bg-primary text-white',
    LEGENDARY: 'bg-dark text-secondary',
  }
  return colors[rarity] ?? 'bg-surface text-dark'
}
