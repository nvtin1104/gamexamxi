import React from 'react';

interface CardProps {
  variant?: 'default' | 'flat' | 'raised' | 'colored-top';
  background?: 'cream' | 'warm' | 'sage-light' | 'peach-light' | 'sky-light' | 'butter-light' | 'lilac-light' | 'rose-light';
  className?: string;
  children: React.ReactNode;
}

const bgColorStyles = {
  cream: 'bg-cream',
  warm: 'bg-warm',
  'sage-light': 'bg-sage-light',
  'peach-light': 'bg-peach-light',
  'sky-light': 'bg-sky-light',
  'butter-light': 'bg-butter-light',
  'lilac-light': 'bg-lilac-light',
  'rose-light': 'bg-rose-light',
};

const variantShadowStyles = {
  default: 'shadow-[var(--shadow-md)]',
  flat: 'shadow-none',
  raised: 'shadow-[var(--shadow-lg)]',
  'colored-top': 'shadow-[var(--shadow-md)] overflow-hidden',
};

export function Card({
  variant = 'default',
  background = 'cream',
  className = '',
  children,
}: CardProps) {
  return (
    <div
      className={`
        bg-cream
        border-2 border-[var(--color-border)]
        rounded-[var(--radius-lg)]
        p-5
        transition-transform duration-200
        cursor-default
        ${bgColorStyles[background]}
        ${variantShadowStyles[variant]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

Card.displayName = 'Card';
