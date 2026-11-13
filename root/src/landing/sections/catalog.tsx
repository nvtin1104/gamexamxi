import type { KeyboardEvent } from 'react'
import { CATALOG_FILTERS, filterGames, type CatalogFilter } from '../game-registry'
import { GameCard } from './game-card'

interface CatalogProps {
  filter: CatalogFilter
  onFilter: (filter: CatalogFilter) => void
}

export function Catalog({ filter, onFilter }: CatalogProps) {
  const games = filterGames(filter)

  // Điều hướng tab bằng phím mũi tên (chuẩn ARIA tabs)
  const onTabKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const index = CATALOG_FILTERS.findIndex((f) => f.id === filter)
    const step = event.key === 'ArrowRight' ? 1 : -1
    const next = CATALOG_FILTERS[(index + step + CATALOG_FILTERS.length) % CATALOG_FILTERS.length]
    if (!next) return
    onFilter(next.id)
    document.getElementById(`tab-${next.id}`)?.focus()
  }

  return (
    <section id="kho-game" className="section" aria-labelledby="catalog-title">
      <div className="section__head catalog__head">
        <div>
          <p className="section__eyebrow">Kho game</p>
          <h2 id="catalog-title" className="section__title">
            Chọn một game và bắt đầu thôi!
          </h2>
        </div>
        <div className="tabs" role="tablist" aria-label="Lọc kho game" onKeyDown={onTabKey}>
          {CATALOG_FILTERS.map((item) => {
            const selected = filter === item.id
            return (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                type="button"
                role="tab"
                className="tabs__item"
                aria-selected={selected}
                aria-controls="catalog-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => onFilter(item.id)}
              >
                {item.label}
                <span className="tabs__count" aria-label={`${filterGames(item.id).length} game`}>
                  {filterGames(item.id).length}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="catalog__legend">
        <span className="badge bg-sage">⚡ Mini-game tích hợp — chơi ngay trên trang này</span>
        <span className="badge bg-lavender">↗ Web Game độc lập — mở thế giới riêng</span>
      </div>

      <div id="catalog-panel" role="tabpanel" aria-labelledby={`tab-${filter}`}>
        {games.length > 0 ? (
          <div className="catalog__grid">
            {games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <div className="nb-card catalog__empty">Chưa có game nào trong mục này. Quay lại sau nhé!</div>
        )}
      </div>
    </section>
  )
}
