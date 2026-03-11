import React from 'react';

interface InputProps {
  label?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'search' | 'number';
  size?: 'sm' | 'md' | 'lg';
  state?: 'default' | 'success' | 'error';
  hint?: string;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
}

const sizeStyles = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-3.5 py-2',
  lg: 'text-base px-4 py-3',
};

export function Input({
  label,
  placeholder,
  type = 'text',
  size = 'md',
  state = 'default',
  hint,
  className = '',
  value,
  onChange,
}: InputProps) {
  const stateStyles = {
    default: 'border-[var(--color-border)] bg-cream',
    success: 'border-[var(--color-sage-dark)] bg-[var(--color-sage-light)]',
    error: 'border-[var(--color-rose-dark)] bg-[var(--color-rose-light)]',
  };

  const hintStyles = {
    default: 'text-[var(--color-muted)]',
    success: 'text-[var(--color-sage-dark)]',
    error: 'text-[var(--color-rose-dark)]',
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-semibold tracking-wide">
          {label}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={`
          w-full
          border-2 border-[var(--color-border)]
          rounded-[var(--radius-md)]
          font-[family-name:var(--font-body)]
          text-sm
          outline-none
          transition-shadow duration-150
          placeholder:text-[var(--color-subtle)]
          shadow-[var(--shadow-sm)]
          focus:shadow-[var(--shadow-md)]
          ${sizeStyles[size]}
          ${stateStyles[state]}
        `}
      />
      {hint && (
        <span className={`text-[11px] ${hintStyles[state]}`}>
          {state === 'success' && '✓ '}
          {state === 'error' && '✗ '}
          {hint}
        </span>
      )}
    </div>
  );
}

Input.displayName = 'Input';
