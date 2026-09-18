import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: string;
}

/** Consistent page-level heading block used at the top of every route. */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  eyebrow,
}) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {eyebrow && (
        <p className="mb-1.5 text-2xs font-semibold tracking-[0.12em] text-accent uppercase">
          {eyebrow}
        </p>
      )}
      <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em] text-ink">{title}</h1>
      {description && (
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted">{description}</p>
      )}
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </div>
);
