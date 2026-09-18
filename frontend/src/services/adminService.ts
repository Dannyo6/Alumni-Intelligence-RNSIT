import { supabase } from '../utils/supabase';

// ─── Interfaces Aligned with Live Schema v1 ────────────────────────────────────

export interface AdminUserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'admin' | string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export type ImportJobStatus = 
  | 'pending'
  | 'validating'
  | 'ready'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface AdminImportJob {
  id: string;
  filename: string;
  mode: string | null;
  status: ImportJobStatus | string;
  total_rows: number | null;
  valid_rows: number | null;
  invalid_rows: number | null;
  new_records: number | null;
  updated_records: number | null;
  duplicate_rows: number | null;
  possible_duplicate_rows: number | null;
  error_rows: number | null;
  uploaded_by: string | null;
  uploaded_by_email: string | null;
  uploaded_by_name: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  full_count?: number;
}

export interface ImportErrorItem {
  id: string;
  import_job_id: string;
  sheet_name: string | null;
  row_number: number | null;
  field_name: string | null;
  error_code: string | null;
  message: string;
  created_at: string | null;
}

export interface DuplicateCandidateItem {
  id: string;
  import_job_id: string | null;
  existing_alumni_id: string | null;
  candidate_staging_row_id: string | null;
  candidate_alumni_id: string | null;
  match_reason: string | null;
  match_score: number | null;
  status: 'pending' | 'same_person' | 'different_people' | 'ignored' | string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  existing_alumni_name: string | null;
  existing_alumni_company: string | null;
  existing_alumni_designation: string | null;
  existing_alumni_email: string | null;
  existing_alumni_mobile: string | null;
  existing_alumni_branch: string | null;
  existing_alumni_leaving_year: number | null;
  candidate_name?: string | null;
  candidate_company?: string | null;
  candidate_designation?: string | null;
  candidate_email?: string | null;
  candidate_mobile?: string | null;
  candidate_academic_branch?: string | null;
  candidate_joining_year?: number | null;
  candidate_leaving_year?: number | null;
  full_count?: number;
}

export interface ImportJobDetails {
  job: AdminImportJob;
  errors: ImportErrorItem[];
  duplicates: DuplicateCandidateItem[];
}

export interface AdminAuditSummary {
  total_users: number;
  admin_users: number;

  active_users: number;
  total_import_jobs: number;
  completed_import_jobs: number;
  total_duplicates: number;
  pending_duplicates: number;
  resolved_duplicates: number;
  verified_alumni: number;
  unverified_alumni: number;
  recent_verifications: Array<{
    id: string;
    name: string;
    current_company: string | null;
    current_designation: string | null;
    academic_branch: string | null;
    leaving_year: number | null;
    last_verified_at: string | null;
    data_confidence: string | null;
  }>;
}

// ─── API Fetchers ─────────────────────────────────────────────────────────────

/**
 * Fetch all registered users from public.profiles
 */
export async function fetchAdminUsers(): Promise<AdminUserProfile[]> {
  try {
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('admin_get_users');
    if (!rpcError && Array.isArray(rpcData)) {
      return rpcData;
    }
  } catch {
    // fallback
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as AdminUserProfile[]) || [];
}

/**
 * Update administrator full name via hardened admin RPC
 */
export async function updateAdminUserName(
  userId: string,
  fullName: string
): Promise<AdminUserProfile> {
  const cleanedName = fullName.trim();
  if (!cleanedName) {
    throw new Error('Full name cannot be empty');
  }

  const { data, error } = await (supabase.rpc as any)('admin_update_user_name', {
    p_user_id: userId,
    p_full_name: cleanedName,
  });

  if (error) throw error;
  return data as AdminUserProfile;
}

/**
 * Update administrator activation status safely via hardened admin RPC
 */
export async function updateUserProfileRoleAndStatus(
  userId: string,
  isActive: boolean
): Promise<AdminUserProfile> {
  const { data, error } = await (supabase.rpc as any)('admin_update_user_profile', {
    p_user_id: userId,
    p_role: 'admin',
    p_is_active: isActive,
  });

  if (error) throw error;
  return data as AdminUserProfile;
}

/**
 * Fetch paginated import jobs using real Schema v1 columns
 */
