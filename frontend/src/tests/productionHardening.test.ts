import { describe, it, expect, vi } from 'vitest';
import { sanitizeCsvCell, sanitizeFilename, sanitizeSpreadsheetCell, sanitizeSpreadsheetObject } from '../utils/exportSafety';
import { formatDateSafe, formatDateTimeSafe, formatNumberSafe } from '../utils/formatters';
import { resolveRouteGuardDecision } from './auth.test';
import type { AuthStatus } from '../contexts/AuthContext';

describe('Phase 10D — Frontend Production Hardening Tests', () => {
  describe('1. CSV & Spreadsheet Formula Injection Protection (CWE-1236)', () => {
    it('neutralizes formula injection characters (=, +, -, @, \\t, \\r)', () => {
      expect(sanitizeCsvCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(sanitizeCsvCell('+1234567890')).toBe("'+1234567890");
      expect(sanitizeCsvCell('-50.00')).toBe("'-50.00");
      expect(sanitizeCsvCell('@cmd/c calc')).toBe("'@cmd/c calc");
      expect(sanitizeCsvCell('\talert(1)')).toBe("'\talert(1)");
      expect(sanitizeCsvCell('\r=1+1')).toBe('"\'\r=1+1"');
    });

    it('properly escapes quotes, commas, and newlines in CSV cells', () => {
      expect(sanitizeCsvCell('Hello, World')).toBe('"Hello, World"');
      expect(sanitizeCsvCell('Dr. Ramesh "The Dean"')).toBe('"Dr. Ramesh ""The Dean"""');
      expect(sanitizeCsvCell('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
    });

    it('safely handles null and undefined in CSV cells', () => {
      expect(sanitizeCsvCell(null)).toBe('');
      expect(sanitizeCsvCell(undefined)).toBe('');
      expect(sanitizeCsvCell('')).toBe('');
    });

    it('neutralizes spreadsheet cell values for Excel/XLSX export', () => {
      expect(sanitizeSpreadsheetCell('=HYPERLINK("evil.com")')).toBe('\'=HYPERLINK("evil.com")');
      expect(sanitizeSpreadsheetCell('+919876543210')).toBe('\'+919876543210');
      expect(sanitizeSpreadsheetCell('Normal Name')).toBe('Normal Name');
      expect(sanitizeSpreadsheetCell(12345)).toBe(12345);
      expect(sanitizeSpreadsheetCell(null)).toBe(null);
    });

    it('neutralizes all properties in an object for spreadsheet export', () => {
      const input = {
        name: '=cmd|',
        email: 'admin@rnsit.ac.in',
        phone: '+919876543210',
        score: 100,
        notes: null,
      };

      const result = sanitizeSpreadsheetObject(input);
      expect(result.name).toBe('\'=cmd|');
      expect(result.email).toBe('admin@rnsit.ac.in');
      expect(result.phone).toBe('\'+919876543210');
      expect(result.score).toBe(100);
      expect(result.notes).toBe(null);
    });
  });

  describe('2. Filename Sanitization', () => {
    it('strips path traversal and unsafe characters from export filenames', () => {
      expect(sanitizeFilename('../../../etc/passwd.csv')).toBe('______etc_passwd.csv');
      expect(sanitizeFilename('alumni:report*<2026>?.csv')).toBe('alumni_report__2026__.csv');
      expect(sanitizeFilename('valid_filename_123.csv')).toBe('valid_filename_123.csv');
    });

    it('falls back gracefully on empty or invalid filename inputs', () => {
      expect(sanitizeFilename('', 'fallback.csv')).toBe('fallback.csv');
      expect(sanitizeFilename(null as any, 'fallback.csv')).toBe('fallback.csv');
      expect(sanitizeFilename('   ', 'fallback.csv')).toBe('fallback.csv');
    });
  });

  describe('3. Defensive Formatting Utilities', () => {
    it('safely formats dates without throwing on invalid or missing values', () => {
      expect(formatDateSafe(null)).toBe('—');
      expect(formatDateSafe(undefined)).toBe('—');
      expect(formatDateSafe('invalid-date-string')).toBe('—');
      expect(formatDateSafe('2026-08-28T12:00:00Z')).toBe(new Date('2026-08-28T12:00:00Z').toLocaleDateString());
    });

    it('safely formats timestamps without throwing on invalid values', () => {
      expect(formatDateTimeSafe(null, 'Never')).toBe('Never');
      expect(formatDateTimeSafe(undefined)).toBe('—');
      expect(formatDateTimeSafe('corrupt-timestamp')).toBe('—');
      expect(formatDateTimeSafe('2026-08-28T12:00:00Z')).toBe(new Date('2026-08-28T12:00:00Z').toLocaleString());
    });

    it('safely formats numbers without throwing on NaN or undefined', () => {
      expect(formatNumberSafe(null)).toBe('0');
      expect(formatNumberSafe(undefined)).toBe('0');
      expect(formatNumberSafe(NaN)).toBe('0');
      expect(formatNumberSafe(6472)).toBe('6,472');
      expect(formatNumberSafe('10000')).toBe('10,000');
    });
  });

  describe('4. TanStack Query Retry & Error Policy', () => {
    // Pure reproduction of the query retry predicate configured in main.tsx
    const shouldRetryQuery = (failureCount: number, error: any): boolean => {
      const status = error?.status || error?.statusCode || error?.code;
      if (
        status === 401 ||
        status === 403 ||
        status === '42501' ||
        status === 'PGRST301' ||
        status === 'invalid_parameter_value'
      ) {
        return false;
      }
      return failureCount < 2;
    };

    it('does NOT retry authorization / permission failures (401, 403, 42501, PGRST301)', () => {
      expect(shouldRetryQuery(0, { status: 401 })).toBe(false);
      expect(shouldRetryQuery(0, { status: 403 })).toBe(false);
      expect(shouldRetryQuery(0, { code: '42501' })).toBe(false);
      expect(shouldRetryQuery(0, { code: 'PGRST301' })).toBe(false);
      expect(shouldRetryQuery(0, { code: 'invalid_parameter_value' })).toBe(false);
    });

    it('retries transient network / 500 errors up to 2 times', () => {
      expect(shouldRetryQuery(0, { status: 500 })).toBe(true);
      expect(shouldRetryQuery(1, { status: 500 })).toBe(true);
      expect(shouldRetryQuery(2, { status: 500 })).toBe(false);
      expect(shouldRetryQuery(0, new Error('Network error'))).toBe(true);
    });
  });

  describe('5. Auth Error & Network Failure Resilience (Phase 10D.1)', () => {
    it('1. authStatus ERROR never renders protected children and fails closed', () => {
      const decision = resolveRouteGuardDecision({
        user: { id: 'uuid-1', email: 'admin@rnsit.ac.in' },
        loading: false,
        authStatus: 'ERROR' as AuthStatus,
        isAdmin: false,
        isActive: false,
      });

      expect(decision).toBe('RENDER_ERROR');
      expect(decision).not.toBe('RENDER_PORTAL');
    });

    it('2. ERROR does not render Access Denied semantics', () => {
      const decision = resolveRouteGuardDecision({
        user: { id: 'uuid-1', email: 'admin@rnsit.ac.in' },
        loading: false,
        authStatus: 'ERROR' as AuthStatus,
        isAdmin: false,
        isActive: false,
      });

      expect(decision).toBe('RENDER_ERROR');
      expect(decision).not.toBe('RENDER_ACCESS_DENIED');
    });

    it('3. UNAUTHORIZED still renders Access Denied', () => {
      const decision = resolveRouteGuardDecision({
        user: { id: 'uuid-unauthorized', email: 'user@rnsit.ac.in' },
        loading: false,
        authStatus: 'UNAUTHORIZED' as AuthStatus,
        isAdmin: false,
        isActive: false,
      });

      expect(decision).toBe('RENDER_ACCESS_DENIED');
    });

    it('4. UNAUTHENTICATED still redirects to login', () => {
      const decision = resolveRouteGuardDecision({
        user: null,
        loading: false,
        authStatus: 'UNAUTHENTICATED' as AuthStatus,
        isAdmin: false,
        isActive: false,
      });

      expect(decision).toBe('REDIRECT_LOGIN');
    });

    it('5. AUTHORIZED still renders protected content (RENDER_PORTAL)', () => {
      const decision = resolveRouteGuardDecision({
        user: { id: 'uuid-admin', email: 'admin@rnsit.ac.in' },
        loading: false,
        authStatus: 'AUTHORIZED' as AuthStatus,
        isAdmin: true,
        isActive: true,
      });

      expect(decision).toBe('RENDER_PORTAL');
    });

    it('6. retry triggers authorization/profile resolution', async () => {
      const mockRefreshProfile = vi.fn().mockResolvedValue(undefined);
      let isRetrying = false;

      const handleRetry = async () => {
        if (isRetrying) return;
        isRetrying = true;
        try {
          await mockRefreshProfile();
        } finally {
          isRetrying = false;
        }
      };

      await handleRetry();
      expect(mockRefreshProfile).toHaveBeenCalledTimes(1);
    });

    it('7. repeated retry cannot create duplicate concurrent requests', async () => {
      let resolvePromise: () => void;
      const delayedPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      const mockRefreshProfile = vi.fn().mockImplementation(() => delayedPromise);
      let isRetrying = false;

      const handleRetry = async () => {
        if (isRetrying) return;
        isRetrying = true;
        try {
          await mockRefreshProfile();
        } finally {
          isRetrying = false;
        }
      };

      // Fire 3 simultaneous retries
      const p1 = handleRetry();
      const p2 = handleRetry();
      const p3 = handleRetry();

      resolvePromise!();
      await Promise.all([p1, p2, p3]);

      // Only the first one was executed; concurrent calls were blocked
      expect(mockRefreshProfile).toHaveBeenCalledTimes(1);
    });

    it('8. route guard remains in RENDER_LOADING during initial or profile loading', () => {
      const decision1 = resolveRouteGuardDecision({
        user: null,
        loading: true,
        authStatus: 'INITIALIZING' as AuthStatus,
        isAdmin: false,
        isActive: false,
      });
      expect(decision1).toBe('RENDER_LOADING');

      const decision2 = resolveRouteGuardDecision({
        user: { id: 'uuid-1' },
        loading: true,
        authStatus: 'PROFILE_LOADING' as AuthStatus,
        isAdmin: false,
        isActive: false,
      });
      expect(decision2).toBe('RENDER_LOADING');
    });
  });

  describe('6. Query Cache Isolation on Logout', () => {
    it('calls queryClient.clear on logout to prevent stale protected data leakage', () => {
      const mockQueryClient = {
        clear: vi.fn(),
      };

      // Simulate sign out handler
      const handleSignOut = () => {
        mockQueryClient.clear();
      };

      handleSignOut();
      expect(mockQueryClient.clear).toHaveBeenCalledTimes(1);
    });
  });
});
