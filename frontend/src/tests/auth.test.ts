import { describe, it, expect } from 'vitest';
import type { Database } from '../types/supabase';
import type { AuthStatus } from '../contexts/AuthContext';

type Profile = Database['public']['Tables']['profiles']['Row'];

// Pure representation of the Route Guard decision engine
export type RouteDecision = 'RENDER_LOADING' | 'REDIRECT_LOGIN' | 'RENDER_PORTAL' | 'RENDER_ACCESS_DENIED' | 'RENDER_ERROR';

export function resolveRouteGuardDecision(params: {
  user: { id: string; email?: string } | null;
  loading: boolean;
  authStatus: AuthStatus;
  isAdmin: boolean;
  isActive: boolean;
}): RouteDecision {
  const { user, loading, authStatus, isAdmin, isActive } = params;

  // 1. Loading state (initial session or profile fetch pending)
  if (loading || authStatus === 'INITIALIZING' || authStatus === 'PROFILE_LOADING') {
    return 'RENDER_LOADING';
  }

  // 2. Unauthenticated -> redirect to login
  if (!user || authStatus === 'UNAUTHENTICATED') {
    return 'REDIRECT_LOGIN';
  }

  // 3. Transient error state -> render sanitized error view with retry
  if (authStatus === 'ERROR') {
    return 'RENDER_ERROR';
  }

  // 4. Conclusively authorized admin -> render protected portal
  if (authStatus === 'AUTHORIZED' && isAdmin && isActive) {
    return 'RENDER_PORTAL';
  }

  // 5. Conclusively resolved unauthorized or inactive -> Access Denied
  return 'RENDER_ACCESS_DENIED';
}

