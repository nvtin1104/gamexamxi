import { useEffect, useState } from 'react'
import { BookOpen, Gamepad2, Mail, Menu, Star, X, type LucideIcon } from 'lucide-react'
import { Link, navigate } from '@/router/router'
import { useTotalScore } from '@/lib/scores'

interface NavLink {
  id: string
  label: string
  icon: LucideIcon
}

const LINKS: NavLink[] = [
  { id: 'kho-game', label: 'Kho game', icon: Gamepad2 },
  { id: 'gioi-thieu', label: 'Giới thiệu', icon: BookOpen },
  { id: 'lien-he', label: 'Liên hệ', icon: Mail },
]

/** Theo dõi section đang hiển thị để tô sáng mục menu tương ứng. */
function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    const visible = new Map<string, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.intersectionRatio)
          else visible.delete(entry.target.id)
        }
        // Section xuất hiện sớm nhất theo thứ tự trang thắng
        setActive(ids.find((id) => visible.has(id)) ?? null)
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: [0, 0.25, 0.5, 1] },
    )
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [ids])

  return active
}

export function NavBar() {
  const total = useTotalScore()
  const active = useActiveSection(LINKS.map((l) => l.id))
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false)
    const onResize = () => window.innerWidth > 720 && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [menuOpen])

  const goTo = (id: string) => {
    setMenuOpen(false)
    navigate(`/${window.location.search}#${id}`, { scroll: false })
  }

  const renderLinks = (variant: 'bar' | 'sheet') =>
    LINKS.map(({ id, label, icon: Icon }) => (
      <a
        key={id}
        href={`#${id}`}
        className={`nav__link nav__link--${variant}`}
        aria-current={active === id ? 'true' : undefined}
        onClick={(event) => {
          event.preventDefault()
          goTo(id)
        }}
      >
        <Icon size={variant === 'bar' ? 16 : 18} aria-hidden="true" />
        {label}
      </a>
    ))

  return (
    <header className="nav">
      <div className="nav__row">
        <Link
          href="/"
          className="nav__logo"
          aria-label="Gamexamxi — Trang chủ"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <span className="nav__logo-mark" aria-hidden="true">
            🛸
          </span>
          <span>Gamexamxi</span>
        </Link>

        <nav className="nav__links" aria-label="Điều hướng chính">
          {renderLinks('bar')}
        </nav>

        <div className="nav__actions">
          <span className="pill nav__score" title="Tổng điểm cao nhất của bạn ở mọi game (lưu trên trình duyệt này)">
            <Star size={16} fill="currentColor" aria-hidden="true" />
            <span className="sr-only">Tổng điểm:</span>
            {total.toLocaleString('vi-VN')}
          </span>
          <a
            href="#kho-game"
            className="btn btn--sage nav__cta"
            onClick={(event) => {
              event.preventDefault()
              goTo('kho-game')
            }}
          >
            <Gamepad2 size={18} aria-hidden="true" /> Chơi ngay
          </a>
          <button
            type="button"
            className="btn btn--icon nav__menu-btn"
            aria-expanded={menuOpen}
            aria-controls="nav-sheet"
            aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="nav-sheet" className="nav__sheet nb-card" aria-label="Menu">
          {renderLinks('sheet')}
        </nav>
      )}
    </header>
  )
}
