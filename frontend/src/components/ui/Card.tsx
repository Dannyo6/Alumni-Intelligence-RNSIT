import React, { useCallback, useRef } from 'react';
import { cn } from './cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Cursor-following spotlight wash (React Bits SpotlightCard behaviour). */
  spotlight?: boolean;
  /** Lift and brighten the border on hover — use for clickable cards. */
  interactive?: boolean;
  as?: 'div' | 'section' | 'article';
}

/**
 * Surface primitive. Every panel, tile and chart container in the app sits on
 * one of these so elevation, radius and border stay consistent.
 */
export const Card: React.FC<CardProps> = ({
  spotlight = false,
  interactive = false,
  as: Tag = 'div',
  className,
  children,
  ...props
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!spotlight || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      ref.current.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      ref.current.style.setProperty('--my', `${e.clientY - rect.top}px`);
    },
    [spotlight],
  );

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      onMouseMove={handleMouseMove}
      className={cn(
        'relative rounded-xl border border-line bg-surface shadow-sm',
        'transition-[box-shadow,border-color,transform] duration-200 ease-[var(--ease-out-quint)]',
        interactive &&
          'cursor-pointer hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md',
        spotlight && 'group/card overflow-hidden',
        className,
      )}
      {...props}
    >
      {spotlight && (
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300',
            'group-hover/card:opacity-100',
          )}
          style={{
            background:
              'radial-gradient(320px circle at var(--mx, 50%) var(--my, 50%), rgb(var(--spotlight) / var(--spotlight-strength)), transparent 70%)',
          }}
        />
      )}
      {children}
    </Tag>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn('flex items-start justify-between gap-4 px-5 pt-5 pb-4', className)}
    {...props}
  />
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  ...props
}) => (
  <h3
    className={cn('text-[0.9375rem] font-semibold leading-tight text-ink', className)}
    {...props}
  />
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  ...props
}) => <p className={cn('mt-1 text-xs leading-relaxed text-ink-muted', className)} {...props} />;

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => <div className={cn('px-5 pb-5', className)} {...props} />;

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn('border-t border-line px-5 py-3 text-2xs text-ink-faint', className)}
    {...props}
  />
);
