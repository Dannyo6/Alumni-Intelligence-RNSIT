import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './cn';

export interface CommandItem {
  id: string;
  label: string;
  /** Second line — company, role, or a description of the action. */
  hint?: string;
  icon?: React.ReactNode;
  /** Right-aligned chip, e.g. a category or match reason. */
  meta?: React.ReactNode;
  onSelect: () => void;
}

export interface CommandGroup {
  heading: string;
  items: CommandItem[];
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  groups: CommandGroup[];
  loading?: boolean;
  placeholder?: string;
  /** Shown when the query returns nothing — never leave a dead end. */
  emptyHint?: React.ReactNode;
}

/**
 * Global ⌘K palette. Searching alumni, jumping between views and applying
 * common filters all live in one keyboard-first surface.
 *
 * Arrow keys move, Enter selects, Escape closes. The active row is kept in
 * view as the selection moves.
 */
export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onClose,
  query,
  onQueryChange,
  groups,
  loading = false,
  placeholder = 'Search alumni, jump to a view, or apply a filter…',
  emptyHint,
}) => {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flatten for keyboard traversal while keeping the grouped rendering.
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  // Reset the cursor whenever the result set changes. Adjusted during render
  // rather than in an effect, so the highlighted row never lags a frame behind
  // the list it points into.
  const resultKey = `${query}|${flat.map((i) => i.id).join(',')}`;
  const [lastKey, setLastKey] = useState(resultKey);
  if (resultKey !== lastKey) {
    setLastKey(resultKey);
    setActive(0);
  }

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Keep the highlighted row visible without scrolling the whole page.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (flat.length ? (i + 1) % flat.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      flat[active]?.onSelect();
    }
  };

  let cursor = -1;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[130] flex items-start justify-center px-4 pt-[10vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            transition={{ type: 'spring', stiffness: 460, damping: 36 }}
            onKeyDown={handleKey}
            className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-xl"
          >
            <div className="flex shrink-0 items-center gap-3 border-b border-line px-4">
              {loading ? (
                <Loader2 size={17} className="shrink-0 animate-spin text-accent" />
              ) : (
                <Search size={17} className="shrink-0 text-ink-faint" />
              )}
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder={placeholder}
                aria-label="Search"
                className="h-12 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
              />
              <kbd className="hidden shrink-0 rounded border border-line bg-surface-sunken px-1.5 py-0.5 font-mono text-2xs text-ink-faint sm:block">
                ESC
              </kbd>
            </div>

            <div ref={listRef} className="scroll-slim max-h-[52vh] overflow-y-auto py-2">
              {flat.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm font-medium text-ink-secondary">
                    {query ? `No matches for “${query}”` : 'Start typing to search'}
                  </p>
                  {emptyHint && (
                    <div className="mt-2 text-xs leading-relaxed text-ink-faint">{emptyHint}</div>
                  )}
                </div>
              ) : (
                groups
                  .filter((g) => g.items.length > 0)
                  .map((group) => (
                    <div key={group.heading} className="mb-1">
                      <div className="px-4 py-1.5 font-mono text-2xs font-semibold tracking-[0.1em] text-ink-faint uppercase">
                        {group.heading}
                      </div>
                      {group.items.map((item) => {
                        cursor += 1;
                        const idx = cursor;
                        const isActive = idx === active;
                        return (
                          <button
                            key={item.id}
                            data-idx={idx}
                            onMouseEnter={() => setActive(idx)}
                            onClick={item.onSelect}
                            className={cn(
                              'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                              isActive ? 'bg-accent-soft' : 'hover:bg-surface-hover',
                            )}
                          >
                            <span
                              className={cn(
                                'shrink-0',
                                isActive ? 'text-accent' : 'text-ink-faint',
                              )}
                            >
                              {item.icon}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span
                                className={cn(
                                  'block truncate text-[0.8125rem] font-medium',
                                  isActive ? 'text-accent-ink' : 'text-ink',
                                )}
                              >
                                {item.label}
                              </span>
                              {item.hint && (
                                <span className="block truncate text-2xs text-ink-muted">
                                  {item.hint}
                                </span>
                              )}
                            </span>
                            {item.meta}
                            {isActive && (
                              <CornerDownLeft size={13} className="shrink-0 text-accent" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
              )}
            </div>

            <div className="flex shrink-0 items-center gap-4 border-t border-line bg-surface-sunken px-4 py-2 font-mono text-2xs text-ink-faint">
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-line bg-surface px-1">↑</kbd>
                <kbd className="rounded border border-line bg-surface px-1">↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-line bg-surface px-1">↵</kbd>
                open
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
