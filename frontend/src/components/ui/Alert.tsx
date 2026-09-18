import React from 'react';
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, X } from 'lucide-react';
import { cn } from './cn';

type AlertTone = 'info' | 'success' | 'warn' | 'danger';

interface AlertProps {
  tone?: AlertTone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  onDismiss?: () => void;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

const toneStyles: Record<AlertTone, { wrap: string; icon: string; node: React.ReactNode }> = {
  info: {
    wrap: 'bg-info-soft border-info/25 text-info-ink',
    icon: 'text-info',
    node: <Info size={17} />,
  },
  success: {
    wrap: 'bg-success-soft border-success/25 text-success-ink',
    icon: 'text-success',
    node: <CheckCircle2 size={17} />,
  },
  warn: {
    wrap: 'bg-warn-soft border-warn/25 text-warn-ink',
    icon: 'text-warn',
    node: <AlertTriangle size={17} />,
  },
  danger: {
    wrap: 'bg-danger-soft border-danger/25 text-danger-ink',
    icon: 'text-danger',
    node: <ShieldAlert size={17} />,
  },
};

/** Inline banner for notices, warnings and inline errors. */
export const Alert: React.FC<AlertProps> = ({
  tone = 'info',
  title,
  children,
  onDismiss,
  action,
  icon,
  className,
}) => {
  const styles = toneStyles[tone];
  return (
    <div
      className={cn('flex items-start gap-3 rounded-xl border px-4 py-3', styles.wrap, className)}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <span className={cn('mt-0.5 shrink-0', styles.icon)}>{icon ?? styles.node}</span>
      <div className="min-w-0 flex-1 text-xs leading-relaxed">
        {title && <p className="text-[0.8125rem] font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
      </div>
      {action}
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mt-0.5 -mr-1 shrink-0 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
};
