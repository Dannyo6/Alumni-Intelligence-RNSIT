import React from 'react';
import { cn } from './cn';

type Tone = 'neutral' | 'accent' | 'success' | 'warn' | 'danger' | 'info';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  dot?: boolean;
}

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-sunken text-ink-secondary border-line',
  accent: 'bg-accent-soft text-accent-ink border-accent/25',
  success: 'bg-success-soft text-success-ink border-success/25',
  warn: 'bg-warn-soft text-warn-ink border-warn/25',
  danger: 'bg-danger-soft text-danger-ink border-danger/25',
  info: 'bg-info-soft text-info-ink border-info/25',
};

const dotTones: Record<Tone, string> = {
  neutral: 'bg-ink-faint',
  accent: 'bg-accent',
  success: 'bg-success',
  warn: 'bg-warn',
  danger: 'bg-danger',
  info: 'bg-info',
};

export const Badge: React.FC<BadgeProps> = ({
  tone = 'neutral',
  dot = false,
  className,
  children,
  ...props
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5',
      'text-2xs font-medium whitespace-nowrap',
      tones[tone],
      className,
    )}
    {...props}
  >
    {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotTones[tone])} />}
    {children}
  </span>
);
