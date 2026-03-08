import React from 'react';

interface TabsProps {
  tabs: { label: string; value: string }[];
  activeTab: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps) {
  return (
    <div className={className}>
      <div className="flex gap-1 bg-[var(--color-sand)] p-1 rounded-[var(--radius-md)] border-2 border-[var(--color-border)]">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`
              flex-1 py-2.5 px-4 text-xs font-semibold
              border-none bg-transparent rounded-[var(--radius-sm)]
              cursor-pointer transition-all duration-150
              ${activeTab === tab.value
                ? 'bg-[var(--color-cream)] text-[var(--color-ink)] shadow-[var(--shadow-sm)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

Tabs.displayName = 'Tabs';
