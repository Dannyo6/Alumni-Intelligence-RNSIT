import { describe, it, expect } from 'vitest';

describe('Phase 10F.4 — Application Shell & Navigation', () => {
  const navItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'Alumni Directory', path: '/directory' },
    { name: 'Data Quality', path: '/data-quality' },
  ];

  const adminItems = [
    { name: 'Admin Operations', path: '/admin' },
    { name: 'Bulk Import', path: '/import' },
  ];

  const isRouteActive = (itemPath: string, currentPath: string) => {
    if (itemPath === '/') {
      return currentPath === '/';
    }
    return currentPath.startsWith(itemPath);
  };

  describe('Navigation Route Matching', () => {
    it('matches root dashboard exactly', () => {
      expect(isRouteActive('/', '/')).toBe(true);
      expect(isRouteActive('/', '/directory')).toBe(false);
      expect(isRouteActive('/', '/admin')).toBe(false);
    });

    it('matches subroutes correctly for nested paths', () => {
      expect(isRouteActive('/directory', '/directory')).toBe(true);
      expect(isRouteActive('/directory', '/directory/profile/123')).toBe(true);
      expect(isRouteActive('/data-quality', '/data-quality')).toBe(true);
      expect(isRouteActive('/admin', '/admin')).toBe(true);
      expect(isRouteActive('/import', '/import')).toBe(true);
    });

    it('does not falsely activate sibling routes', () => {
      expect(isRouteActive('/admin', '/import')).toBe(false);
      expect(isRouteActive('/directory', '/data-quality')).toBe(false);
    });
  });

  describe('Admin Navigation Visibility Boundary', () => {
    const resolveNavigationItems = (isAdmin: boolean) => {
      return {
        main: navItems,
        admin: isAdmin ? adminItems : [],
      };
    };

    it('includes Admin Tools group only when isAdmin is true', () => {
      const adminNav = resolveNavigationItems(true);
      expect(adminNav.main).toHaveLength(3);
      expect(adminNav.admin).toHaveLength(2);
      expect(adminNav.admin.map(i => i.name)).toEqual(['Admin Operations', 'Bulk Import']);
    });

    it('omits Admin Tools group when isAdmin is false', () => {
      const regularNav = resolveNavigationItems(false);
      expect(regularNav.main).toHaveLength(3);
      expect(regularNav.admin).toHaveLength(0);
    });
  });

  describe('User Display Fallback Handling', () => {
    const resolveUserDisplay = (profile: { full_name?: string | null } | null, email?: string | null) => {
      const userInitial = profile?.full_name?.charAt(0).toUpperCase() || email?.charAt(0).toUpperCase() || 'A';
      const displayName = profile?.full_name || 'Administrator';
      const displayEmail = email || '';
      return { userInitial, displayName, displayEmail };
    };

    it('uses profile full name and initial when available', () => {
      const res = resolveUserDisplay({ full_name: 'Dr. Ramesh Kumar' }, 'ramesh@rnsit.ac.in');
      expect(res.userInitial).toBe('D');
      expect(res.displayName).toBe('Dr. Ramesh Kumar');
      expect(res.displayEmail).toBe('ramesh@rnsit.ac.in');
    });

    it('falls back to email initial and generic Administrator when profile is null', () => {
      const res = resolveUserDisplay(null, 'admin@rnsit.ac.in');
      expect(res.userInitial).toBe('A');
      expect(res.displayName).toBe('Administrator');
      expect(res.displayEmail).toBe('admin@rnsit.ac.in');
    });
  });
});
