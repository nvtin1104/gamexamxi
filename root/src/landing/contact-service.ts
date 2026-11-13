/**
 * Adapter gửi form liên hệ. Hiện tại hub là trang tĩnh thuần (không backend):
 *  - Có `VITE_CONTACT_EMAIL` → mở ứng dụng email với nội dung đã điền sẵn (mailto:).
 *  - Không có → chỉ xác nhận phía client.
 *
 * Khi cần backend sau này: thay thân hàm `submitContact` bằng
 *   fetch('/api/contact', { method: 'POST', body: JSON.stringify(data) })
 * và thêm Pages Function `functions/api/contact.ts` — giao diện form không phải đổi.
 */

export type ContactTopic = 'game-idea' | 'partnership' | 'feedback'

export interface ContactData {
  name: string
  contact: string
  topic: ContactTopic
  message: string
}

export const TOPIC_LABELS: Record<ContactTopic, string> = {
  'game-idea': 'Đề xuất game mới',
  partnership: 'Liên hệ hợp tác',
  feedback: 'Góp ý / báo lỗi',
}

export type ContactErrors = Partial<Record<keyof ContactData, string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const HANDLE_RE = /^@[\w.]{2,30}$/
const URL_RE = /^https?:\/\/[^\s]+\.[^\s]{2,}$/i

export function validateContact(data: ContactData): ContactErrors {
  const errors: ContactErrors = {}
  const name = data.name.trim()
  const contact = data.contact.trim()
  const message = data.message.trim()

  if (!name) errors.name = 'Bạn chưa nhập tên.'
  else if (name.length < 2) errors.name = 'Tên cần ít nhất 2 ký tự.'
  else if (name.length > 60) errors.name = 'Tên tối đa 60 ký tự.'

  if (!contact) errors.contact = 'Hãy để lại email hoặc mạng xã hội để mình phản hồi.'
  else if (!EMAIL_RE.test(contact) && !HANDLE_RE.test(contact) && !URL_RE.test(contact))
    errors.contact = 'Nhập email (ban@vidu.com), tài khoản (@tenban) hoặc đường link hồ sơ.'

  if (!message) errors.message = 'Bạn chưa viết nội dung.'
  else if (message.length < 10) errors.message = 'Nội dung hơi ngắn — viết thêm chút nữa nhé (ít nhất 10 ký tự).'
  else if (message.length > 1000) errors.message = 'Nội dung tối đa 1000 ký tự.'

  return errors
}

export type SubmitResult = { channel: 'mailto' } | { channel: 'local' }

export async function submitContact(data: ContactData): Promise<SubmitResult> {
  const to = import.meta.env.VITE_CONTACT_EMAIL as string | undefined
  if (to) {
    const subject = `[Gamexamxi] ${TOPIC_LABELS[data.topic]} — ${data.name.trim()}`
    const body = `Tên: ${data.name.trim()}\nLiên hệ: ${data.contact.trim()}\nChủ đề: ${TOPIC_LABELS[data.topic]}\n\n${data.message.trim()}`
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    return { channel: 'mailto' }
  }
  // Mô phỏng độ trễ mạng để UI trạng thái "đang gửi" hoạt động như thật
  await new Promise((resolve) => setTimeout(resolve, 500))
  return { channel: 'local' }
}
