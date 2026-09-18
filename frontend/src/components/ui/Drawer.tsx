import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './cn';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Panel width at desktop. Mobile always goes full-width. */
  width?: 'md' | 'lg' | 'xl';
  /** Pinned under the header, above the scrolling body. */
  banner?: React.ReactNode;
}

const widths = {
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-3xl',
};

/**
 * Right-edge panel for detail views. Chosen over a centred modal so the list
 * behind stays visible — the reader keeps their place in the result set while
 * inspecting one record.
 *
 * Escape closes, the backdrop closes, body scroll is locked while open.
 */
export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  title,
  subtitle,
  headerActions,
  footer,
  children,
  width = 'lg',
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
        <div className="fixed inset-0 z-[100]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
            aria-hidden="true"
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 40, mass: 0.8 }}
            className={cn(
              'absolute inset-y-0 right-0 flex w-full flex-col border-l border-line bg-surface shadow-xl',
              widths[width],
            )}
          >
            {(title || headerActions) && (
              <header className="relative shrink-0 overflow-hidden border-b border-line">
                <div
                  aria-hidden="true"
                  className="plot-grid plot-grid-fade pointer-events-none absolute inset-0 opacity-50"
                />
                <div className="relative flex items-start justify-between gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    {title}
                    {subtitle && <div className="mt-1 text-xs text-ink-muted">{subtitle}</div>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {headerActions}
                    <button
                      onClick={onClose}
                      aria-label="Close panel"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              </header>
            )}

            {banner}

            <div className="scroll-slim flex-1 overflow-y-auto overscroll-contain">{children}</div>

            {footer && (
              <div className="shrink-0 border-t border-line bg-surface-sunken px-5 py-3.5">
                {footer}
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
