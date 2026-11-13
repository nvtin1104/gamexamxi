import { useId, useState, type ChangeEvent, type FormEvent } from 'react'
import { Lightbulb, Send } from 'lucide-react'
import { toast } from '@/components/ui/toast'
import {
  submitContact,
  TOPIC_LABELS,
  validateContact,
  type ContactData,
  type ContactErrors,
  type ContactTopic,
} from '../contact-service'

const EMPTY: ContactData = { name: '', contact: '', topic: 'game-idea', message: '' }

export function Contact() {
  const [data, setData] = useState<ContactData>(EMPTY)
  const [errors, setErrors] = useState<ContactErrors>({})
  const [touched, setTouched] = useState(false)
  const [sending, setSending] = useState(false)
  const [honeypot, setHoneypot] = useState('')
  const ids = { name: useId(), contact: useId(), message: useId() }

  const update =
    (key: keyof ContactData) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const next = { ...data, [key]: event.target.value }
      setData(next)
      if (touched) setErrors(validateContact(next))
    }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTouched(true)
    const found = validateContact(data)
    setErrors(found)
    const firstInvalid = (Object.keys(found) as (keyof ContactData)[])[0]
    if (firstInvalid) {
      document.getElementById(ids[firstInvalid as 'name' | 'contact' | 'message'])?.focus()
      toast('Kiểm tra lại các ô được đánh dấu nhé.', 'error')
      return
    }
    if (honeypot) return // bot điền trường ẩn

    setSending(true)
    try {
      const result = await submitContact(data)
      toast(
        result.channel === 'mailto'
          ? 'Đã mở ứng dụng email — bấm Gửi để hoàn tất nhé!'
          : 'Cảm ơn bạn! Góp ý đã được ghi nhận.',
        'success',
      )
      setData(EMPTY)
      setTouched(false)
      setErrors({})
    } catch {
      toast('Không gửi được, bạn thử lại sau nhé.', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <section id="lien-he" className="section" aria-labelledby="contact-title">
      <div className="contact">
        <div className="nb-card contact__aside bg-butter">
          <p className="section__eyebrow">Liên hệ & Góp ý</p>
          <h2 id="contact-title" className="section__title">
            Bạn muốn chơi game gì tiếp theo?
          </h2>
          <p>
            Đề xuất một mini-game cho lớp bạn, góp ý để game hay hơn, hoặc liên hệ hợp tác làm game học tập. Mọi ý
            tưởng đều được đọc!
          </p>
          <ul className="contact__ideas">
            <li>
              <Lightbulb size={18} aria-hidden="true" /> "Game ghép công thức Hóa học"
            </li>
            <li>
              <Lightbulb size={18} aria-hidden="true" /> "Đua xe giải phương trình"
            </li>
            <li>
              <Lightbulb size={18} aria-hidden="true" /> "Đố vui Lịch sử theo nhóm"
            </li>
          </ul>
        </div>

        <form className="nb-card contact__form" noValidate onSubmit={handleSubmit}>
          <div className="contact__row">
            <div className="field">
              <label className="field__label" htmlFor={ids.name}>
                Tên của bạn
              </label>
              <input
                id={ids.name}
                className="field__input"
                autoComplete="name"
                value={data.name}
                onChange={update('name')}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? `${ids.name}-err` : undefined}
                placeholder="Ví dụ: Minh Anh"
              />
              {errors.name && (
                <span id={`${ids.name}-err`} className="field__error">
                  {errors.name}
                </span>
              )}
            </div>

            <div className="field">
              <label className="field__label" htmlFor={ids.contact}>
                Email hoặc mạng xã hội
              </label>
              <input
                id={ids.contact}
                className="field__input"
                autoComplete="email"
                inputMode="email"
                value={data.contact}
                onChange={update('contact')}
                aria-invalid={Boolean(errors.contact)}
                aria-describedby={errors.contact ? `${ids.contact}-err` : `${ids.contact}-hint`}
                placeholder="ban@vidu.com hoặc @tenban"
              />
              {errors.contact ? (
                <span id={`${ids.contact}-err`} className="field__error">
                  {errors.contact}
                </span>
              ) : (
                <span id={`${ids.contact}-hint`} className="field__hint">
                  Chỉ dùng để phản hồi bạn.
                </span>
              )}
            </div>
          </div>

          <fieldset className="field contact__topics">
            <legend className="field__label">Bạn muốn</legend>
            <div className="segmented">
              {(Object.keys(TOPIC_LABELS) as ContactTopic[]).map((topic) => (
                <button
                  key={topic}
                  type="button"
                  className="segmented__item"
                  aria-pressed={data.topic === topic}
                  onClick={() => setData({ ...data, topic })}
                >
                  {TOPIC_LABELS[topic]}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="field">
            <label className="field__label" htmlFor={ids.message}>
              Nội dung
            </label>
            <textarea
              id={ids.message}
              className="field__input"
              value={data.message}
              onChange={update('message')}
              aria-invalid={Boolean(errors.message)}
              aria-describedby={`${ids.message}-count${errors.message ? ` ${ids.message}-err` : ''}`}
              placeholder="Kể cho mình nghe ý tưởng của bạn…"
              maxLength={1000}
            />
            <div className="contact__meta">
              {errors.message ? (
                <span id={`${ids.message}-err`} className="field__error">
                  {errors.message}
                </span>
              ) : (
                <span />
              )}
              <span id={`${ids.message}-count`} className="field__hint">
                {data.message.trim().length}/1000
              </span>
            </div>
          </div>

          {/* Honeypot chống bot — người dùng thật không thấy trường này */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="contact__hp"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
          />

          <button type="submit" className="btn btn--sage btn--lg contact__submit" disabled={sending}>
            {sending ? 'Đang gửi…' : 'Gửi cho Gamexamxi'} <Send size={18} aria-hidden="true" />
          </button>
        </form>
      </div>
    </section>
  )
}
