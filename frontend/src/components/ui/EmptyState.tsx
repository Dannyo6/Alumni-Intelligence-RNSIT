import React from 'react';
import { cn } from './cn';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Neutral placeholder for "no data" regions — keeps chart cards from collapsing. */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center rounded-lg px-6 py-10 text-center',
      className,
    )}
  >
    {icon && (
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-sunken text-ink-faint">
        {icon}
      </div>
    )}
    <p className="text-sm font-medium text-ink-secondary">{title}</p>
    {description && <p className="mt-1 max-w-xs text-xs text-ink-faint">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
