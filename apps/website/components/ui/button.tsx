import React from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'sage' | 'peach' | 'butter' | 'sky' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  shape?: 'default' | 'square' | 'pill';
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

const variantStyles = {
  primary: 'bg-ink text-cream shadow-[var(--shadow-md)]',
  secondary: 'bg-cream text-ink shadow-[var(--shadow-md)]',
  sage: 'bg-sage text-ink shadow-[var(--shadow-md)]',
  peach: 'bg-peach text-ink shadow-[var(--shadow-md)]',
  butter: 'bg-butter text-ink shadow-[var(--shadow-md)]',
  sky: 'bg-sky text-ink shadow-[var(--shadow-md)]',
  ghost: 'bg-transparent text-ink shadow-none',
};

const sizeStyles = {
  xs: 'text-[11px] px-3 py-[5px]',
  sm: 'text-[12px] px-4 py-2',
  md: 'text-[14px] px-[22px] py-[11px]',
  lg: 'text-[16px] px-[30px] py-[14px]',
};

const shapeStyles = {
  default: '',
  square: 'rounded-[var(--radius-sm)]',
  pill: 'rounded-[var(--radius-pill)]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  shape = 'default',
  disabled = false,
  className = '',
  children,
  onClick,
  type = 'button',
}: ButtonProps) {
  const baseStyles = `
    font-[family-name:var(--font-display)]
    font-bold
    border-2 border-[var(--color-border)]
    cursor-pointer
    inline-flex
    items-center
    justify-center
    gap-2
    tracking-[0.2px]
  `;

  const disabledStyles = disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${shapeStyles[shape]}
        ${disabledStyles}
        ${className}
        hover:translate-x-[-2px] hover:translate-y-[-2px]
        hover:shadow-[var(--shadow-lg)]
        active:translate-x-[2px] active:translate-y-[2px]
        active:shadow-[var(--shadow-sm)]
        transition-all duration-150
      `}
      style={{
        boxShadow: variant === 'ghost' ? 'none' : undefined,
      }}
    >
      {children}
    </button>
  );
}

Button.displayName = 'Button';
