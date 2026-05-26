import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'sage' | 'peach' | 'butter';
  className?: string;
}

const sizeStyles = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-[3px]',
  lg: 'w-12 h-12 border-4',
};

const variantColors = {
  default: 'border-t-[var(--color-ink)]',
  sage: 'border-t-[var(--color-sage-dark)]',
  peach: 'border-t-[var(--color-peach-dark)]',
  butter: 'border-t-[var(--color-butter-dark)]',
};

export function Spinner({
  size = 'md',
  variant = 'default',
  className = '',
}: SpinnerProps) {
  return (
    <div
      className={`
        rounded-full
        border-[var(--color-sand)]
        ${sizeStyles[size]}
        ${variantColors[variant]}
        animate-spin
        ${className}
      `}
    />
  );
}

Spinner.displayName = 'Spinner';
