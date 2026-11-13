import { ArrowDown, Gamepad2, Play, Sparkles, Trophy } from 'lucide-react'
import { Link, navigate } from '@/router/router'
import { usePlays } from '@/lib/scores'
import { GAME_REGISTRY, type InternalGame } from '../game-registry'

const liveCount = GAME_REGISTRY.filter((g) => g.status === 'live').length
const spotlight = GAME_REGISTRY.find((g): g is InternalGame => g.type === 'internal' && Boolean(g.featured))

export function Hero() {
  const plays = usePlays()

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="nb-card hero__intro">
        <span className="badge bg-butter">
          <Sparkles size={14} aria-hidden="true" /> Dành cho học sinh · Miễn phí
        </span>
        <h1 id="hero-title" className="hero__title">
          Giờ ra chơi <mark className="hero__mark">5 phút</mark>, vui hết cỡ — học cũng dễ vào hơn.
        </h1>
        <p className="hero__lead">
          Gamexamxi là kho mini-game chơi ngay trên trình duyệt: không cài đặt, không cần tài khoản. Lật thẻ ôn từ
          vựng, lái UFO 3D, và sắp tới là những thế giới web game rộng lớn hơn.
        </p>
        <div className="hero__ctas">
          <a
            href="#kho-game"
            className="btn btn--sage btn--lg"
            onClick={(event) => {
              event.preventDefault()
              navigate(`/${window.location.search}#kho-game`, { scroll: false })
            }}
          >
            Khám phá kho game <ArrowDown size={18} aria-hidden="true" />
          </a>
          <Link href="/play/memory-flip" className="btn btn--lg">
            Ôn từ vựng ngay
          </Link>
        </div>
        <dl className="hero__stats">
          <div className="hero__stat bg-sand">
            <dt>
              <Gamepad2 size={16} aria-hidden="true" /> Game đang mở
            </dt>
            <dd>{liveCount}</dd>
          </div>
          <div className="hero__stat bg-sand">
            <dt>
              <Trophy size={16} aria-hidden="true" /> Lượt bạn đã chơi
            </dt>
            <dd>{plays.toLocaleString('vi-VN')}</dd>
          </div>
          <div className="hero__stat bg-sand">
            <dt>
              <Sparkles size={16} aria-hidden="true" /> Thế giới sắp mở
            </dt>
            <dd>{GAME_REGISTRY.filter((g) => g.status === 'coming-soon').length}</dd>
          </div>
        </dl>
      </div>

      {spotlight && (
        <article className="nb-card hero__spotlight bg-sky" aria-labelledby="spotlight-title">
          <div className="hero__spotlight-head">
            <span className="badge bg-butter">⭐ Nổi bật tuần này</span>
            <span className="badge">3D · {spotlight.duration}</span>
          </div>

          <div className="ufo-preview" aria-hidden="true">
            <div className="ufo-preview__stars" />
            <div className="ufo-preview__ship">
              <div className="ufo-preview__dome" />
              <div className="ufo-preview__disc">
                <i />
                <i />
                <i />
              </div>
            </div>
            <div className="ufo-preview__beam" />
            <div className="ufo-preview__kid">🧑‍🎓</div>
            <div className="ufo-preview__kid ufo-preview__kid--2">🎒</div>
            <div className="ufo-preview__ground" />
            <span className="ufo-preview__tag">● Xem trước tương tác</span>
          </div>

          <h2 id="spotlight-title" className="hero__spotlight-title">
            {spotlight.emoji} {spotlight.title}
          </h2>
          <p>{spotlight.description}</p>
          <Link href={spotlight.route} className="btn btn--butter btn--lg hero__spotlight-cta">
            <Play size={18} fill="currentColor" aria-hidden="true" /> Chơi ngay
          </Link>
        </article>
      )}
    </section>
  )
}
