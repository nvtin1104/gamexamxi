import React from 'react';

interface TimerProps {
  seconds: number;
  isDanger?: boolean;
  icon?: string;
  className?: string;
  onTimeUp?: () => void;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function Timer({
  seconds,
  isDanger = false,
  icon = '⏱️',
  className = '',
}: TimerProps) {
  return (
    <div
      className={`
        flex items-center gap-2
        px-5 py-3 bg-[var(--color-cream)] border-2 border-[var(--color-border)]
        rounded-[var(--radius-lg)] font-[family-name:var(--font-mono)] text-2xl font-bold
        shadow-[var(--shadow-md)]
        ${isDanger ? 'border-[var(--color-rose-dark)] bg-[var(--color-rose-light)]' : ''}
        ${className}
      `}
    >
      <span className="text-xl">{icon}</span>
      <span className={isDanger ? 'text-[var(--color-rose-dark)]' : ''}>
        {formatTime(seconds)}
      </span>
    </div>
  );
}

Timer.displayName = 'Timer';
