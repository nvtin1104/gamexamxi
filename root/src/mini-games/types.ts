/** Hợp đồng chung giữa GameShell và mỗi mini-game tích hợp. */
export interface MiniGameProps {
  /** Điểm hiện tại (live) — hiển thị trên header GameShell. */
  onScore: (score: number) => void
  /** Ván chơi kết thúc — GameShell ghi kỷ lục và mở modal kết quả. */
  onGameOver: (result: GameResult) => void
  /** Tăng mỗi khi người chơi bấm "Chơi lại" từ modal kết quả. */
  restartKey: number
  /** Game tạm dừng (modal đang mở) — game nên dừng đồng hồ/vòng lặp. */
  paused: boolean
}

export interface GameResult {
  score: number
  /** Dòng mô tả ngắn hiển thị trong modal, ví dụ "16 lượt · 42 giây". */
  summary?: string
}