export async function fetchAdminImportJobs(
  status?: string,
  page = 1,
  pageSize = 25
): Promise<{ jobs: AdminImportJob[]; totalCount: number }> {
  const boundedPageSize = Math.min(Math.max(1, pageSize), 100);
  const offset = (Math.max(1, page) - 1) * boundedPageSize;

  try {
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('admin_get_import_jobs', {
      p_status: status && status !== 'all' ? status : null,
      p_limit: boundedPageSize,
      p_offset: offset,
    });
    if (!rpcError && Array.isArray(rpcData)) {
      const totalCount = rpcData.length > 0 ? Number(rpcData[0].full_count ?? rpcData.length) : 0;
      return { jobs: rpcData, totalCount };
    }
  } catch {
    // fallback
  }

  let query = supabase
    .from('import_jobs')
    .select('*, uploader:uploaded_by(email, full_name)', { count: 'exact' });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + boundedPageSize - 1);

  if (error) throw error;

  const jobs: AdminImportJob[] = ((data as any[]) || []).map((j) => ({
    id: j.id,
    filename: j.filename,
    mode: j.mode,
    status: j.status,
    total_rows: j.total_rows,
    valid_rows: j.valid_rows,
    invalid_rows: j.invalid_rows,
    new_records: j.new_records,
    updated_records: j.updated_records,
    duplicate_rows: j.duplicate_rows,
    possible_duplicate_rows: j.possible_duplicate_rows,
    error_rows: j.error_rows,
    uploaded_by: j.uploaded_by,
    uploaded_by_email: j.uploader?.email || null,
    uploaded_by_name: j.uploader?.full_name || null,
    started_at: j.started_at,
    completed_at: j.completed_at,
    created_at: j.created_at,
    updated_at: j.updated_at,
    full_count: count || 0,
  }));

  return { jobs, totalCount: count || 0 };
}

/**
 * Fetch details and error log for a specific import job
 */
export async function fetchAdminImportJobDetails(jobId: string): Promise<ImportJobDetails> {
  try {
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('admin_get_import_job_details', {
      p_job_id: jobId,
    });
    if (!rpcError && rpcData) {
      return rpcData as ImportJobDetails;
    }
  } catch {
    // fallback
  }

  const [jobRes, errorsRes, duplicatesRes] = await Promise.all([
    supabase.from('import_jobs').select('*, uploader:uploaded_by(email, full_name)').eq('id', jobId).single(),
    supabase.from('import_errors').select('*').eq('import_job_id', jobId).order('row_number', { ascending: true }),
    supabase.from('duplicate_candidates').select('*, alumni:existing_alumni_id(name, current_company, email)').eq('import_job_id', jobId),
  ]);

  if (jobRes.error) throw jobRes.error;

  const j = jobRes.data as any;
  const job: AdminImportJob = {
    id: j.id,
    filename: j.filename,
    mode: j.mode,
    status: j.status,
    total_rows: j.total_rows,
    valid_rows: j.valid_rows,
    invalid_rows: j.invalid_rows,
    new_records: j.new_records,
    updated_records: j.updated_records,
    duplicate_rows: j.duplicate_rows,
    possible_duplicate_rows: j.possible_duplicate_rows,
    error_rows: j.error_rows,
    uploaded_by: j.uploaded_by,
    uploaded_by_email: j.uploader?.email || null,
    uploaded_by_name: j.uploader?.full_name || null,
    started_at: j.started_at,
    completed_at: j.completed_at,
    created_at: j.created_at,
    updated_at: j.updated_at,
    full_count: 1,
  };

  const errors: ImportErrorItem[] = ((errorsRes.data as any[]) || []).map((e) => ({
    id: e.id,
    import_job_id: e.import_job_id,
    sheet_name: e.sheet_name,
    row_number: e.row_number,
    field_name: e.field_name,
    error_code: e.error_code,
    message: e.message,
    created_at: e.created_at,
  }));

  const duplicates: DuplicateCandidateItem[] = ((duplicatesRes.data as any[]) || []).map((d) => ({
    id: d.id,
    import_job_id: d.import_job_id,
    existing_alumni_id: d.existing_alumni_id,
    candidate_staging_row_id: d.candidate_staging_row_id,
    candidate_alumni_id: d.candidate_alumni_id,
    match_reason: d.match_reason,
    match_score: d.match_score,
    status: d.status || 'pending',
    reviewed_by: d.reviewed_by,
    reviewed_at: d.reviewed_at,
    created_at: d.created_at,
    updated_at: d.updated_at,
    existing_alumni_name: d.alumni?.name || null,
    existing_alumni_company: d.alumni?.current_company || null,
    existing_alumni_designation: null,
    existing_alumni_email: d.alumni?.email || null,
    existing_alumni_mobile: null,
    existing_alumni_branch: null,
    existing_alumni_leaving_year: null,
  }));

  return { job, errors, duplicates };
}

/**
 * Fetch duplicate candidate records
 */
