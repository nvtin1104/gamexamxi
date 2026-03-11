import React from 'react';

interface ToggleProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  variant?: 'default' | 'peach' | 'butter' | 'sky';
  className?: string;
}

export function Toggle({
  label,
  checked,
  onChange,
  variant = 'default',
  className = '',
}: ToggleProps) {
  const variantColors = {
    default: 'checked:bg-[var(--color-sage)]',
    peach: 'checked:bg-[var(--color-peach)]',
    butter: 'checked:bg-[var(--color-butter)]',
    sky: 'checked:bg-[var(--color-sky)]',
  };

  return (
    <label className={`flex items-center gap-2.5 cursor-pointer ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={`
          w-11 h-6 bg-[var(--color-sand)]
          border-2 border-[var(--color-border)] rounded-[999px]
          appearance-none cursor-pointer relative
          transition-colors duration-200
          ${variantColors[variant]}
          checked:left-5
          before:content-[''] before:absolute
          before:w-4 before:h-4 before:rounded-full
          before:bg-[var(--color-cream)] before:border-2 before:border-[var(--color-border)]
          before:top-0.5 before:left-0.5
          before:transition-transform before:duration-200
          checked:before:translate-x-5
        `}
      />
      {label && (
        <span className="text-xs font-medium">{label}</span>
      )}
    </label>
  );
}

Toggle.displayName = 'Toggle';
