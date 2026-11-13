import { ArrowUpRight, Clock, Hourglass, Play, Zap } from 'lucide-react'
import { Link } from '@/router/router'
import { useBestScore } from '@/lib/scores'
import { buildExternalUrl, type GameEntry, type GameTag } from '../game-registry'

const TAG_LABELS: Record<GameTag, string> = {
  quick: 'Chơi nhanh',
  study: 'Học tập',
  '3d': 'Mô phỏng 3D',
}

export function GameCard({ game }: { game: GameEntry }) {
  const best = useBestScore(game.id)
  const comingSoon = game.status === 'coming-soon'
  const isInternal = game.type === 'internal'

  const body = (
    <>
      <div className={`game-card__thumb bg-${game.accent}`}>
        <span className="game-card__emoji" aria-hidden="true">
          {game.emoji}
        </span>
        <span className={`badge game-card__type ${isInternal ? 'bg-sage' : 'bg-lavender'}`}>
          {isInternal ? (
            <>
              <Zap size={13} aria-hidden="true" /> Mini-game tích hợp
            </>
          ) : (
            <>
              <ArrowUpRight size={13} aria-hidden="true" /> Web Game độc lập
            </>
          )}
        </span>
      </div>

      <div className="game-card__body">
        <h3 className="game-card__title">{game.title}</h3>
        <p className="game-card__desc">{game.description}</p>
        <div className="game-card__tags">
          {game.tags.map((tag) => (
            <span key={tag} className="badge bg-sand">
              {TAG_LABELS[tag]}
            </span>
          ))}
          <span className="badge bg-sand">
            <Clock size={12} aria-hidden="true" /> {game.duration}
          </span>
        </div>
        <div className="game-card__foot">
          {best > 0 ? (
            <span className="badge bg-butter">⭐ Kỷ lục: {best.toLocaleString('vi-VN')}</span>
          ) : (
            <span className="game-card__hint">{comingSoon ? 'Đang được xây dựng' : 'Chưa có kỷ lục'}</span>
          )}
          <span className={`game-card__cta ${comingSoon ? '' : isInternal ? 'bg-sage' : 'bg-lavender'}`}>
            {comingSoon ? (
              <>
                <Hourglass size={14} aria-hidden="true" /> Sắp ra mắt
              </>
            ) : isInternal ? (
              <>
                <Play size={14} fill="currentColor" aria-hidden="true" /> Chơi ngay
              </>
            ) : (
              <>
                Mở thế giới <ArrowUpRight size={14} aria-hidden="true" />
              </>
            )}
          </span>
        </div>
      </div>
    </>
  )

  if (comingSoon) {
    return (
      <article className="nb-card game-card game-card--soon" aria-disabled="true">
        {body}
      </article>
    )
  }

  if (game.type === 'internal') {
    return (
      <Link href={game.route} className="nb-card nb-press game-card" aria-label={`Chơi ${game.title}`}>
        {body}
      </Link>
    )
  }

  return (
    <a
      href={buildExternalUrl(game)}
      className="nb-card nb-press game-card"
      aria-label={`Mở web game ${game.title} (trang riêng)`}
    >
      {body}
    </a>
  )
}
