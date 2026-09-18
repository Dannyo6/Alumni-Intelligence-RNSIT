import React from 'react';
import { cn } from './cn';

/** Shimmering placeholder that matches surface tokens in both themes. */
export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn('animate-pulse rounded-md bg-surface-sunken', className)}
    {...props}
  />
);
