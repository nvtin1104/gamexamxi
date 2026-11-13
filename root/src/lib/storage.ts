/**
 * localStorage an toàn: chế độ ẩn danh / chặn cookie có thể ném lỗi,
 * nên mọi thao tác đều bọc try/catch và trả về giá trị mặc định.
 */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Bỏ qua: trình duyệt không cho lưu, game vẫn chạy bình thường
  }
}
