import React from 'react';

interface LeaderboardRowProps {
  rank: number;
  name: string;
  score: number;
  avatar?: string;
  avatarEmoji?: string;
  badge?: string;
  className?: string;
}

const rankStyles = {
  1: 'text-[var(--color-butte r-dark)]',
  2: 'text-[var(--color-subtle)]',
  3: 'text-[var(--color-peach-dark)]',
};

const badgeEmojis = {
  1: '🏆',
  2: '🥈',
  3: '🥉',
};

export function LeaderboardRow({
  rank,
  name,
  score,
  avatar,
  avatarEmoji,
  badge,
  className = '',
}: LeaderboardRowProps) {
  const isTop3 = rank <= 3;

  return (
    <div
      className={`
        flex items-center gap-3.5 p-3 bg-[var(--color-cream)]
        border-2 border-[var(--color-border)] rounded-[var(--radius-md)]
        shadow-[var(--shadow-sm)] transition-transform duration-150
        hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]
        ${className}
      `}
    >
      <div
        className={`
          font-[family-name:var(--font-display)] font-extrabold text-base w-7
          ${isTop3 ? rankStyles[rank as 1 | 2 | 3] : ''}
        `}
      >
        {rank}
      </div>
      <div
        className={`
          w-10 h-10 border-2 border-[var(--color-border)] rounded-[10px]
          flex items-center justify-center
          ${!avatar && !avatarEmoji ? 'bg-[var(--color-sage)]' : ''}
        `}
        style={avatar ? { backgroundImage: `url(${avatar})`, backgroundSize: 'cover' } : undefined}
      >
        {avatarEmoji || (avatar ? null : name.charAt(0).toUpperCase())}
      </div>
      <div className="flex-1">
        <div className="font-bold text-sm">{name}</div>
        <div className="text-xs text-[var(--color-muted)] font-[family-name:var(--font-mono)]">
          {score.toLocaleString()} điểm
        </div>
      </div>
      {(badge || isTop3) && (
        <div className="text-lg">{badge || badgeEmojis[rank as 1 | 2 | 3]}</div>
      )}
    </div>
  );
}

LeaderboardRow.displayName = 'LeaderboardRow';
