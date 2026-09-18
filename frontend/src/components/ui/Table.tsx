import React from 'react';
import { cn } from './cn';

/**
 * Table primitives. `TableWrap` owns the horizontal scroll so wide tables
 * never push the page body sideways on tablet/mobile.
 */
export const TableWrap: React.FC<
  React.HTMLAttributes<HTMLDivElement> & { maxHeight?: string }
> = ({ className, maxHeight, style, ...props }) => (
  <div
    className={cn('scroll-slim w-full overflow-x-auto', maxHeight && 'overflow-y-auto', className)}
    style={{ maxHeight, ...style }}
    {...props}
  />
);

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  className,
  ...props
}) => <table className={cn('min-w-full border-collapse text-sm', className)} {...props} />;

export const THead: React.FC<React.HTMLAttributes<HTMLTableSectionElement> & { sticky?: boolean }> = ({
  className,
  sticky = false,
  ...props
}) => (
  <thead
    className={cn(
      'bg-surface-sunken',
      sticky && 'sticky top-0 z-10',
      className,
    )}
    {...props}
  />
);

export const TH: React.FC<
  React.ThHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center' }
> = ({ className, align = 'left', ...props }) => (
  <th
    className={cn(
      'border-b border-line px-4 py-3 text-2xs font-semibold tracking-wide text-ink-muted uppercase whitespace-nowrap',
      align === 'right' && 'text-right',
      align === 'center' && 'text-center',
      align === 'left' && 'text-left',
      className,
    )}
    {...props}
  />
);

export const TBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  ...props
}) => <tbody className={cn('divide-y divide-line', className)} {...props} />;

export const TR: React.FC<
  React.HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean; selected?: boolean }
> = ({ className, interactive = false, selected = false, ...props }) => (
  <tr
    className={cn(
      'transition-colors duration-150',
      interactive && 'cursor-pointer hover:bg-surface-hover',
      selected && 'bg-accent-soft',
      className,
    )}
    {...props}
  />
);

export const TD: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  ...props
}) => <td className={cn('px-4 py-3 align-middle text-ink-secondary', className)} {...props} />;
