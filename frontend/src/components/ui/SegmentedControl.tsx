import { motion } from 'motion/react';
import { cn } from './cn';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Unique id so multiple controls on a page animate independently. */
  layoutId: string;
}

/** Two-or-more-way toggle with a sliding active pill. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  layoutId,
}: SegmentedControlProps<T>) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-surface-sunken p-0.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cn(
              'relative rounded-[0.375rem] px-2.5 py-1 text-2xs font-medium transition-colors duration-150',
              active ? 'text-accent-ink' : 'text-ink-muted hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-[0.375rem] bg-surface shadow-xs"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