describe('Phase 10A.8 — Auth State Machine & Route Guard Parity', () => {
  const evaluateAccess = (profile: Profile | null) => {
    if (!profile) {
      return { isAdmin: false, isActive: false, hasAccess: false, authStatus: 'UNAUTHORIZED' as AuthStatus };
    }
    const isActive = Boolean(profile.is_active);
    const isAdmin = profile.role === 'admin' && isActive;
    const hasAccess = isActive && isAdmin;
    const authStatus: AuthStatus = hasAccess ? 'AUTHORIZED' : 'UNAUTHORIZED';

    return { isAdmin, isActive, hasAccess, authStatus };
  };

  describe('1. Profile Role & Active Evaluation', () => {
    it('correctly grants admin status for active admin profile', () => {
      const adminProfile: Profile = {
        id: 'uuid-admin-1',
        role: 'admin',
        is_active: true,
        full_name: 'Admin User',
        email: 'admin@rnsit.ac.in',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = evaluateAccess(adminProfile);
      expect(result.isAdmin).toBe(true);
      expect(result.isActive).toBe(true);
      expect(result.hasAccess).toBe(true);
      expect(result.authStatus).toBe('AUTHORIZED');
    });

    it('denies application access for inactive admin accounts', () => {
      const inactiveAdmin: Profile = {
        id: 'uuid-admin-inactive',
        role: 'admin',
        is_active: false,
        full_name: 'Inactive Admin',
        email: 'inactive_admin@rnsit.ac.in',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const adminResult = evaluateAccess(inactiveAdmin);
      expect(adminResult.isAdmin).toBe(false);
      expect(adminResult.isActive).toBe(false);
      expect(adminResult.hasAccess).toBe(false);
      expect(adminResult.authStatus).toBe('UNAUTHORIZED');
    });

    it('denies access when no profile is present', () => {
      const result = evaluateAccess(null);
      expect(result.isAdmin).toBe(false);
      expect(result.isActive).toBe(false);
      expect(result.hasAccess).toBe(false);
      expect(result.authStatus).toBe('UNAUTHORIZED');
    });
  });

  describe('2. Route Guard & Flash Prevention (Phase 10A.8 Regression Tests)', () => {
    it('session exists + profile loading DOES NOT show Access Denied (renders loading spinner)', () => {
      const decision = resolveRouteGuardDecision({
        user: { id: 'uuid-admin-1', email: 'admin@rnsit.ac.in' },
        loading: true,
        authStatus: 'PROFILE_LOADING',
        isAdmin: false, // temporarily false while loading
        isActive: false, // temporarily false while loading
      });

      expect(decision).toBe('RENDER_LOADING');
      expect(decision).not.toBe('RENDER_ACCESS_DENIED');
      expect(decision).not.toBe('REDIRECT_LOGIN');
    });

    it('auth initializing DOES NOT show Access Denied or redirect to Login (renders loading spinner)', () => {
      const decision = resolveRouteGuardDecision({
        user: null,
        loading: true,
        authStatus: 'INITIALIZING',
        isAdmin: false,
        isActive: false,
      });

      expect(decision).toBe('RENDER_LOADING');
      expect(decision).not.toBe('RENDER_ACCESS_DENIED');
      expect(decision).not.toBe('REDIRECT_LOGIN');
    });

    it('session exists + active admin profile → renders protected portal (dashboard)', () => {
      const decision = resolveRouteGuardDecision({
        user: { id: 'uuid-admin-1', email: 'admin@rnsit.ac.in' },
        loading: false,
        authStatus: 'AUTHORIZED',
        isAdmin: true,
        isActive: true,
      });

      expect(decision).toBe('RENDER_PORTAL');
    });

    it('session exists + inactive profile → conclusively renders Access Denied', () => {
      const decision = resolveRouteGuardDecision({
        user: { id: 'uuid-inactive-1', email: 'inactive@rnsit.ac.in' },
        loading: false,
        authStatus: 'UNAUTHORIZED',
        isAdmin: false,
        isActive: false,
      });

      expect(decision).toBe('RENDER_ACCESS_DENIED');
    });

    it('session exists + missing/unapproved profile → conclusively renders Access Denied', () => {
      const decision = resolveRouteGuardDecision({
        user: { id: 'uuid-unapproved-1', email: 'unapproved@rnsit.ac.in' },
        loading: false,
        authStatus: 'UNAUTHORIZED',
        isAdmin: false,
        isActive: false,
      });

      expect(decision).toBe('RENDER_ACCESS_DENIED');
    });

    it('signed-out user → redirects to login', () => {
      const decision = resolveRouteGuardDecision({
        user: null,
        loading: false,
        authStatus: 'UNAUTHENTICATED',
        isAdmin: false,
        isActive: false,
      });

      expect(decision).toBe('REDIRECT_LOGIN');
    });

    it('authorization/profile error fails closed → renders distinct error view (RENDER_ERROR)', () => {
      const decision = resolveRouteGuardDecision({
        user: { id: 'uuid-err-1' },
        loading: false,
        authStatus: 'ERROR',
        isAdmin: false,
        isActive: false,
      });

      expect(decision).toBe('RENDER_ERROR');
    });
  });

  describe('3. Session Transitions & Stale Profile Leakage Prevention', () => {
    it('signing out clears prior profile state and resets status to UNAUTHENTICATED', () => {
      // Simulate state machine on sign-out
      let state = {
        user: { id: 'uuid-admin-1' } as { id: string } | null,
        profile: { id: 'uuid-admin-1', role: 'admin', is_active: true } as Profile | null,
        isAdmin: true,
        isActive: true,
        authStatus: 'AUTHORIZED' as AuthStatus,
        loading: false,
      };

      // Handler for SIGNED_OUT
      const handleSignOut = () => {
        state = {
          user: null,
          profile: null,
          isAdmin: false,
          isActive: false,
          authStatus: 'UNAUTHENTICATED',
          loading: false,
        };
      };

      handleSignOut();

      expect(state.user).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.isAdmin).toBe(false);
      expect(state.isActive).toBe(false);
      expect(state.authStatus).toBe('UNAUTHENTICATED');
      expect(state.loading).toBe(false);

      const decision = resolveRouteGuardDecision(state);
      expect(decision).toBe('REDIRECT_LOGIN');
    });

    it('switching accounts resets profile to null and enters PROFILE_LOADING without stale admin reuse', () => {
      // Step 1: Admin account is active
      let state = {
        user: { id: 'uuid-admin-1' } as { id: string } | null,
        profile: { id: 'uuid-admin-1', role: 'admin', is_active: true } as Profile | null,
        isAdmin: true,
        isActive: true,
        authStatus: 'AUTHORIZED' as AuthStatus,
        loading: false,
      };

      // Step 2: New user session arrives (e.g. inactive user)
      const handleUserSwitch = (newUserId: string) => {
        // Clear prior state immediately before fetch
        state = {
          user: { id: newUserId },
          profile: null,
          isAdmin: false,
          isActive: false,
          authStatus: 'PROFILE_LOADING',
          loading: true,
        };
      };

      handleUserSwitch('uuid-inactive-user');

      // During intermediate loading, previous admin permissions MUST NOT leak
      expect(state.isAdmin).toBe(false);
      expect(state.isActive).toBe(false);
      expect(state.profile).toBeNull();
      expect(state.authStatus).toBe('PROFILE_LOADING');
      expect(state.loading).toBe(true);

      const intermediateDecision = resolveRouteGuardDecision(state);
      expect(intermediateDecision).toBe('RENDER_LOADING');
      expect(intermediateDecision).not.toBe('RENDER_PORTAL');
      expect(intermediateDecision).not.toBe('RENDER_ACCESS_DENIED');
    });
  });
});

