import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Card } from './Card';
import { CountUp } from './CountUp';
import { cn } from './cn';

export type StatTone = 'accent' | 'success' | 'warn' | 'danger' | 'info' | 'violet' | 'neutral';

const toneStyles: Record<StatTone, { wrap: string; icon: string }> = {
  accent: { wrap: 'bg-accent-soft', icon: 'text-accent' },
  success: { wrap: 'bg-success-soft', icon: 'text-success' },
  warn: { wrap: 'bg-warn-soft', icon: 'text-warn' },
  danger: { wrap: 'bg-danger-soft', icon: 'text-danger' },
  info: { wrap: 'bg-info-soft', icon: 'text-info' },
  violet: {
    wrap: 'bg-violet-50 dark:bg-violet-950/40',
    icon: 'text-violet-600 dark:text-violet-400',
  },
  neutral: { wrap: 'bg-surface-sunken', icon: 'text-ink-muted' },
};

interface StatTileProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: StatTone;
  onClick?: () => void;
  /** Stagger index, forwarded to CountUp so tiles resolve in sequence. */
  index?: number;
  hint?: string;
}

/** KPI tile: spotlight surface, tinted icon chip, animated figure. */
export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  icon,
  tone = 'accent',
  onClick,
  index = 0,
  hint,
}) => {
  const styles = toneStyles[tone];
  const clickable = Boolean(onClick);

  return (
    <Card
      spotlight
      interactive={clickable}
      className="group/tile h-full"
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      aria-label={clickable ? `${label}: ${value.toLocaleString()}. View in directory` : undefined}
    >
      <div className="relative flex h-full items-start gap-3.5 p-4 sm:p-5">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
            'transition-transform duration-300 ease-[var(--ease-out-quint)]',
            clickable && 'group-hover/tile:scale-105',
            styles.wrap,
            styles.icon,
          )}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-2xs font-medium tracking-wide text-ink-muted uppercase">
            {label}
          </p>
          <p className="tnum mt-1 text-2xl font-semibold leading-none text-ink">
            <CountUp to={value} delay={index * 0.05} />
          </p>
          {hint && <p className="mt-1.5 truncate text-2xs text-ink-faint">{hint}</p>}
        </div>

        {clickable && (
          <ArrowUpRight
            size={15}
            className="mt-0.5 shrink-0 text-ink-faint opacity-0 transition-all duration-200 group-hover/tile:translate-x-0.5 group-hover/tile:-translate-y-0.5 group-hover/tile:text-accent group-hover/tile:opacity-100"
          />
        )}
      </div>
    </Card>
  );
};
