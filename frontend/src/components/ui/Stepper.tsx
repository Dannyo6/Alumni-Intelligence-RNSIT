import React from 'react';
import { Check } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from './cn';

export interface Step {
  id: string;
  label: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  /** Zero-based index of the step currently in progress. */
  current: number;
  onStepClick?: (index: number) => void;
  className?: string;
}

/**
 * Horizontal progress rail for guided multi-step flows.
 * Completed steps stay clickable so the reader can go back and re-read a
 * stage; steps ahead of the cursor are not yet reachable.
 */
export const Stepper: React.FC<StepperProps> = ({ steps, current, onStepClick, className }) => (
  <ol className={cn('flex w-full items-start', className)}>
    {steps.map((step, i) => {
      const done = i < current;
      const active = i === current;
      const reachable = Boolean(onStepClick) && i <= current;

      return (
        <li key={step.id} className={cn('flex min-w-0 flex-1 items-start', i === 0 && 'flex-none')}>
          {i > 0 && (
            <div className="relative mx-2 mt-4 h-px flex-1 bg-line sm:mx-3">
              <motion.div
                initial={false}
                animate={{ scaleX: done || active ? 1 : 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                style={{ originX: 0 }}
                className="absolute inset-0 bg-accent"
              />
            </div>
          )}

          <div className="flex min-w-0 flex-col items-center text-center">
            <button
              type="button"
              disabled={!reachable}
              onClick={reachable ? () => onStepClick?.(i) : undefined}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                'transition-colors duration-200',
                done && 'border-accent bg-accent text-white dark:text-brand-950',
                active && 'border-accent bg-accent-soft text-accent-ink',
                !done && !active && 'border-line bg-surface text-ink-faint',
                reachable && 'cursor-pointer',
              )}
            >
              {done ? <Check size={15} /> : <span className="font-mono">{i + 1}</span>}
            </button>
            <span
              className={cn(
                'mt-2 max-w-[9rem] truncate text-2xs font-medium sm:max-w-[11rem]',
                active ? 'text-ink' : done ? 'text-ink-secondary' : 'text-ink-faint',
              )}
            >
              {step.label}
            </span>
          </div>
        </li>
      );
    })}
  </ol>
);
