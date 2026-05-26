import React from 'react';

interface StatTileProps {
  icon: string;
  value: string | number;
  label: string;
  variant?: 'sage' | 'peach' | 'sky' | 'butter' | 'lilac' | 'rose';
  className?: string;
}

const variantColors = {
  sage: 'bg-[var(--color-sage)]',
  peach: 'bg-[var(--color-peach)]',
  sky: 'bg-[var(--color-sky)]',
  butter: 'bg-[var(--color-butter)]',
  lilac: 'bg-[var(--color-lilac)]',
  rose: 'bg-[var(--color-rose)]',
};

export function StatTile({
  icon,
  value,
  label,
  variant = 'sage',
  className = '',
}: StatTileProps) {
  return (
    <div
      className={`
        border-2 border-[var(--color-border)] rounded-[var(--radius-lg)]
        p-4.5 text-center shadow-[var(--shadow-md)]
        cursor-default transition-transform duration-200
        hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]
        ${variantColors[variant]}
        ${className}
      `}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="font-[family-name:var(--font-display)] text-[28px] font-extrabold tracking-[-1px] leading-none mb-1">
        {value}
      </div>
      <div className="text-[11px] text-[var(--color-muted)] font-semibold uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}

StatTile.displayName = 'StatTile';
