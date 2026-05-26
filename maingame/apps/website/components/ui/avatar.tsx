import React from 'react';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'busy' | null;
  children?: React.ReactNode;
  className?: string;
}

const sizeStyles = {
  xs: 'w-7 h-7 text-xs rounded-[8px]',
  sm: 'w-9 h-9 text-sm rounded-[10px]',
  md: 'w-12 h-12 text-lg rounded-[12px]',
  lg: 'w-16 h-16 text-[26px] rounded-[16px]',
  xl: 'w-21 h-21 text-[36px] rounded-[20px]',
};

const statusColors = {
  online: 'bg-[var(--color-sage-dark)]',
  offline: 'bg-[var(--color-subtle)]',
  busy: 'bg-[var(--color-peach-dark)]',
};

export function Avatar({
  src,
  alt,
  size = 'md',
  status = null,
  children,
  className = '',
}: AvatarProps) {
  return (
    <div className={`relative inline-flex ${className}`}>
      <div
        className={`
          border-2 border-[var(--color-border)]
          flex items-center justify-center
          font-bold font-[family-name:var(--font-display)]
          bg-[var(--color-sage)] shadow-[var(--shadow-sm)]
          ${sizeStyles[size]}
        `}
      >
        {src ? (
          <img src={src} alt={alt} className="w-full h-full object-cover rounded-inherit" />
        ) : (
          children || '?'
        )}
      </div>
      {status && (
        <div
          className={`
            absolute -bottom-0.5 -right-0.5
            w-3 h-3 rounded-full
            border-2 border-[var(--color-cream)]
            ${statusColors[status]}
          `}
        />
      )}
    </div>
  );
}

Avatar.displayName = 'Avatar';
