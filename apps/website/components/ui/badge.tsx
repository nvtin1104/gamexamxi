import React from 'react';

interface BadgeProps {
  variant?: 'sage' | 'peach' | 'butter' | 'sky' | 'lilac' | 'rose' | 'ink' | 'outline';
  size?: 'sm' | 'default' | 'lg';
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}

const sizeStyles = {
  sm: 'text-[10px] px-[9px] py-[2px]',
  default: 'text-[11px] px-3 py-[3px]',
  lg: 'text-[13px] px-4 py-[5px]',
};

const variantStyles = {
  sage: 'bg-sage text-ink',
  peach: 'bg-peach text-ink',
  butter: 'bg-butter text-ink',
  sky: 'bg-sky text-ink',
  lilac: 'bg-lilac text-ink',
  rose: 'bg-rose text-ink',
  ink: 'bg-ink text-cream',
  outline: 'bg-transparent text-ink',
};

export function Badge({
  variant = 'sage',
  size = 'default',
  dot = false,
  className = '',
  children,
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex
        items-center
        gap-[5px]
        border-2 border-[var(--color-border)]
        rounded-[var(--radius-pill)]
        font-semibold
        tracking-[0.4px]
        shadow-[var(--shadow-xs)]
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {dot && <span className="text-[7px]">●</span>}
      {children}
    </span>
  );
}

Badge.displayName = 'Badge';
