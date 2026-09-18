import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from './cn';

interface PagerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

/** Square icon button used by every paginator in the app. */
export const PagerButton: React.FC<PagerButtonProps> = ({ className, children, ...props }) => (
  <button
    className={cn(
      'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-ink-secondary',
      'transition-colors hover:border-line-strong hover:bg-surface-hover hover:text-ink',
      'disabled:pointer-events-none disabled:opacity-40',
      className,
    )}
    {...props}
  >
    {children}
  </button>
);

interface PaginationProps {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  /** Left-hand summary, e.g. "Showing 1–50 of 6,472". */
  summary?: React.ReactNode;
  children?: React.ReactNode;
  disabled?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  onPrev,
  onNext,
  summary,
  children,
  disabled = false,
}) => (
  <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
    <div className="text-xs text-ink-muted">{summary}</div>
    <div className="flex flex-wrap items-center gap-3">
      {children}
      <div className="flex items-center gap-2">
        <span className="tnum text-xs whitespace-nowrap text-ink-muted">
          Page {page} of {totalPages}
        </span>
        <PagerButton onClick={onPrev} disabled={disabled || page <= 1} aria-label="Previous page">
          <ChevronLeft size={16} />
        </PagerButton>
        <PagerButton
          onClick={onNext}
          disabled={disabled || page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </PagerButton>
      </div>
    </div>
  </div>
);
