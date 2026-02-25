// ─── Array Chunking ──────────────────────────────────────────

export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

// ─── Current Week Key ─────────────────────────────────────────

export function getWeekKey(date = new Date()): string {
  const year = date.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const weekNumber = Math.ceil(
    ((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  )
  return `${year}-W${String(weekNumber).padStart(2, '0')}`
}

// ─── Response Helpers ─────────────────────────────────────────

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message, ok: false }, { status })
}

export function jsonOk<T>(data: T, status = 200) {
  return Response.json({ data, ok: true }, { status })
}
