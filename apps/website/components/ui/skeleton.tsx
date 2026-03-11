import React from 'react';

interface SkeletonProps {
  variant?: 'text' | 'title' | 'avatar' | 'card';
  width?: string;
  height?: string;
  className?: string;
}

const defaultStyles = {
  text: 'h-3.5 w-full',
  title: 'h-6 w-3/5 mb-2',
  avatar: 'w-12 h-12 rounded-[12px]',
  card: 'h-28 w-full',
};

export function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
}: SkeletonProps) {
  return (
    <div
      className={`
        bg-[var(--color-sand)] rounded-[var(--radius-md)]
        relative overflow-hidden
        ${defaultStyles[variant]}
        ${className}
      `}
      style={{ width, height }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
          animation: 'shimmer 1.5s infinite',
        }}
      />
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

Skeleton.displayName = 'Skeleton';
