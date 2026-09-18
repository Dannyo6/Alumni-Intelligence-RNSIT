import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Users, LayoutDashboard, LogOut, Upload, ShieldAlert, ShieldCheck,
  Menu, X, GraduationCap, Search, Sparkles, Globe, Building2, Mail, ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import { fetchAlumniDiscovery } from '../services/directoryService';
import { DEFAULT_DIRECTORY_STATE } from '../utils/urlState';
import { ThemeToggle, Badge, CommandPalette, DashboardVeil, cn } from './ui';
import type { CommandGroup } from './ui';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

const Layout = () => {
  const { user } = useAuth();
  const location = useLocation();
  // The veil is a Dashboard treatment only — other routes keep the plain canvas.
  
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // ─── Command palette ──────────────────────────────────────────────────────
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(paletteQuery.trim()), 220);
    return () => clearTimeout(t);
  }, [paletteQuery]);

  // Cmd/Ctrl-K from anywhere, except while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (k === '/' && !paletteOpen) {
        const el = document.activeElement;
        const typing =
          el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          el instanceof HTMLSelectElement ||
          (el instanceof HTMLElement && el.isContentEditable);
        if (!typing) {
          e.preventDefault();
          setPaletteOpen(true);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paletteOpen]);

  const { data: paletteResults, isFetching: paletteLoading } = useQuery({
    queryKey: ['paletteSearch', debounced],
    queryFn: () =>
      fetchAlumniDiscovery({ ...DEFAULT_DIRECTORY_STATE, searchQuery: debounced, pageSize: 25 }),
    enabled: paletteOpen && debounced.length >= 2,
    staleTime: 1000 * 30,
  });

  const closePalette = useCallback(() => {
    setPaletteOpen(false);
    setPaletteQuery('');
  }, []);

  const go = useCallback(
    (to: string) => {
      closePalette();
      navigate(to);
    },
    [closePalette, navigate],
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems: NavItem[] = useMemo(
    () => [
      { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={17} /> },
      { name: 'Alumni Directory', path: '/directory', icon: <Users size={17} /> },
      { name: 'Data Quality', path: '/data-quality', icon: <ShieldAlert size={17} /> },
    ],
    [],
  );

  const adminItems: NavItem[] = useMemo(() => [
            { name: 'Admin Operations', path: '/admin', icon: <ShieldCheck size={17} /> },
            { name: 'Bulk Import', path: '/import', icon: <Upload size={17} /> },
          ], []);

  // ─── Palette content ──────────────────────────────────────────────────────
  const paletteGroups: CommandGroup[] = useMemo(() => {
    const q = debounced.toLowerCase();
    const groups: CommandGroup[] = [];

    const people = (paletteResults?.records ?? []).slice(0, 6);
    if (people.length > 0) {
      groups.push({
        heading: `Alumni · ${(paletteResults?.totalCount ?? 0).toLocaleString()} match`,
        items: people.map((r) => ({
          id: `person-${r.id}`,
          label: r.name,
          hint: [r.current_designation, r.current_company].filter(Boolean).join(' · ') || undefined,
          icon: <Users size={15} />,
          meta: r.is_high_value ? (
            <Badge tone="warn" className="shrink-0">
              High value
            </Badge>
          ) : undefined,
          onSelect: () => go(`/directory?q=${encodeURIComponent(r.name)}`),
        })),
      });
      if ((paletteResults?.totalCount ?? 0) > people.length) {
        groups.push({
          heading: 'Refine',
          items: [
            {
              id: 'see-all',
              label: `See all ${(paletteResults?.totalCount ?? 0).toLocaleString()} results in the Directory`,
              icon: <ArrowRight size={15} />,
              onSelect: () => go(`/directory?q=${encodeURIComponent(debounced)}`),
            },
          ],
        });
      }
    }

    const segments = [
      { id: 'highValue', label: 'High value alumni', param: 'highValue', icon: <Sparkles size={15} /> },
      { id: 'global', label: 'Alumni based outside India', param: 'global', icon: <Globe size={15} /> },
      { id: 'topEmployer', label: 'Alumni at top-tier employers', param: 'topEmployer', icon: <Building2 size={15} /> },
      { id: 'hasEmail', label: 'Alumni who are directly reachable', param: 'hasEmail', icon: <Mail size={15} /> },
      { id: 'needsVerification', label: 'Records needing verification', param: 'needsVerification', icon: <ShieldAlert size={15} /> },
    ].filter((s) => !q || s.label.toLowerCase().includes(q));

    if (segments.length > 0) {
      groups.push({
        heading: 'Segments',
        items: segments.map((s) => ({
          id: `seg-${s.id}`,
          label: s.label,
          hint: 'Open in the Directory',
          icon: s.icon,
          onSelect: () => go(`/directory?${s.param}=true`),
        })),
      });
    }

    const destinations = [...navItems, ...adminItems].filter(
      (n) => !q || n.name.toLowerCase().includes(q),
    );
    if (destinations.length > 0) {
      groups.push({
        heading: 'Go to',
        items: destinations.map((n) => ({
          id: `nav-${n.path}`,
          label: n.name,
          icon: n.icon,
          onSelect: () => go(n.path),
        })),
      });
    }

    return groups;
  }, [debounced, paletteResults, navItems, adminItems, go]);

  const renderNavLink = (item: NavItem, onNavigate?: () => void) => {
    const isActive = location.pathname === item.path;
    return (
      <Link
        key={item.name}
        to={item.path}
        onClick={onNavigate}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[0.8125rem] font-medium',
          'transition-colors duration-150',
          isActive
            ? 'bg-accent-soft text-accent-ink'
            : 'text-ink-secondary hover:bg-surface-hover hover:text-ink',
        )}
      >
        {isActive && (
          <motion.span
            layoutId="nav-active-rail"
            className="absolute top-1.5 bottom-1.5 -left-3 w-[3px] rounded-r-full bg-accent"
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          />
        )}
        <span className={cn('shrink-0', isActive ? 'text-accent' : 'text-ink-faint group-hover:text-ink-muted')}>
          {item.icon}
        </span>
        <span className="truncate">{item.name}</span>
      </Link>
    );
  };

  const renderSidebar = (onClose?: () => void) => (
    <>
      {/* Brand */}
      <div className="relative flex h-16 shrink-0 items-center gap-2.5 overflow-hidden border-b border-line px-5">
        <div aria-hidden="true" className="plot-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white dark:text-brand-950">
          <GraduationCap size={17} />
        </div>
        <div className="relative min-w-0 flex-1">
          <p className="truncate text-[0.8125rem] leading-tight font-semibold tracking-tight text-ink">
            RNSIT Alumni
          </p>
          <p className="font-mono text-2xs leading-tight tracking-wide text-ink-faint">
            INTELLIGENCE
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close navigation menu"
            className="relative -mr-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <X size={17} />
          </button>
        )}
      </div>

      {/* Search trigger */}
      <div className="shrink-0 px-3 pt-3">
        <button
          onClick={() => {
            onClose?.();
            setPaletteOpen(true);
          }}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-lg border border-line bg-surface-sunken px-3 py-2',
            'text-xs text-ink-faint transition-colors hover:border-line-strong hover:text-ink-muted',
          )}
        >
          <Search size={14} className="shrink-0" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="rounded border border-line bg-surface px-1 font-mono text-2xs">⌘K</kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="scroll-slim flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 font-mono text-2xs font-semibold tracking-[0.12em] text-ink-faint uppercase">
          Main
        </p>
        <div className="space-y-0.5">{navItems.map((item) => renderNavLink(item, onClose))}</div>

        {adminItems.length > 0 && (
          <>
            <p className="mt-6 mb-2 px-3 font-mono text-2xs font-semibold tracking-[0.12em] text-ink-faint uppercase">
              Admin Tools
            </p>
            <div className="space-y-0.5">{adminItems.map((item) => renderNavLink(item, onClose))}</div>
          </>
        )}
      </nav>

      {/* Account */}
      <div className="shrink-0 border-t border-line p-3">
          <div className="mb-2 flex items-center justify-between gap-2.5 rounded-lg px-2 py-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-ink">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-ink" title={user?.email ?? undefined}>
                  {user?.email}
                </p>
                <Badge tone="accent" dot className="mt-1">
                  Administrator
                </Badge>
              </div>
            </div>
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
          </div>
          <button
            onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[0.8125rem] font-medium text-ink-secondary transition-colors hover:bg-danger-soft hover:text-danger-ink"
        >
          <LogOut size={17} className="shrink-0 text-ink-faint" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface md:flex">
        {renderSidebar()}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line bg-surface md:hidden"
            >
              {renderSidebar(() => setMobileOpen(false))}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main column. Positioned so the Dashboard veil can sit behind it —
          the sidebar is a sibling, so it is never covered. */}
      <div className="relative flex h-screen min-w-0 flex-1 flex-col">
        <DashboardVeil />
        <header className="md:hidden relative z-10 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface/80 px-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-secondary transition-colors hover:bg-surface-hover"
            >
              <Menu size={17} />
            </button>
            <span className="text-[0.8125rem] font-semibold text-ink">RNSIT Alumni</span>
          </div>
          <ThemeToggle />
        </header>

        <main className="scroll-slim relative z-10 flex-1 overflow-y-auto">
          {/* Route transition: content rises briefly so navigation reads as a move */}
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-[1600px] p-4 md:p-8"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={closePalette}
        query={paletteQuery}
        onQueryChange={setPaletteQuery}
        groups={paletteGroups}
        loading={paletteLoading}
        emptyHint={
          <>
            Try a company (<span className="font-mono">Amazon</span>), a branch (
            <span className="font-mono">CSE</span>), a batch year (
            <span className="font-mono">2019</span>) or a country.
          </>
        }
      />
    </div>
  );
};

export default Layout;






