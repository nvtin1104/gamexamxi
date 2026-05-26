import React from 'react';

interface CheckboxProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export function Checkbox({
  label,
  checked,
  onChange,
  className = '',
}: CheckboxProps) {
  return (
    <label className={`flex items-center gap-2.5 cursor-pointer ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={`
          w-5 h-5 bg-[var(--color-cream)]
          border-2 border-[var(--color-border)] rounded-[6px]
          appearance-none cursor-pointer relative
          shadow-[var(--shadow-xs)] transition-colors duration-150
          checked:bg-[var(--color-sage)]
          checked:before:content-['✓'] checked:before:absolute
          checked:before:inset-0 checked:before:flex
          checked:before:items-center checked:before:justify-center
          checked:before:text-xs checked:before:font-bold
        `}
      />
      {label && (
        <span className="text-xs font-medium">{label}</span>
      )}
    </label>
  );
}

Checkbox.displayName = 'Checkbox';
