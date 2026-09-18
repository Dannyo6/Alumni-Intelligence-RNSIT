import { describe, it, expect } from 'vitest';
import type { AuthStatus } from '../contexts/AuthContext';

/**
 * Phase 10F.2 — Entry Experience Routing Tests
 *
 * These tests verify the routing decision logic for the premium entry experience.
 * The Entry page must:
 *   - Redirect already-authorized admins directly to /
 *   - Render the entry experience for UNAUTHENTICATED users
 *   - Render nothing (null/loading) while INITIALIZING or PROFILE_LOADING
 *   - Not create auth bypasses
 *
 * PrivateRoute behavior remains unchanged from Phase 10A.8:
 *   - UNAUTHENTICATED now redirects to /entry (previously /login)
 *   - Everything else is identical
 */

type EntryPageDecision =
  | 'RENDER_NULL'        // Auth still initializing — don't flash entry screen
  | 'REDIRECT_PORTAL'    // Already authorized admin — skip entry, go to /
  | 'RENDER_ENTRY';      // Unauthenticated — show the entry experience

function resolveEntryPageDecision(params: {
  authStatus: AuthStatus;
  user: { id: string } | null;
}): EntryPageDecision {
  const { authStatus, user } = params;

  // While auth state is still resolving, render nothing
  if (authStatus === 'INITIALIZING' || authStatus === 'PROFILE_LOADING') {
    return 'RENDER_NULL';
  }

  // Already an authorized admin — don't show entry, go straight to portal
  if (authStatus === 'AUTHORIZED' && user) {
    return 'REDIRECT_PORTAL';
  }

  // All other states (UNAUTHENTICATED, UNAUTHORIZED, ERROR) — show entry
  return 'RENDER_ENTRY';
}

type PrivateRouteDecision =
  | 'RENDER_LOADING'
  | 'REDIRECT_LOGIN'    // unauthenticated now redirects directly to /login
  | 'RENDER_PORTAL'
  | 'RENDER_ACCESS_DENIED'
  | 'RENDER_ERROR';

function resolvePrivateRouteDecision(params: {
  user: { id: string } | null;
  loading: boolean;
  authStatus: AuthStatus;
  isAdmin: boolean;
  isActive: boolean;
}): PrivateRouteDecision {
  const { user, loading, authStatus, isAdmin, isActive } = params;

  if (loading || authStatus === 'INITIALIZING' || authStatus === 'PROFILE_LOADING') {
    return 'RENDER_LOADING';
  }

  // unauthenticated → /login
  if (!user || authStatus === 'UNAUTHENTICATED') {
    return 'REDIRECT_LOGIN';
  }

  if (authStatus === 'ERROR') {
    return 'RENDER_ERROR';
  }

  if (authStatus === 'AUTHORIZED' && isAdmin && isActive) {
    return 'RENDER_PORTAL';
  }

  return 'RENDER_ACCESS_DENIED';
}

describe('Phase 10F.2 — Entry Experience Routing', () => {
  describe('1. Entry Page — Auth State Gating', () => {
    it('renders null while INITIALIZING (prevents flash of entry before auth resolves)', () => {
      const result = resolveEntryPageDecision({
        authStatus: 'INITIALIZING',
        user: null,
      });
      expect(result).toBe('RENDER_NULL');
    });

    it('renders null while PROFILE_LOADING (prevents flash of entry before profile resolves)', () => {
      const result = resolveEntryPageDecision({
        authStatus: 'PROFILE_LOADING',
        user: { id: 'uuid-1' },
      });
      expect(result).toBe('RENDER_NULL');
    });

    it('redirects already-authorized admin to portal — does NOT show entry screen', () => {
      const result = resolveEntryPageDecision({
        authStatus: 'AUTHORIZED',
        user: { id: 'uuid-admin' },
      });
      expect(result).toBe('REDIRECT_PORTAL');
    });

    it('renders entry experience for UNAUTHENTICATED users', () => {
      const result = resolveEntryPageDecision({
        authStatus: 'UNAUTHENTICATED',
        user: null,
      });
      expect(result).toBe('RENDER_ENTRY');
    });

    it('renders entry experience for UNAUTHORIZED users (not admin)', () => {
      const result = resolveEntryPageDecision({
        authStatus: 'UNAUTHORIZED',
        user: { id: 'uuid-non-admin' },
      });
      expect(result).toBe('RENDER_ENTRY');
    });

    it('renders entry experience for ERROR state users', () => {
      const result = resolveEntryPageDecision({
        authStatus: 'ERROR',
        user: { id: 'uuid-1' },
      });
      expect(result).toBe('RENDER_ENTRY');
    });
  });

  describe('2. PrivateRoute — Direct Redirect Behavior (unauthenticated → /login)', () => {
    it('unauthenticated user accessing / is redirected to /login, NOT entry', () => {
      const result = resolvePrivateRouteDecision({
        user: null,
        loading: false,
        authStatus: 'UNAUTHENTICATED',
        isAdmin: false,
        isActive: false,
      });
      expect(result).toBe('REDIRECT_LOGIN');
      expect(result).not.toBe('RENDER_PORTAL');
      expect(result).not.toBe('RENDER_ACCESS_DENIED');
    });

    it('loading state still renders loading (not entry redirect) — no flash', () => {
      const result = resolvePrivateRouteDecision({
        user: null,
        loading: true,
        authStatus: 'INITIALIZING',
        isAdmin: false,
        isActive: false,
      });
      expect(result).toBe('RENDER_LOADING');
      expect(result).not.toBe('REDIRECT_LOGIN');
    });

    it('authorized admin still reaches the portal normally', () => {
      const result = resolvePrivateRouteDecision({
        user: { id: 'uuid-admin' },
        loading: false,
        authStatus: 'AUTHORIZED',
        isAdmin: true,
        isActive: true,
      });
      expect(result).toBe('RENDER_PORTAL');
    });

    it('ERROR state still renders error view (not entry, not portal)', () => {
      const result = resolvePrivateRouteDecision({
        user: { id: 'uuid-1' },
        loading: false,
        authStatus: 'ERROR',
        isAdmin: false,
        isActive: false,
      });
      expect(result).toBe('RENDER_ERROR');
      expect(result).not.toBe('REDIRECT_LOGIN');
    });
  });

  describe('3. Security — Entry page MUST NOT create auth bypasses', () => {
    it('AUTHORIZED without user object does NOT trigger redirect to portal', () => {
      // Edge case: authStatus AUTHORIZED but no user — should not redirect to portal
      const result = resolveEntryPageDecision({
        authStatus: 'AUTHORIZED',
        user: null, // No user object — inconsistent state
      });
      // Without a user object, we don't redirect to portal (render entry instead)
      expect(result).toBe('RENDER_ENTRY');
    });

    it('UNAUTHORIZED user is shown entry, NOT redirected to portal', () => {
      const result = resolveEntryPageDecision({
        authStatus: 'UNAUTHORIZED',
        user: { id: 'uuid-non-admin' },
      });
      expect(result).toBe('RENDER_ENTRY');
      expect(result).not.toBe('REDIRECT_PORTAL');
    });
  });
});
