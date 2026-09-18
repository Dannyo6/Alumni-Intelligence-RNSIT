import React from 'react';
import { X } from 'lucide-react';
import { cn } from './cn';

interface FilterChipProps {
  /** Dimension being filtered, e.g. "Company". */
  label: string;
  /** The value itself, e.g. "Amazon". */
  value: React.ReactNode;
  onRemove: () => void;
  tone?: 'accent' | 'signal';
}

/**
 * A removable active-filter token. The collection wraps rather than clipping,
 * so no active filter is ever hidden from the reader.
 */
export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  value,
  onRemove,
  tone = 'accent',
}) => (
  <span
    className={cn(
      'inline-flex max-w-full items-center gap-1.5 rounded-lg border py-1 pr-1 pl-2.5 text-2xs',
      tone === 'accent'
        ? 'border-accent/25 bg-accent-soft text-accent-ink'
        : 'border-signal/30 bg-signal-soft text-signal-ink',
    )}
  >
    <span className="font-mono tracking-wide uppercase opacity-70">{label}</span>
    <span className="min-w-0 truncate font-medium">{value}</span>
    <button
      onClick={onRemove}
      aria-label={`Remove ${label} filter`}
      className="ml-0.5 shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
    >
      <X size={12} />
    </button>
  </span>
);