export async function fetchAdminDuplicateCandidates(
  status?: string,
  page = 1,
  pageSize = 25
): Promise<{ candidates: DuplicateCandidateItem[]; totalCount: number }> {
  const boundedPageSize = Math.min(Math.max(1, pageSize), 100);
  const offset = (Math.max(1, page) - 1) * boundedPageSize;

  try {
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('admin_get_duplicate_candidates', {
      p_status: status && status !== 'all' ? status : null,
      p_limit: boundedPageSize,
      p_offset: offset,
    });
    if (!rpcError && Array.isArray(rpcData)) {
      const totalCount = rpcData.length > 0 ? Number(rpcData[0].full_count ?? rpcData.length) : 0;
      return { candidates: rpcData, totalCount };
    }
  } catch {
    // fallback
  }

  let query = supabase
    .from('duplicate_candidates')
    .select('*, alumni:existing_alumni_id(name, current_company, current_designation, email, mobile, academic_branch, leaving_year)', { count: 'exact' });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + boundedPageSize - 1);

  if (error) throw error;

  const candidates: DuplicateCandidateItem[] = ((data as any[]) || []).map((d) => ({
    id: d.id,
    import_job_id: d.import_job_id,
    existing_alumni_id: d.existing_alumni_id,
    candidate_staging_row_id: d.candidate_staging_row_id,
    candidate_alumni_id: d.candidate_alumni_id,
    match_reason: d.match_reason,
    match_score: d.match_score,
    status: d.status || 'pending',
    reviewed_by: d.reviewed_by,
    reviewed_at: d.reviewed_at,
    created_at: d.created_at,
    updated_at: d.updated_at,
    existing_alumni_name: d.alumni?.name || null,
    existing_alumni_company: d.alumni?.current_company || null,
    existing_alumni_designation: d.alumni?.current_designation || null,
    existing_alumni_email: d.alumni?.email || null,
    existing_alumni_mobile: d.alumni?.mobile || null,
    existing_alumni_branch: d.alumni?.academic_branch || null,
    existing_alumni_leaving_year: d.alumni?.leaving_year || null,
    full_count: count || 0,
  }));

  return { candidates, totalCount: count || 0 };
}

/**
 * Mark resolution on duplicate candidate record (sets reviewed_by and reviewed_at)
 */
export async function resolveDuplicateCandidate(
  candidateId: string,
  resolution: 'same_person' | 'different_people' | 'ignored' | 'pending'
): Promise<any> {
  const { data, error } = await (supabase.rpc as any)('admin_resolve_duplicate_candidate', {
    p_candidate_id: candidateId,
    p_resolution: resolution,
  });

  if (error) throw error;
  return data;
}

/**
 * Fetch operational audit summary metrics
 */
export async function fetchAdminAuditSummary(): Promise<AdminAuditSummary> {
  try {
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('admin_get_audit_summary');
    if (!rpcError && rpcData) {
      return rpcData as AdminAuditSummary;
    }
  } catch {
    // fallback
  }

  // Fallback direct queries
  const [profilesRes, jobsRes, dupesRes, alumniRes, recentRes] = await Promise.all([
    supabase.from('profiles').select('role, is_active'),
    supabase.from('import_jobs').select('status'),
    supabase.from('duplicate_candidates').select('status'),
    supabase.from('alumni').select('needs_verification, last_verified_at'),
    supabase.from('alumni').select('id, name, current_company, current_designation, academic_branch, leaving_year, last_verified_at, data_confidence').not('last_verified_at', 'is', null).order('last_verified_at', { ascending: false }).limit(10),
  ]);

  const profiles: any[] = profilesRes.data || [];
  const jobs: any[] = jobsRes.data || [];
  const dupes: any[] = dupesRes.data || [];
  const alumni: any[] = alumniRes.data || [];

  return {
    total_users: profiles.length,
    admin_users: profiles.filter((p: any) => p.role === 'admin').length,
    active_users: profiles.filter((p: any) => Boolean(p.is_active)).length,
    total_import_jobs: jobs.length,
    completed_import_jobs: jobs.filter((j: any) => j.status === 'completed').length,
    total_duplicates: dupes.length,
    pending_duplicates: dupes.filter((d: any) => !d.status || d.status === 'pending').length,
    resolved_duplicates: dupes.filter((d: any) => d.status && d.status !== 'pending').length,
    verified_alumni: alumni.filter((a: any) => !a.needs_verification && a.last_verified_at).length,
    unverified_alumni: alumni.filter((a: any) => a.needs_verification).length,
    recent_verifications: (recentRes.data as any[]) || [],
  };
}
