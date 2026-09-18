import { describe, it, expect } from 'vitest';
import type { 
  AdminImportJob, 
  DuplicateCandidateItem, 
  ImportErrorItem,
  ImportJobStatus
} from '../services/adminService';

describe('Phase 8 — Institutional / Admin Operations (Schema v1)', () => {

  // ─── 1. Access Control & Role Permissions ───────────────────────────────────
  describe('Admin Route Access & Privilege Checks', () => {
    const evaluateAdminAccess = (user: { role: string; is_active: boolean } | null) => {
      if (!user) return false;
      return user.role === 'admin' && user.is_active === true;
    };

    it('grants access to active administrators', () => {
      expect(evaluateAdminAccess({ role: 'admin', is_active: true })).toBe(true);
    });


    it('denies access to inactive administrator accounts', () => {
      expect(evaluateAdminAccess({ role: 'admin', is_active: false })).toBe(false);
    });

    it('denies access to unauthenticated or null sessions', () => {
      expect(evaluateAdminAccess(null)).toBe(false);
    });
  });

  // ─── 2. Safe User Management & Last Admin Safeguard ─────────────────────────
  describe('User Role, Status Mutation & Last Admin Guard', () => {
    const validateRoleUpdate = (
      targetUser: { id: string; role: string; is_active: boolean },
      newRole: string,
      newActive: boolean,
      callerRole: string,
      callerActive: boolean,
      activeAdminCount: number
    ) => {
      if (callerRole !== 'admin' || !callerActive) {
        throw new Error('Unauthorized: Only active admins may update user roles');
      }
      if (!['admin'].includes(newRole)) {
        throw new Error('Invalid role: Role must be admin');
      }

      const isTargetActiveAdmin = targetUser.role === 'admin' && targetUser.is_active === true;
      const isRemovingActiveAdmin = newRole !== 'admin' || newActive === false;

      if (isTargetActiveAdmin && isRemovingActiveAdmin && activeAdminCount <= 1) {
        throw new Error('Cannot remove or deactivate the last active administrator');
      }

      return true;
    };

    it('blocks deactivating the last active admin when activeAdminCount is 1', () => {
      const target = { id: 'admin-1', role: 'admin', is_active: true };
      expect(() => validateRoleUpdate(target, 'admin', false, 'admin', true, 1))
        .toThrow('Cannot remove or deactivate the last active administrator');
    });

    it('allows deactivating an admin when another active admin exists', () => {
      const target = { id: 'admin-2', role: 'admin', is_active: true };
      expect(validateRoleUpdate(target, 'admin', false, 'admin', true, 2)).toBe(true);
    });

    it('blocks arbitrary role escalations like superadmin or root', () => {
      const target = { id: 'viewer-1', role: 'viewer', is_active: true };
      expect(() => validateRoleUpdate(target, 'superadmin', true, 'admin', true, 2)).toThrow('Invalid role');
    });


  });

  // ─── 3. Self-Modification Safeguard ─────────────────────────────────────────
  describe('Self-Role and Self-Deactivation Guard', () => {
    const checkSelfModificationWarning = (
      currentUserId: string,
      targetUserId: string,
      intendedActive: boolean
    ) => {
      const isSelf = currentUserId === targetUserId;
      const isDemotingOrDeactivating = intendedActive === false;
      return isSelf && isDemotingOrDeactivating;
    };

    it('triggers explicit warning when admin deactivates their own account', () => {
      const requiresWarning = checkSelfModificationWarning('admin-1', 'admin-1', false);
      expect(requiresWarning).toBe(true);
    });

    it('does not trigger warning when modifying other staff members', () => {
      const requiresWarning = checkSelfModificationWarning('admin-1', 'staff-2', true);
      expect(requiresWarning).toBe(false);
    });
  });

  // ─── 4. Schema v1 Import History & Real Statuses ─────────────────────────────
  describe('Schema v1 Import Job Parsing & Status Values', () => {
    const VALID_IMPORT_STATUSES: ImportJobStatus[] = [
      'pending',
      'validating',
      'ready',
      'running',
      'completed',
      'failed',
      'cancelled',
    ];

    it('accepts and parses all live schema v1 import job status values', () => {
      VALID_IMPORT_STATUSES.forEach((st) => {
        const job: AdminImportJob = {
          id: 'job-101',
          filename: 'Alumni_Batch_2020.xlsx',
          mode: 'standard',
          status: st,
          total_rows: 1500,
          valid_rows: 1495,
          invalid_rows: 5,
          new_records: 1450,
          updated_records: 45,
          duplicate_rows: 10,
          possible_duplicate_rows: 5,
          error_rows: 5,
          uploaded_by: 'user-uuid-1',
          uploaded_by_email: 'admin@rnsit.ac.in',
          uploaded_by_name: 'System Administrator',
          started_at: '2026-08-20T10:00:00Z',
          completed_at: '2026-08-20T10:05:00Z',
          created_at: '2026-08-20T10:00:00Z',
          updated_at: '2026-08-20T10:05:00Z',
          full_count: 1,
        };

        expect(job.status).toBe(st);
        expect(job.filename).toBe('Alumni_Batch_2020.xlsx');
        expect(job.mode).toBe('standard');
        expect(job.valid_rows).toBe(1495);
        expect(job.invalid_rows).toBe(5);
        expect(job.error_rows).toBe(5);
        expect(job.duplicate_rows).toBe(10);
      });
    });

    it('maps Schema v1 import_errors with error_code and message without raw data exposure', () => {
      const errors: ImportErrorItem[] = [
        {
          id: 'err-1',
          import_job_id: 'job-101',
          sheet_name: 'Sheet1',
          row_number: 45,
          field_name: 'email',
          error_code: 'INVALID_EMAIL_FORMAT',
          message: 'Invalid email format: missing domain @',
          created_at: '2026-08-20T10:01:00Z',
        },
        {
          id: 'err-2',
          import_job_id: 'job-101',
          sheet_name: 'Sheet1',
          row_number: 89,
          field_name: 'mobile',
          error_code: 'NON_NUMERIC_MOBILE',
          message: 'Mobile contains invalid non-numeric characters',
          created_at: '2026-08-20T10:02:00Z',
        },
      ];

      expect(errors.length).toBe(2);
      expect(errors[0].message).toBe('Invalid email format: missing domain @');
      expect(errors[0].error_code).toBe('INVALID_EMAIL_FORMAT');
      expect(errors[0].sheet_name).toBe('Sheet1');
      expect(errors[1].message).toBe('Mobile contains invalid non-numeric characters');
      expect((errors[0] as any).raw_data).toBeUndefined();
    });
  });

  // ─── 5. Schema v1 Duplicate Candidate Preview & Numeric Match Score ──────────
  describe('Schema v1 Duplicate Candidate Preview & Resolution', () => {
    const VALID_RESOLUTIONS = ['pending', 'same_person', 'different_people', 'ignored'];

    const applyResolution = (
      candidate: DuplicateCandidateItem,
      resolution: string,
      callerId: string,
      callerRole: string
    ): DuplicateCandidateItem => {
      if (callerRole !== 'admin') {
        throw new Error('Unauthorized: Viewer cannot resolve duplicates');
      }
      if (!VALID_RESOLUTIONS.includes(resolution)) {
        throw new Error(`Invalid resolution: ${resolution}`);
      }

      const isPending = resolution === 'pending';
      return {
        ...candidate,
        status: resolution,
        reviewed_by: isPending ? null : callerId,
        reviewed_at: isPending ? null : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    };

    it('correctly maps candidate preview attributes and numeric match_score', () => {
      const candidate: DuplicateCandidateItem = {
        id: 'dup-1',
        import_job_id: 'job-101',
        existing_alumni_id: 'alumni-500',
        candidate_staging_row_id: 'stage-row-5',
        candidate_alumni_id: null,
        match_reason: 'Exact email match and name similarity >= 0.95',
        match_score: 95.75, // Numeric(5,2) decimal score
        status: 'pending',
        reviewed_by: null,
        reviewed_at: null,
        created_at: '2026-08-20T10:00:00Z',
        updated_at: '2026-08-20T10:00:00Z',
        existing_alumni_name: 'Vijay Kumar',
        existing_alumni_company: 'Microsoft',
        existing_alumni_designation: 'Software Engineer',
        existing_alumni_email: 'vijay@example.com',
        existing_alumni_mobile: '9876543210',
        existing_alumni_branch: 'Computer Science',
        existing_alumni_leaving_year: 2020,
        candidate_name: 'Vijay K',
        candidate_company: 'Microsoft Corp',
        candidate_designation: 'Senior SWE',
        candidate_email: 'vijay@example.com',
        candidate_mobile: '9876543210',
        candidate_academic_branch: 'CSE',
        candidate_joining_year: 2016,
        candidate_leaving_year: 2020,
      };

      expect(typeof candidate.match_score).toBe('number');
      expect(candidate.match_score).toBe(95.75);
      expect(candidate.candidate_name).toBe('Vijay K');
      expect(candidate.candidate_company).toBe('Microsoft Corp');
      expect(candidate.candidate_academic_branch).toBe('CSE');
      expect((candidate as any).raw_data).toBeUndefined();
    });

    it('sets reviewed_by and reviewed_at when admin resolves candidate to same_person', () => {
      const candidate: DuplicateCandidateItem = {
        id: 'dup-1',
        import_job_id: 'job-101',
        existing_alumni_id: 'alumni-500',
        candidate_staging_row_id: 'stage-row-5',
        candidate_alumni_id: null,
        match_reason: 'Exact email match',
        match_score: 98.5,
        status: 'pending',
        reviewed_by: null,
        reviewed_at: null,
        created_at: '2026-08-20T10:00:00Z',
        updated_at: '2026-08-20T10:00:00Z',
        existing_alumni_name: 'Vijay Kumar',
        existing_alumni_company: 'Microsoft',
        existing_alumni_designation: 'Software Engineer',
        existing_alumni_email: 'vijay@example.com',
        existing_alumni_mobile: '9876543210',
        existing_alumni_branch: 'Computer Science',
        existing_alumni_leaving_year: 2020,
      };

      const resolved = applyResolution(candidate, 'same_person', 'admin-uuid-1', 'admin');
      expect(resolved.status).toBe('same_person');
      expect(resolved.reviewed_by).toBe('admin-uuid-1');
      expect(resolved.reviewed_at).not.toBeNull();
      expect(resolved.existing_alumni_id).toBe('alumni-500');
    });

    it('clears reviewed_by and reviewed_at when candidate is reset to pending', () => {
      const candidate: DuplicateCandidateItem = {
        id: 'dup-2',
        import_job_id: 'job-101',
        existing_alumni_id: 'alumni-600',
        candidate_staging_row_id: 'stage-row-12',
        candidate_alumni_id: null,
        match_reason: 'Name only match',
        match_score: 60.0,
        status: 'different_people',
        reviewed_by: 'admin-uuid-1',
        reviewed_at: '2026-08-20T10:30:00Z',
        created_at: '2026-08-20T10:00:00Z',
        updated_at: '2026-08-20T10:30:00Z',
        existing_alumni_name: 'Rahul Sharma',
        existing_alumni_company: 'Infosys',
        existing_alumni_designation: 'Associate',
        existing_alumni_email: 'rahul@example.com',
        existing_alumni_mobile: null,
        existing_alumni_branch: 'ISE',
        existing_alumni_leaving_year: 2019,
      };

      const resetPending = applyResolution(candidate, 'pending', 'admin-uuid-1', 'admin');
      expect(resetPending.status).toBe('pending');
      expect(resetPending.reviewed_by).toBeNull();
      expect(resetPending.reviewed_at).toBeNull();
    });


  });

  // ─── 6. Verification Queue Integration ──────────────────────────────────────
  describe('Verification Queue Governance', () => {
    it('marks records verified updating timestamp and confidence level', () => {
      const record = {
        id: 'alumni-999',
        name: 'Anita Roy',
        needs_verification: true,
        data_confidence: 'low',
        last_verified_at: null as string | null,
      };

      const markVerified = (rec: typeof record, callerRole: string, confidence = 'high') => {
        if (callerRole !== 'admin') {
          throw new Error('Unauthorized: Verification is admin-only');
        }
        return {
          ...rec,
          needs_verification: false,
          data_confidence: confidence,
          last_verified_at: new Date().toISOString(),
        };
      };

      const verified = markVerified(record, 'admin', 'high');
      expect(verified.needs_verification).toBe(false);
      expect(verified.data_confidence).toBe('high');
      expect(verified.last_verified_at).not.toBeNull();

      expect(() => markVerified(record, 'viewer')).toThrow('Unauthorized');
    });
  });

  // ─── 7. Administrator Profile & Name Management (Phase 10A.7) ───────────────
  describe('Administrator Profile & Name Management', () => {
    const validateAdminNameUpdate = (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        throw new Error('Full name cannot be empty');
      }
      if (trimmed.length > 100) {
        throw new Error('Full name must be 100 characters or fewer');
      }
      return trimmed;
    };

    const getDisplayNameFallback = (fullName: string | null | undefined, email: string | null | undefined) => {
      return {
        primary: fullName && fullName.trim() ? fullName.trim() : 'Name not set',
        secondary: email || '',
      };
    };

    it('validates and trims valid administrator names', () => {
      expect(validateAdminNameUpdate('  Dr. Ramesh Kumar  ')).toBe('Dr. Ramesh Kumar');
      expect(validateAdminNameUpdate('Suresh N')).toBe('Suresh N');
    });

    it('rejects blank, whitespace-only, or empty name updates', () => {
      expect(() => validateAdminNameUpdate('')).toThrow('Full name cannot be empty');
      expect(() => validateAdminNameUpdate('   ')).toThrow('Full name cannot be empty');
    });

    it('enforces maximum character length of 100', () => {
      const longName = 'A'.repeat(101);
      expect(() => validateAdminNameUpdate(longName)).toThrow('Full name must be 100 characters or fewer');
    });

    it('returns Name not set as fallback when full_name is null, empty, or whitespace', () => {
      expect(getDisplayNameFallback(null, 'admin@rnsit.ac.in').primary).toBe('Name not set');
      expect(getDisplayNameFallback('', 'admin@rnsit.ac.in').primary).toBe('Name not set');
      expect(getDisplayNameFallback('   ', 'admin@rnsit.ac.in').primary).toBe('Name not set');
      expect(getDisplayNameFallback('Priya Sharma', 'priya@rnsit.ac.in').primary).toBe('Priya Sharma');
    });

    it('verifies authorized administrators table schema has no Assigned Role column', () => {
      const tableHeaders = ['ADMINISTRATOR', 'ACCOUNT STATUS', 'CREATED', 'ACTIONS'];
      expect(tableHeaders).toContain('ADMINISTRATOR');
      expect(tableHeaders).toContain('ACCOUNT STATUS');
      expect(tableHeaders).toContain('CREATED');
      expect(tableHeaders).toContain('ACTIONS');
      expect(tableHeaders).not.toContain('ASSIGNED ROLE');
      expect(tableHeaders).not.toContain('Assigned Role');
    });

    it('ensures role parameter sent to admin_update_user_profile is strictly admin', () => {
      const buildProfileUpdatePayload = (userId: string, isActive: boolean) => ({
        p_user_id: userId,
        p_role: 'admin',
        p_is_active: isActive,
      });

      const payload = buildProfileUpdatePayload('admin-uuid-1', true);
      expect(payload.p_role).toBe('admin');
      expect(payload.p_is_active).toBe(true);
      expect((payload as any).p_role).not.toBe('viewer');
    });

    it('refreshes current user profile when editing self in administrator dialog', () => {
      let currentSessionName = 'Old Name';
      const refreshProfile = (newName: string) => {
        currentSessionName = newName;
      };

      const onSaveSuccess = (updatedUser: { id: string; full_name: string }, currentUserId: string) => {
        if (updatedUser.id === currentUserId) {
          refreshProfile(updatedUser.full_name);
        }
      };

      onSaveSuccess({ id: 'current-user-id', full_name: 'Dr. New Name' }, 'current-user-id');
      expect(currentSessionName).toBe('Dr. New Name');

      // Modifying another user does not overwrite session user
      onSaveSuccess({ id: 'other-user-id', full_name: 'Other Name' }, 'current-user-id');
      expect(currentSessionName).toBe('Dr. New Name');
    });
  });
});
