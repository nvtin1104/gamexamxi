import { CATALOG_FILTERS, filterGames, type CatalogFilter } from '../game-registry'
import { GameCard } from './game-card'

interface CatalogProps {
  filter: CatalogFilter
  onFilter: (filter: CatalogFilter) => void
}

export function Catalog({ filter, onFilter }: CatalogProps) {
  const games = filterGames(filter)

  return (
    <section id="kho-game" className="section" aria-labelledby="catalog-title">
      <div className="section__head">
        <div>
          <p className="section__eyebrow">Kho game</p>
          <h2 id="catalog-title" className="section__title">
            Chọn một game và bắt đầu thôi!
          </h2>
        </div>
        <div className="segmented catalog__filters" role="group" aria-label="Lọc kho game">
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
        </div>
      </div>

      <div className="catalog__legend">
        <span className="badge bg-sage">⚡ Mini-game tích hợp — chơi ngay trên trang này</span>
        <span className="badge bg-lavender">↗ Web Game độc lập — mở thế giới riêng</span>
      </div>

      {games.length > 0 ? (
        <div className="catalog__grid">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <div className="nb-card catalog__empty">Chưa có game nào trong mục này. Quay lại sau nhé!</div>
      )}
    </section>
  )
}
