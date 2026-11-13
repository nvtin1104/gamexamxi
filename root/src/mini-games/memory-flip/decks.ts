export type DeckId = 'vocab' | 'icons'

export interface CardFace {
  /** Nội dung chính trên thẻ */
  text: string
  /** Emoji minh họa */
  emoji: string
  /** Nhãn nhỏ góc thẻ, ví dụ "EN" / "VI" */
  tag?: string
}

export interface PairDef {
  id: string
  a: CardFace
  b: CardFace
}

export interface Deck {
  id: DeckId
  label: string
  hint: string
  pairs: PairDef[]
}

const vocab = (id: string, emoji: string, en: string, vi: string): PairDef => ({
  id,
  a: { text: en, emoji, tag: 'EN' },
  b: { text: vi, emoji, tag: 'VI' },
})

const icon = (id: string, emoji: string, label: string): PairDef => ({
  id,
  a: { text: label, emoji },
  b: { text: label, emoji },
})

export const DECKS: Record<DeckId, Deck> = {
  vocab: {
    id: 'vocab',
    label: 'Từ vựng Anh – Việt',
    hint: 'Ghép từ tiếng Anh với nghĩa tiếng Việt',
    pairs: [
      vocab('teacher', '👩‍🏫', 'Teacher', 'Giáo viên'),
      vocab('homework', '📝', 'Homework', 'Bài tập về nhà'),
      vocab('library', '📚', 'Library', 'Thư viện'),
      vocab('classroom', '🏫', 'Classroom', 'Lớp học'),
      vocab('friend', '🤝', 'Friend', 'Bạn bè'),
      vocab('science', '🔬', 'Science', 'Khoa học'),
      vocab('notebook', '📓', 'Notebook', 'Quyển vở'),
      vocab('break', '⏰', 'Break time', 'Giờ ra chơi'),
    ],
  },
  icons: {
    id: 'icons',
    label: 'Biểu tượng Học đường',
    hint: 'Tìm hai thẻ giống hệt nhau',
    pairs: [
      icon('books', '📚', 'Sách'),
      icon('pencil', '✏️', 'Bút chì'),
      icon('bag', '🎒', 'Cặp sách'),
      icon('microscope', '🔬', 'Kính hiển vi'),
      icon('abacus', '🧮', 'Bàn tính'),
      icon('palette', '🎨', 'Mỹ thuật'),
      icon('ball', '⚽', 'Thể dục'),
      icon('lunch', '🍱', 'Cơm trưa'),
    ],
  },
}

export interface CardInstance {
  uid: number
  pairId: string
  face: CardFace
}

/** Tạo 16 thẻ (8 cặp) và xáo bằng Fisher–Yates. */
export function buildBoard(deck: Deck): CardInstance[] {
  const cards: CardInstance[] = []
  let uid = 0
  for (const pair of deck.pairs) {
    cards.push({ uid: uid++, pairId: pair.id, face: pair.a })
    cards.push({ uid: uid++, pairId: pair.id, face: pair.b })
  }
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const a = cards[i]
    const b = cards[j]
    if (a && b) {
      cards[i] = b
      cards[j] = a
    }
  }
  return cards
}
