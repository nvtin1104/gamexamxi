import { BookOpenCheck, Coffee, Globe2 } from 'lucide-react'

const PILLARS = [
  {
    icon: Coffee,
    accent: 'bg-butter',
    title: 'Giải trí 5 phút giờ ra chơi',
    text: 'Mỗi mini-game chỉ vài phút một ván, mở là chơi ngay — không đăng nhập, không quảng cáo, không làm bạn trễ tiết sau.',
  },
  {
    icon: BookOpenCheck,
    accent: 'bg-sage',
    title: 'Hỗ trợ học tập trực quan',
    text: 'Ôn từ vựng bằng lật thẻ, luyện phản xạ và tư duy không gian bằng mô phỏng 3D. Học mà như đang chơi.',
  },
  {
    icon: Globe2,
    accent: 'bg-lavender',
    title: 'Hệ sinh thái nhiều thế giới',
    text: 'Những game lớn được xây thành web riêng, liên kết với hub này: điểm số đồng bộ về đây, một nút là quay về.',
  },
]

export function About() {
  return (
    <section id="gioi-thieu" className="section" aria-labelledby="about-title">
      <div className="section__head">
        <div>
          <p className="section__eyebrow">Giới thiệu hệ thống</p>
          <h2 id="about-title" className="section__title">
            Một hub nhỏ, nhiều thế giới để khám phá
          </h2>
        </div>
      </div>
      <div className="about__grid">
        {PILLARS.map(({ icon: Icon, accent, title, text }, index) => (
          <article key={title} className="nb-card about__card">
            <div className="about__top">
              <span className={`about__icon ${accent}`}>
                <Icon size={24} aria-hidden="true" />
              </span>
              <span className="about__num" aria-hidden="true">
                0{index + 1}
              </span>
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
