import React from 'react';

interface ProgressProps {
  value: number;
  variant?: 'sage' | 'peach' | 'sky' | 'butter' | 'lilac' | 'ink';
  size?: 'sm' | 'md' | 'lg';
  striped?: boolean;
  label?: string;
  showValue?: boolean;
  className?: string;
}

const fillColors = {
  sage: 'bg-[var(--color-sage-dark)]',
  peach: 'bg-[var(--color-peach-dark)]',
  sky: 'bg-[var(--color-sky-dark)]',
  butter: 'bg-[var(--color-butter-dark)]',
  lilac: 'bg-[var(--color-lilac-dark)]',
  ink: 'bg-[var(--color-ink)]',
};

const heightStyles = {
  sm: 'h-1.5',
  md: 'h-3',
  lg: 'h-4.5',
};

const stripedStyles = {
  sage: 'bg-[repeating-linear-gradient(45deg,var(--color-sage-dark),var(--color-sage-dark)_6px,var(--color-sage)_6px,var(--color-sage)_12px)]',
  peach: 'bg-[repeating-linear-gradient(45deg,var(--color-peach-dark),var(--color-peach-dark)_6px,var(--color-peach)_6px,var(--color-peach)_12px)]',
  sky: 'bg-[repeating-linear-gradient(45deg,var(--color-sky-dark),var(--color-sky-dark)_6px,var(--color-sky)_6px,var(--color-sky)_12px)]',
  butter: 'bg-[repeating-linear-gradient(45deg,var(--color-butter-dark),var(--color-butter-dark)_6px,var(--color-butter)_6px,var(--color-butter)_12px)]',
  lilac: 'bg-[repeating-linear-gradient(45deg,var(--color-lilac-dark),var(--color-lilac-dark)_6px,var(--color-lilac)_6px,var(--color-lilac)_12px)]',
  ink: 'bg-[repeating-linear-gradient(45deg,var(--color-ink),var(--color-ink)_6px,var(--color-border)_6px,var(--color-border)_12px)]',
};

export function Progress({
  value,
  variant = 'sage',
  size = 'md',
  striped = false,
  label,
  showValue = false,
  className = '',
}: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="flex justify-between mb-1.5 text-xs font-semibold">
          {label && <span>{label}</span>}
          {showValue && (
            <span className="font-[family-name:var(--font-mono)] text-[var(--color-muted)]">
              {clampedValue}%
            </span>
          )}
        </div>
      )}
      <div
        className={`
          bg-[var(--color-warm)] border-2 border-[var(--color-border)]
          rounded-[999px] overflow-hidden
          ${heightStyles[size]}
        `}
      >
        <div
          className={`
            h-full rounded-[999px] transition-all duration-1000 ease-out
            ${striped ? stripedStyles[variant] : fillColors[variant]}
          `}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}

Progress.displayName = 'Progress';
