import React from 'react';

interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'sage' | 'peach' | 'butter' | 'sky';
  showLabel?: boolean;
  className?: string;
}

const variantColors = {
  sage: 'stroke-[var(--color-sage-dark)]',
  peach: 'stroke-[var(--color-peach-dark)]',
  butter: 'stroke-[var(--color-butter-dark)]',
  sky: 'stroke-[var(--color-sky-dark)]',
};

export function ProgressRing({
  value,
  size = 80,
  strokeWidth = 8,
  variant = 'sage',
  showLabel = true,
  className = '',
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div
      className={`relative inline-flex ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        className="w-full h-full -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          className="fill-none stroke-[var(--color-sand)]"
          strokeWidth={strokeWidth}
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
        <circle
          className={`fill-none transition-all duration-500 ease-out ${variantColors[variant]}`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-display)] font-extrabold text-lg">
          {Math.round(value)}%
        </div>
      )}
    </div>
  );
}

ProgressRing.displayName = 'ProgressRing';
