// Preview-only stand-in for the admin service.
export * from '../../services/adminService';
import type { AdminUserProfile, AdminAuditSummary, ImportJobDetails } from '../../services/adminService';
import { ADMIN_USERS, IMPORT_JOBS, DUPLICATES, AUDIT_SUMMARY, JOB_DETAILS } from '../fixtures';

export async function fetchAdminUsers(): Promise<AdminUserProfile[]> {
  return ADMIN_USERS;
}
export async function updateUserProfileRoleAndStatus() {
  return ADMIN_USERS[0];
}
export async function fetchAdminImportJobs() {
  return { jobs: IMPORT_JOBS, totalCount: IMPORT_JOBS.length };
}
export async function fetchAdminImportJobDetails(): Promise<ImportJobDetails> {
  return JOB_DETAILS;
}
export async function fetchAdminDuplicateCandidates() {
  return { candidates: DUPLICATES, totalCount: DUPLICATES.length };
}
export async function resolveDuplicateCandidate() {
  return DUPLICATES[0];
}
export async function fetchAdminAuditSummary(): Promise<AdminAuditSummary> {
  return AUDIT_SUMMARY;
}
