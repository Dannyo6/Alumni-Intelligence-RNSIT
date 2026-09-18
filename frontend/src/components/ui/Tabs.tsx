import React from 'react';
import { motion } from 'motion/react';
import { cn } from './cn';

export interface TabItem<T extends string> {
  id: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

interface TabsProps<T extends string> {
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Unique id so multiple tab strips animate independently. */
  layoutId: string;
}

/** Underline tab strip with a sliding indicator; scrolls horizontally on mobile. */
export function Tabs<T extends string>({ tabs, value, onChange, layoutId }: TabsProps<T>) {
  return (
    <div className="scroll-slim -mb-px flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex shrink-0 items-center gap-2 px-3 pb-3 pt-1 text-[0.8125rem] font-medium whitespace-nowrap',
              'transition-colors duration-150',
              active ? 'text-accent-ink' : 'text-ink-muted hover:text-ink',
            )}
          >
            {tab.icon}
            {tab.label}
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
