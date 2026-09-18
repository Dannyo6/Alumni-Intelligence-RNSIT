import React from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-white shadow-xs hover:bg-accent-hover active:translate-y-px dark:text-brand-950',
  secondary:
    'border border-line bg-surface text-ink-secondary shadow-xs hover:border-line-strong hover:bg-surface-hover hover:text-ink',
  ghost: 'text-ink-secondary hover:bg-surface-hover hover:text-ink',
  danger: 'bg-danger text-white shadow-xs hover:brightness-110 active:translate-y-px',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-9 gap-2 px-3.5 text-[0.8125rem]',
  lg: 'h-11 gap-2 px-5 text-sm',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  className,
  children,
  ...props
}) => (
  <button
    className={cn(
      'inline-flex items-center justify-center rounded-lg font-medium',
      'transition-[background-color,border-color,color,transform,filter] duration-150',
      'disabled:pointer-events-none disabled:opacity-55',
      variants[variant],
      sizes[size],
      className,
    )}
    {...props}
  >
    {icon}
    {children}
    {iconRight}
  </button>
);
