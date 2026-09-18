import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
}

/** Bottom-right transient notice. Inverts against the canvas in both themes. */
export const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => (
  <AnimatePresence>
    {message && (
      <motion.div
        role="status"
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        className="fixed right-4 bottom-4 z-[120] flex max-w-sm items-start gap-3 rounded-xl border border-line-strong bg-ink px-4 py-3 text-sm shadow-lg sm:right-6 sm:bottom-6"
        style={{ color: 'var(--canvas)' }}
      >
        <span className="flex-1 leading-relaxed">{message}</span>
        <button
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="-mt-0.5 -mr-1 shrink-0 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100"
        >
          <X size={15} />
        </button>
      </motion.div>
    )}
  </AnimatePresence>
);
