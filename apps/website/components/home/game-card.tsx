import React from 'react';
import Link from 'next/link';

interface GameCardProps {
  title: string;
  icon: string;
  players?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  thumbnail?: 'sage' | 'peach' | 'sky' | 'butter' | 'lilac' | 'warm';
  href?: string;
}

const difficultyLabels = {
  easy: 'Dễ',
  medium: 'Vừa',
  hard: 'Khó',
};

const thumbnailColors = {
  sage: 'bg-sage',
  peach: 'bg-peach',
  sky: 'bg-sky',
  butter: 'bg-butter',
  lilac: 'bg-lilac',
  warm: 'bg-warm',
};

const difficultyColors = {
  easy: 'bg-sage',
  medium: 'bg-butter',
  hard: 'bg-peach',
};

export function GameCard({
  title,
  icon,
  players = 0,
  difficulty = 'easy',
  thumbnail = 'sage',
  href = '#',
}: GameCardProps) {
  return (
    <Link href={href} className="block no-underline text-inherit">
      <div className="bg-cream border-2 border-[var(--color-border)] rounded-[14px] overflow-hidden shadow-[var(--shadow-md)] cursor-pointer transition-transform duration-200 hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-[var(--shadow-lg)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[var(--shadow-sm)]">
        <div className={`h-[130px] flex items-center justify-center text-[52px] relative overflow-hidden ${thumbnailColors[thumbnail]}`}>
          {icon}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-border)]" />
        </div>
        <div className="p-4 pb-[18px]">
          <div className="font-[family-name:var(--font-display)] font-bold text-base mb-1.5">
            {title}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-muted)]">
              👤 {players.toLocaleString()} người
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 border-[1.5px] border-[var(--color-border)] rounded-[20px] tracking-[0.5px] uppercase ${difficultyColors[difficulty]}`}>
              {difficultyLabels[difficulty]}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

GameCard.displayName = 'GameCard';
