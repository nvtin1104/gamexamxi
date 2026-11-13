import { Mail, Star } from 'lucide-react'
import { Link, navigate } from '@/router/router'
import { useTotalScore } from '@/lib/scores'
import { CATALOG_FILTERS, type CatalogFilter } from '../game-registry'

interface NavBarProps {
  filter: CatalogFilter
  onFilter: (filter: CatalogFilter) => void
}

export function NavBar({ filter, onFilter }: NavBarProps) {
  const total = useTotalScore()

  return (
    <header className="nav">
      <div className="nav__row">
        <Link href="/" className="nav__logo" aria-label="Gamexamxi — Trang chủ">
          <span className="nav__logo-mark" aria-hidden="true">
            🛸
          </span>
          <span>Gamexamxi</span>
        </Link>

        <nav className="nav__tabs" aria-label="Lọc kho game">
          {CATALOG_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="segmented__item"
              aria-pressed={filter === item.id}
              onClick={() => onFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="nav__actions">
          <span className="pill" title="Tổng điểm cao nhất của bạn ở mọi game (lưu trên trình duyệt này)">
            <Star size={16} fill="currentColor" aria-hidden="true" />
            <span className="sr-only">Tổng điểm:</span>
            {total.toLocaleString('vi-VN')}
          </span>
          <a
            href="#lien-he"
            className="btn btn--sm nav__contact"
            onClick={(event) => {
              event.preventDefault()
              navigate(`/${window.location.search}#lien-he`, { scroll: false })
            }}
          >
            <Mail size={16} aria-hidden="true" />
            <span className="nav__contact-label">Liên hệ</span>
          </a>
        </div>
      </div>
    </header>
  )
}
