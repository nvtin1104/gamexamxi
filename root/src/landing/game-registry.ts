import type { ComponentType } from 'react'
import type { MiniGameProps } from '@/mini-games/types'

/**
 * Registry lai cho toàn bộ hệ sinh thái.
 *  - `internal`      : mini-game nằm trong `src/mini-games/`, lazy-load bằng dynamic import(),
 *                      chạy bên trong GameShell tại `/play/<id>`.
 *  - `external-web`  : web game độc lập (Pages project / subdomain riêng). Hub chỉ dẫn link,
 *                      kèm query `?theme=...&ref=hub&return=<origin hub>`.
 */

export type Accent = 'sage' | 'butter' | 'sky' | 'coral' | 'lavender'
export type GameTag = 'quick' | 'study' | '3d'
export type GameStatus = 'live' | 'coming-soon'

interface BaseEntry {
  id: string
  title: string
  description: string
  emoji: string
  accent: Accent
  tags: GameTag[]
  /** Thời lượng ước tính một ván, hiển thị trên thẻ. */
  duration: string
  featured?: boolean
  status: GameStatus
}

export interface InstructionStep {
  icon: string
  text: string
}

export interface InternalGame extends BaseEntry {
  type: 'internal'
  route: `/play/${string}`
  instructions: InstructionStep[]
  load: () => Promise<{ default: ComponentType<MiniGameProps> }>
}

export interface ExternalWebGame extends BaseEntry {
  type: 'external-web'
  url: string
  params?: Record<string, string>
}

export type GameEntry = InternalGame | ExternalWebGame

export const GAME_REGISTRY: GameEntry[] = [
  {
    id: 'ufo-abduction-3d',
    type: 'internal',
    route: '/play/ufo-abduction-3d',
    title: 'UFO Bắt Cóc Sân Trường',
    description: 'Lái đĩa bay 3D, bật tia hút và gom bạn bè lên tàu trong 60 giây. Ai cũng hoảng loạn chạy tán loạn!',
    emoji: '🛸',
    accent: 'sky',
    tags: ['quick', '3d'],
    duration: '60 giây',
    featured: true,
    status: 'live',
    instructions: [
      { icon: '⌨️', text: 'Di chuyển bằng W A S D hoặc phím mũi tên. Trên điện thoại: chạm và kéo trên sân.' },
      { icon: '🔦', text: 'Giữ Space hoặc chuột trái (nút "Tia hút" trên điện thoại) để bật tia hút.' },
      { icon: '🌀', text: 'Học sinh và đồ vật trong tia sẽ xoắn ốc bay lên. Thả tia thì chúng rơi xuống.' },
      { icon: '🔥', text: 'Hút liên tiếp trong 2,5 giây để giữ combo và nhân điểm.' },
    ],
    load: () => import('@/mini-games/ufo-abduction-3d'),
  },
  {
    id: 'memory-flip',
    type: 'internal',
    route: '/play/memory-flip',
    title: 'Lật Thẻ Trí Nhớ',
    description: 'Lật thẻ tìm cặp: từ vựng Anh – Việt hoặc biểu tượng học đường. Giữ chuỗi combo để nhân điểm.',
    emoji: '🃏',
    accent: 'sage',
    tags: ['quick', 'study'],
    duration: '2–3 phút',
    status: 'live',
    instructions: [
      { icon: '👆', text: 'Lật hai thẻ mỗi lượt. Hai thẻ khớp nhau sẽ được giữ lại.' },
      { icon: '📚', text: 'Bộ "Từ vựng": ghép từ tiếng Anh với nghĩa tiếng Việt.' },
      { icon: '🔥', text: 'Ghép đúng liên tiếp để tăng combo — mỗi cặp sau được nhiều điểm hơn.' },
      { icon: '⏱️', text: 'Hoàn thành càng nhanh, ít lượt càng nhiều điểm thưởng.' },
    ],
    load: () => import('@/mini-games/memory-flip'),
  },
  {
    id: 'hoc-vien-phieu-luu',
    type: 'external-web',
    title: 'Học Viện Phiêu Lưu',
    description: 'RPG thế giới mở: khám phá học viện, giải câu đố môn học để mở khóa vùng đất mới.',
    emoji: '🏰',
    accent: 'lavender',
    tags: ['study'],
    duration: 'Nhiều buổi',
    status: 'coming-soon',
    url: 'https://rpg.gamexamxi.com',
    params: { theme: 'soft-brutal', ref: 'hub' },
  },
  {
    id: 'thanh-pho-toan-hoc',
    type: 'external-web',
    title: 'Thành Phố Toán Học',
    description: 'Xây thành phố bằng phép tính: mỗi bài toán đúng là một tòa nhà mới mọc lên.',
    emoji: '🏙️',
    accent: 'lavender',
    tags: ['study'],
    duration: '10 phút',
    status: 'coming-soon',
    url: 'https://math.gamexamxi.com',
    params: { theme: 'soft-brutal', ref: 'hub' },
  },
]

export function findGame(id: string): GameEntry | undefined {
  return GAME_REGISTRY.find((game) => game.id === id)
}

export function findInternalGame(id: string): InternalGame | undefined {
  const game = findGame(id)
  return game?.type === 'internal' ? game : undefined
}

/** URL đầy đủ để mở web game độc lập, kèm tham số và địa chỉ quay lại hub. */
export function buildExternalUrl(game: ExternalWebGame): string {
  const url = new URL(game.url)
  for (const [key, value] of Object.entries(game.params ?? {})) url.searchParams.set(key, value)
  url.searchParams.set('return', window.location.origin)
  return url.toString()
}

/** Origin của các web game độc lập — dùng làm allowlist cho postMessage. */
export function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>()
  for (const game of GAME_REGISTRY) {
    if (game.type === 'external-web') {
      try {
        origins.add(new URL(game.url).origin)
      } catch {
        // URL sai định dạng — bỏ qua
      }
    }
  }
  return origins
}

export type CatalogFilter = 'all' | 'internal' | 'external' | 'study'

export const CATALOG_FILTERS: { id: CatalogFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'internal', label: 'Chơi nhanh tại chỗ' },
  { id: 'external', label: 'Web Game Mở Rộng' },
  { id: 'study', label: 'Học tập' },
]

export function filterGames(filter: CatalogFilter): GameEntry[] {
  switch (filter) {
    case 'internal':
      return GAME_REGISTRY.filter((g) => g.type === 'internal')
    case 'external':
      return GAME_REGISTRY.filter((g) => g.type === 'external-web')
    case 'study':
      return GAME_REGISTRY.filter((g) => g.tags.includes('study'))
    default:
      return GAME_REGISTRY
  }
}

export function isCatalogFilter(value: string | null): value is CatalogFilter {
  return CATALOG_FILTERS.some((f) => f.id === value)
}
