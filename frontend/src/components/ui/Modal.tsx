import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Rendered on the header row, left of the close button. */
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Extra element pinned between header and scrolling body (e.g. a confirm bar). */
  banner?: React.ReactNode;
}

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

/**
 * Shared modal shell: themed backdrop, spring panel, Escape-to-close and
 * body scroll lock. Body scrolls independently so headers/footers stay put.
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  headerActions,
  footer,
  children,
  size = 'lg',
  banner,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={cn(
              'relative flex max-h-[92vh] w-full flex-col overflow-hidden',
              'rounded-2xl border border-line bg-surface shadow-xl',
              sizes[size],
            )}
          >
            {(title || headerActions) && (
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 py-4">
                <div className="min-w-0 flex-1">
                  {title}
                  {subtitle && <div className="mt-1 text-xs text-ink-muted">{subtitle}</div>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {headerActions}
                  <button
                    onClick={onClose}
                    aria-label="Close dialog"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}

            {banner}

            <div className="scroll-slim flex-1 overflow-y-auto">{children}</div>

            {footer && (
              <div className="shrink-0 border-t border-line bg-surface-sunken px-5 py-3.5">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
