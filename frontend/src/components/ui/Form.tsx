import React from 'react';
import { Search } from 'lucide-react';
import { cn } from './cn';

/** Shared control chrome so inputs, selects and textareas stay identical. */
const controlBase =
  'w-full rounded-lg border border-line bg-surface text-ink placeholder:text-ink-faint ' +
  'transition-colors duration-150 outline-none ' +
  'focus:border-accent focus:ring-2 focus:ring-accent/25 ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

export const FieldLabel: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({
  className,
  children,
  ...props
}) => (
  <label
    className={cn('mb-1.5 block text-2xs font-semibold tracking-wide text-ink-muted uppercase', className)}
    {...props}
  >
    {children}
  </label>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  className,
  ...props
}) => <input className={cn(controlBase, 'h-9 px-3 text-sm', className)} {...props} />;

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
  className,
  ...props
}) => <textarea className={cn(controlBase, 'px-3 py-2 text-sm leading-relaxed', className)} {...props} />;

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className,
  children,
  ...props
}) => (
  <select className={cn(controlBase, 'h-9 cursor-pointer px-2.5 text-sm', className)} {...props}>
    {children}
  </select>
);

/** Text input with a leading magnifier — the standard search affordance. */
export const SearchInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  className,
  ...props
}) => (
  <div className="relative w-full">
    <Search
      size={16}
      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint"
    />
    <input className={cn(controlBase, 'h-9 pr-3 pl-9 text-sm', className)} {...props} />
  </div>
);

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, className, ...props }) => (
  <label
    className={cn(
      'inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-ink-secondary select-none',
      'transition-colors hover:text-ink',
      className,
    )}
  >
    <input
      type="checkbox"
      className={cn(
        'h-4 w-4 shrink-0 rounded border-line-strong bg-surface text-accent',
        'focus:ring-2 focus:ring-accent/30 focus:ring-offset-0',
      )}
      {...props}
    />
    {label}
  </label>
);
