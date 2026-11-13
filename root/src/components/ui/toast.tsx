import { useEffect, useState } from 'react'

export type ToastKind = 'info' | 'success' | 'error' | 'score'

interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

const TOAST_EVENT = 'gx:toast'
let nextId = 1

/** Hiện thông báo ngắn ở cuối màn hình (thay cho thư viện toast). */
export function toast(message: string, kind: ToastKind = 'info'): void {
  window.dispatchEvent(new CustomEvent<ToastItem>(TOAST_EVENT, { detail: { id: nextId++, kind, message } }))
}

const ICONS: Record<ToastKind, string> = { info: '💬', success: '✅', error: '⚠️', score: '⭐' }

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    const timers = new Set<number>()
    const onToast = (event: Event) => {
      const item = (event as CustomEvent<ToastItem>).detail
      setItems((prev) => [...prev.slice(-2), item])
      const timer = window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== item.id))
        timers.delete(timer)
      }, 3600)
      timers.add(timer)
    }
    window.addEventListener(TOAST_EVENT, onToast)
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast)
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [])

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className={`toast toast--${item.kind}`}>
          <span aria-hidden="true">{ICONS[item.kind]}</span>
          {item.message}
        </div>
      ))}
    </div>
  )
}
