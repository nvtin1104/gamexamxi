import React from 'react';

interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  icon?: string;
  className?: string;
}

const variantStyles = {
  info: 'bg-[var(--color-sky-light)]',
  success: 'bg-[var(--color-sage-light)]',
  warning: 'bg-[var(--color-butter-light)]',
  error: 'bg-[var(--color-rose-light)]',
};

const defaultIcons = {
  info: '💡',
  success: '✅',
  warning: '⚠️',
  error: '❌',
};

export function Alert({
  variant = 'info',
  title,
  children,
  icon,
  className = '',
}: AlertProps) {
  return (
    <div
      className={`
        flex gap-3 items-start
        p-3.5 border-2 border-[var(--color-border)]
        rounded-[var(--radius-md)]
        shadow-[var(--shadow-sm)]
        ${variantStyles[variant]}
        ${className}
      `}
    >
      <span className="text-lg flex-shrink-0 mt-0.5">
        {icon || defaultIcons[variant]}
      </span>
      <div>
        {title && (
          <div className="font-bold text-sm mb-0.5">{title}</div>
        )}
        <div className="text-xs text-[var(--color-muted)]">{children}</div>
      </div>
    </div>
  );
}

Alert.displayName = 'Alert';
