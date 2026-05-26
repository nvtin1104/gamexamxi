import React from 'react';
import { Button } from '../ui/button';

interface ProgressData {
  label: string;
  value: number;
  variant: 'sage' | 'peach' | 'sky';
}

interface HeroProps {
  playerCount?: number;
  title?: string;
  highlight?: string;
  description?: string;
  primaryBtn?: string;
  secondaryBtn?: string;
  score?: number;
  scoreChange?: number;
  progressData?: ProgressData[];
  achievement?: { title: string; subtitle: string };
  showVisual?: boolean;
}

const fillColors = {
  sage: 'bg-sage-dark',
  peach: 'bg-peach-dark',
  sky: 'bg-sky-dark',
};

export function Hero({
  playerCount = 1240,
  title = 'Minigame',
  highlight = 'vui vẻ',
  description = 'Kho game nhỏ xinh, chơi ngay trên trình duyệt — không cần cài đặt. Thử thách bạn bè, leo bảng xếp hạng!',
  primaryBtn = '🎲 Khám phá game',
  secondaryBtn = '📊 Xếp hạng của tôi',
  score = 48920,
  scoreChange = 2340,
  progressData = [
    { label: 'Word', value: 82, variant: 'sage' as const },
    { label: 'Puzzle', value: 65, variant: 'peach' as const },
    { label: 'Quiz', value: 91, variant: 'sky' as const },
  ],
  achievement = {
    title: 'Thành tích mới!',
    subtitle: 'Xếp hạng top 100 toàn server',
  },
  showVisual = true,
}: HeroProps) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-5 pb-[60px]">
      <div className="hero-content">
        <div className="inline-flex items-center gap-2 bg-sage border-2 border-[var(--color-border)] rounded-[30px] px-3.5 py-1.5 text-xs font-semibold shadow-[var(--shadow-sm)] mb-5">
          <span className="text-sage-dark text-[8px]">●</span>
          {playerCount.toLocaleString()} người đang chơi
        </div>

        <h1 className="font-[family-name:var(--font-display)] text-[36px] md:text-[58px] font-extrabold leading-[1.05] tracking-[-1.5px] mb-[18px]">
          {title}
          <br />
          <em className="not-italic bg-peach border-b-[3px] border-[var(--color-border)] px-1.5 rounded">
            {highlight}
          </em>
          <br />
          cho mọi người
        </h1>

        <p className="text-[var(--color-muted)] text-base leading-relaxed mb-8 max-w-[420px]">
          {description}
        </p>

        <div className="flex gap-3 flex-wrap">
          <Button variant="primary">{primaryBtn}</Button>
          <Button variant="secondary">{secondaryBtn}</Button>
        </div>
      </div>

      {showVisual && (
        <div className="flex flex-col gap-3.5">
          <div className="bg-cream border-2 border-[var(--color-border)] rounded-[14px] p-[22px] shadow-[var(--shadow-lg)] relative overflow-hidden animate-[floatCard_5s_ease-in-out_infinite]">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-peach via-butter to-sage" />
            
            <div className="text-[10px] font-semibold text-[var(--color-muted)] uppercase tracking-[2px] mb-[14px] mt-1">
              Điểm hôm nay
            </div>
            <div className="font-[family-name:var(--font-display)] text-[52px] font-extrabold tracking-[-2px] leading-none mb-1">
              {score.toLocaleString()}
            </div>
            <div className="inline-flex items-center gap-1.5 bg-sage border-[1.5px] border-[var(--color-border)] rounded-[20px] px-2.5 py-0.5 text-xs font-semibold shadow-[2px_2px_0_var(--color-border)] mb-[18px]">
              <span>↑</span> +{scoreChange.toLocaleString()} so với hôm qua
            </div>

            <div className="flex flex-col gap-2.5">
              {progressData.map((prog) => (
                <div key={prog.label} className="flex items-center gap-3">
                  <div className="text-xs text-[var(--color-muted)] font-medium w-[58px] flex-shrink-0">
                    {prog.label}
                  </div>
                  <div className="flex-1 h-2.5 bg-sand border-[1.5px] border-[var(--color-border)] rounded-[30px] overflow-hidden">
                    <div
                      className={`h-full rounded-[30px] transition-all duration-1500 ${fillColors[prog.variant]}`}
                      style={{ width: `${prog.value}%` }}
                    />
                  </div>
                  <div className="text-[11px] font-bold w-[30px] text-right">
                    {prog.value}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-warm border-2 border-[var(--color-border)] rounded-[12px] p-4 shadow-[var(--shadow-md)] flex items-center gap-3.5 animate-[floatCard2_6s_ease-in-out_infinite_1s]">
            <div className="w-11 h-11 rounded-[10px] border-2 border-[var(--color-border)] flex items-center justify-center text-[22px] bg-lilac flex-shrink-0">
              🏆
            </div>
            <div>
              <div className="font-[family-name:var(--font-display)] font-bold text-sm mb-0.5">
                {achievement.title}
              </div>
              <div className="text-xs text-[var(--color-muted)]">
                {achievement.subtitle}
              </div>
            </div>
            <div className="ml-auto bg-butter border-[1.5px] border-[var(--color-border)] rounded-[20px] px-2.5 py-0.5 text-[11px] font-bold shadow-[2px_2px_0_var(--color-border)]">
              Mới ✦
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

Hero.displayName = 'Hero';
