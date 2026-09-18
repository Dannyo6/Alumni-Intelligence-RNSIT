import { supabase } from '../utils/supabase';
import type { Database } from '../types/supabase';
import type { DirectoryFilterState } from '../utils/urlState';
import { parseSearchQuery } from '../utils/searchParser';

export type AlumnusRow = Database['public']['Tables']['alumni']['Row'];
export type AlumnusInsert = Database['public']['Tables']['alumni']['Insert'];
export type AlumnusUpdate = Database['public']['Tables']['alumni']['Update'];

export interface AlumniDiscoveryResult {
  records: AlumnusRow[];
  totalCount: number;
  parsedQuery: ReturnType<typeof parseSearchQuery>;
}

export interface DirectoryFilterOptions {
  branches: string[];
  countries: string[];
  categories: string[];
  sectors: string[];
}

export interface ExportResult {
  records: AlumnusRow[];
  isCapped: boolean;
  totalAvailable: number;
}

const ALLOWED_SORT_FIELDS: Array<keyof AlumnusRow> = [
  'name',
  'current_company',
  'current_designation',
  'academic_branch',
  'joining_year',
  'leaving_year',
  'value_score',
  'updated_at',
  'created_at',
];

/**
 * Standard list of recognized academic branches at RNSIT and canonical programs.
 */
export const RECOGNIZED_ACADEMIC_BRANCHES = [
  'Computer Science and Engineering',
  'Information Science and Engineering',
  'Electronics and Communication Engineering',
  'Electrical and Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Artificial Intelligence and Machine Learning',
  'Cyber Security',
  'Data Science',
  'Electronics and Instrumentation Engineering',
  'Biotechnology',
  'Master of Computer Applications',
  'Master of Business Administration',
  'CSE',
  'ISE',
  'ECE',
  'EEE',
  'ME',
  'CV',
  'AIML',
  'MCA',
  'MBA',
];

/**
 * Validates and sanitizes sort fields against the strict whitelist.
 */
export function validateSortField(field: string): string {
  return ALLOWED_SORT_FIELDS.includes(field as keyof AlumnusRow) ? field : 'value_score';
}

/**
 * Normalizes and filters raw database academic_branch values to prioritize recognized academic programs.
 * Filters out role-like or dirty historical strings from the main dropdown without altering DB records.
 */
export function filterRecognizedAcademicBranches(rawBranches: string[]): string[] {
  const recognizedNormalized = RECOGNIZED_ACADEMIC_BRANCHES.map(b => b.toLowerCase().replace(/[^a-z0-9]/g, ''));
  
  const academicKeywords = [
    'engineering', 'technology', 'computer science', 'information science',
    'electronics', 'electrical', 'mechanical', 'civil', 'artificial intelligence',
    'cyber', 'data science', 'mca', 'mba', 'b.e', 'b.tech', 'm.tech', 'cse', 'ise',
    'ece', 'eee', 'aiml', 'biotechnology', 'instrumentation'
  ];

  const suspiciousRoleKeywords = [
    'manager', 'lead', 'architect', 'consultant', 'developer', 'engineer at',
    'analyst', 'director', 'specialist', 'officer', 'head of', 'executive',
    'software engineer', 'intern', 'associate', 'founder', 'vp', 'president'
  ];

  const validBranches = new Set<string>();

  for (const branch of rawBranches) {
    if (!branch || typeof branch !== 'string') continue;
    const trimmed = branch.trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 75) continue;

    const lower = trimmed.toLowerCase();
    const cleanLower = lower.replace(/[^a-z0-9]/g, '');

    // 1. Direct match with standard recognized branch
    if (recognizedNormalized.includes(cleanLower)) {
      validBranches.add(trimmed);
      continue;
    }

    // 2. Reject obvious role/job title/company names that got into academic_branch
    const isSuspiciousRole = suspiciousRoleKeywords.some(role => {
      // check whole word or phrase match
      const regex = new RegExp(`\\b${role}\\b`, 'i');
      return regex.test(lower);
    });
    if (isSuspiciousRole) continue;

    // 3. Accept if it contains standard academic keywords
    const hasAcademicKeyword = academicKeywords.some(kw => lower.includes(kw));
    if (hasAcademicKeyword) {
      validBranches.add(trimmed);
    }
  }

  // Ensure standard branches are present if matching
  const branchList = Array.from(validBranches);
  return branchList.sort((a, b) => a.localeCompare(b));
}

/**
 * Normalizes derived identity and searchable fields for safe persistence.
 */
export function normalizeAlumniDerivedFields(data: Partial<AlumnusRow>): Partial<AlumnusRow> {
  const cleanStr = (val?: string | null) => (val ? val.trim() : null);
  const cleanLower = (val?: string | null) => (val ? val.trim().toLowerCase() : null);

  const name = cleanStr(data.name) || '';
  const email = cleanStr(data.email);
  const mobile = cleanStr(data.mobile);
  const company = cleanStr(data.current_company);
  const designation = cleanStr(data.current_designation);
  const city = cleanStr(data.city);
  const country = cleanStr(data.country);
  const profileLink = cleanStr(data.profile_link);

  const digitsOnlyMobile = mobile ? mobile.replace(/[^0-9]/g, '') : null;
  const isMobileValid = digitsOnlyMobile ? digitsOnlyMobile.length >= 10 : null;

  const normalizedProfileLink = profileLink
    ? profileLink.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
    : null;

  return {
    name,
    name_normalized: cleanLower(name),
    current_company: company,
    current_company_normalized: cleanLower(company),
    current_designation: designation,
    designation_normalized: cleanLower(designation),
    company_sector: cleanStr(data.company_sector),
    city,
    city_normalized: cleanLower(city),
    country,
    country_code: country ? (country.length === 2 ? country.toUpperCase() : null) : null,
    email,
    email_normalized: cleanLower(email),
    alternate_emails: data.alternate_emails || null,
    mobile,
    mobile_normalized: digitsOnlyMobile,
    mobile_valid: isMobileValid,
    joining_year: data.joining_year ? Number(data.joining_year) : null,
    leaving_year: data.leaving_year ? Number(data.leaving_year) : null,
    academic_branch: cleanStr(data.academic_branch),
    branch_or_designation_raw: cleanStr(data.branch_or_designation_raw) || cleanStr(data.academic_branch),
    rnsit_role: cleanStr(data.rnsit_role),
    profile_link: profileLink,
    profile_link_normalized: normalizedProfileLink,
    linkedin_url: cleanStr(data.linkedin_url),
    is_high_value: Boolean(data.is_high_value),
    is_global: Boolean(data.is_global),
    is_top_employer: Boolean(data.is_top_employer),
    is_student_or_rnsit: Boolean(data.is_student_or_rnsit),
    needs_verification: Boolean(data.needs_verification),
    value_score: data.value_score !== null && data.value_score !== undefined && String(data.value_score) !== ''
      ? Number(data.value_score)
      : null,
    status: cleanStr(data.status) || 'active',
    data_confidence: cleanStr(data.data_confidence) || 'Standard',
    notes: cleanStr(data.notes),
    last_verified_at: data.last_verified_at || null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Executes alumni search via public.search_alumni RPC with fallback only on genuine network/RPC failures.
 */
export async function fetchAlumniDiscovery(
  state: DirectoryFilterState
): Promise<AlumniDiscoveryResult> {
  const parsed = parseSearchQuery(state.searchQuery);
  const validatedSort = validateSortField(state.sortBy);

  // 1. PRIMARY: Call search_alumni RPC
  try {
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('search_alumni', {
      p_query: parsed.cleanedTextQuery || null,
      p_year_exact: parsed.yearExact,
      p_year_start: parsed.yearStart,
      p_year_end: parsed.yearEnd,
      p_branch_aliases: parsed.branchAliases,
      p_country_aliases: parsed.countryAliases,
      p_company_aliases: parsed.companyAliases,
      p_company: state.company || null,
      p_designation: state.designation || null,
      p_sector: state.sector || null,
      p_academic_branch: state.branch || null,
      p_country: state.country || null,
      p_city: state.city || null,
      p_joining_year: state.joiningYear,
      p_leaving_year: state.leavingYear,
      p_primary_category: state.primaryCategory || null,
      p_is_high_value: state.isHighValue || null,
      p_is_global: state.isGlobal || null,
      p_is_top_employer: state.isTopEmployer || null,
      p_is_student_or_rnsit: state.isStudentOrRnsit || null,
      p_needs_verification: state.needsVerification || null,
      p_has_email: state.hasEmail ? true : null,
      p_has_mobile: state.hasMobile ? true : null,
      p_sort_by: validatedSort,
      p_sort_order: state.sortOrder,
      p_page: state.page,
      p_page_size: state.pageSize,
    });

    if (!rpcError && Array.isArray(rpcData)) {
      // Ordinary zero-result search returns [] without fallback
      const totalCount = rpcData.length > 0 ? Number(rpcData[0].total_count || rpcData.length) : 0;
      return {
        records: rpcData,
        totalCount,
        parsedQuery: parsed,
      };
    }

    if (rpcError) {
      if (typeof window !== 'undefined' && (import.meta as any).env?.DEV) {
        console.warn('[directoryService] search_alumni RPC returned error, attempting table fallback:', rpcError);
      }
    }
  } catch (err) {
    if (typeof window !== 'undefined' && (import.meta as any).env?.DEV) {
      console.warn('[directoryService] search_alumni RPC threw exception, attempting table fallback:', err);
    }
  }

  // 2. FALLBACK: Direct Supabase query fallback (only on RPC/network failure)
  const from = (state.page - 1) * state.pageSize;
  const to = from + state.pageSize - 1;

  let query = supabase
    .from('alumni')
    .select('*', { count: 'exact' });

  // Year filter logic from parsed query
  if (parsed.yearExact) {
    query = query.or(`joining_year.eq.${parsed.yearExact},leaving_year.eq.${parsed.yearExact}`);
  } else if (parsed.yearStart && parsed.yearEnd) {
    query = query.or(`and(joining_year.lte.${parsed.yearEnd},leaving_year.gte.${parsed.yearStart}),and(joining_year.gte.${parsed.yearStart},joining_year.lte.${parsed.yearEnd}),and(leaving_year.gte.${parsed.yearStart},leaving_year.lte.${parsed.yearEnd})`);
  }

  // Text search query
  if (parsed.cleanedTextQuery || parsed.branchAliases || parsed.countryAliases || parsed.companyAliases) {
    const textTerm = parsed.cleanedTextQuery;
    const orConditions: string[] = [];
    if (textTerm) {
      orConditions.push(`name.ilike.%${textTerm}%`);
      orConditions.push(`current_company.ilike.%${textTerm}%`);
      orConditions.push(`current_designation.ilike.%${textTerm}%`);
      orConditions.push(`city.ilike.%${textTerm}%`);
      orConditions.push(`country.ilike.%${textTerm}%`);
      orConditions.push(`academic_branch.ilike.%${textTerm}%`);
      orConditions.push(`branch_or_designation_raw.ilike.%${textTerm}%`);
    }
    if (parsed.branchAliases) {
      parsed.branchAliases.forEach(alias => {
        orConditions.push(`academic_branch.ilike.%${alias}%`);
        orConditions.push(`branch_or_designation_raw.ilike.%${alias}%`);
      });
    }
    if (parsed.countryAliases) {
      parsed.countryAliases.forEach(alias => {
        orConditions.push(`country.ilike.%${alias}%`);
      });
    }
    if (parsed.companyAliases) {
      parsed.companyAliases.forEach(alias => {
        orConditions.push(`current_company.ilike.%${alias}%`);
      });
    }
    if (orConditions.length > 0) {
      query = query.or(orConditions.join(','));
    }
  }

  // Structured filters
  if (state.company) query = query.ilike('current_company', `%${state.company}%`);
  if (state.designation) query = query.ilike('current_designation', `%${state.designation}%`);
  if (state.sector) query = query.eq('company_sector', state.sector);
  if (state.branch) query = query.or(`academic_branch.ilike.%${state.branch}%,branch_or_designation_raw.ilike.%${state.branch}%`);
  if (state.country) query = query.eq('country', state.country);
  if (state.city) query = query.ilike('city', `%${state.city}%`);
  if (state.joiningYear) query = query.eq('joining_year', state.joiningYear);
  if (state.leavingYear) query = query.eq('leaving_year', state.leavingYear);
  if (state.primaryCategory) query = query.eq('primary_category', state.primaryCategory);

  if (state.isHighValue) query = query.eq('is_high_value', true);
  if (state.isGlobal) query = query.eq('is_global', true);
  if (state.isTopEmployer) query = query.eq('is_top_employer', true);
  if (state.isStudentOrRnsit) query = query.eq('is_student_or_rnsit', true);
  if (state.needsVerification) query = query.eq('needs_verification', true);
  if (state.hasEmail) query = query.not('email', 'is', null).neq('email', '');
  if (state.hasMobile) query = query.not('mobile', 'is', null).neq('mobile', '');

  const sortAscending = state.sortOrder === 'asc';
  query = query
    .order(validatedSort as any, { ascending: sortAscending, nullsFirst: false })
    .range(from, to);

  const { data: records, count, error } = await query;
  if (error) throw error;

  return {
    records: records || [],
    totalCount: count || 0,
    parsedQuery: parsed,
  };
}

/**
 * Fetches distinct options for filter dropdowns via get_directory_filter_options RPC.
 */
export async function fetchDirectoryFilterOptions(): Promise<DirectoryFilterOptions> {
  try {
    const { data: rpcOptions, error } = await (supabase.rpc as any)('get_directory_filter_options');
    if (!error && rpcOptions && typeof rpcOptions === 'object') {
      const rawBranches = Array.isArray(rpcOptions.branches) ? rpcOptions.branches : [];
      return {
        branches: filterRecognizedAcademicBranches(rawBranches),
        countries: Array.isArray(rpcOptions.countries) ? rpcOptions.countries : [],
        categories: Array.isArray(rpcOptions.categories) ? rpcOptions.categories : [],
        sectors: Array.isArray(rpcOptions.sectors) ? rpcOptions.sectors : [],
      };
    }
    if (error && typeof window !== 'undefined' && (import.meta as any).env?.DEV) {
      console.warn('[directoryService] get_directory_filter_options RPC failed:', error);
    }
  } catch (err) {
    if (typeof window !== 'undefined' && (import.meta as any).env?.DEV) {
      console.warn('[directoryService] get_directory_filter_options RPC threw:', err);
    }
  }

  // Fallback distinct option queries
  const [
    { data: branchData },
    { data: countryData },
    { data: categoryData },
    { data: sectorData }
  ] = await Promise.all([
    supabase.from('alumni').select('academic_branch').not('academic_branch', 'is', null).limit(100),
    supabase.from('alumni').select('country').not('country', 'is', null).limit(150),
    supabase.from('alumni').select('primary_category').not('primary_category', 'is', null).limit(50),
    supabase.from('alumni').select('company_sector').not('company_sector', 'is', null).limit(100),
  ]);

  const unique = (arr: (string | null | undefined)[]) =>
    Array.from(new Set(arr.filter(Boolean) as string[])).sort();

  const rawBranches = unique(((branchData as any[]) || []).map((r: any) => r.academic_branch));

  return {
    branches: filterRecognizedAcademicBranches(rawBranches),
    countries: unique(((countryData as any[]) || []).map((r: any) => r.country)),
    categories: unique(((categoryData as any[]) || []).map((r: any) => r.primary_category)),
    sectors: unique(((sectorData as any[]) || []).map((r: any) => r.company_sector)),
  };
}

/**
 * Searchable Combobox Option Fetcher (Bounded to max 20 results via RPC).
 */
export async function searchDirectoryFilterOptions(
  field: 'company' | 'designation' | 'city',
  searchQuery = '',
  limit = 20
): Promise<string[]> {
  const boundedLimit = Math.min(Math.max(1, limit), 50);

  try {
    const { data: rpcOptions, error } = await (supabase.rpc as any)('search_directory_filter_options', {
      p_field: field,
      p_query: searchQuery,
      p_limit: boundedLimit,
    });
    if (!error && Array.isArray(rpcOptions)) {
      return rpcOptions;
    }
    if (error && typeof window !== 'undefined' && (import.meta as any).env?.DEV) {
      console.warn('[directoryService] search_directory_filter_options RPC failed:', error);
    }
  } catch (err) {
    if (typeof window !== 'undefined' && (import.meta as any).env?.DEV) {
      console.warn('[directoryService] search_directory_filter_options RPC threw:', err);
    }
  }

  const columnMap: Record<string, keyof AlumnusRow> = {
    company: 'current_company',
    designation: 'current_designation',
    city: 'city',
  };

  const dbCol = columnMap[field];
  if (!dbCol) return [];

  let query = supabase
    .from('alumni')
    .select(dbCol)
    .not(dbCol, 'is', null)
    .limit(boundedLimit * 2);

  if (searchQuery.trim()) {
    query = query.ilike(dbCol, `%${searchQuery.trim()}%`);
  }

  const { data } = await query;
  const uniqueVals = Array.from(new Set(((data as any[]) || []).map((r: any) => r[dbCol]).filter(Boolean))) as string[];
  return uniqueVals.slice(0, boundedLimit);
}

/**
 * Fetches up to safetyLimit filtered alumni records for server-side export.
 */
export async function fetchFilteredAlumniForExport(
  state: DirectoryFilterState,
  safetyLimit = 5000
): Promise<ExportResult> {
  const boundedLimit = Math.min(Math.max(1, safetyLimit), 5000);
  const exportState: DirectoryFilterState = {
    ...state,
    page: 1,
    pageSize: boundedLimit,
  };
  const result = await fetchAlumniDiscovery(exportState);
  const isCapped = result.totalCount > boundedLimit;

  return {
    records: result.records,
    isCapped,
    totalAvailable: result.totalCount,
  };
}

/**
 * Saves (inserts or updates) an alumnus record safely, updating normalized fields and omitting generated columns.
 */
export async function saveAlumnusRecord(
  recordId: string | null | undefined,
  formData: Partial<AlumnusRow>
): Promise<AlumnusRow> {
  const normalizedPayload = normalizeAlumniDerivedFields(formData);

  // Strictly omit immutable / generated columns: id, primary_category, search_vector, created_at, last_import_job_id
  const safePayload: Record<string, any> = { ...normalizedPayload };
  delete safePayload.id;
  delete safePayload.primary_category;
  delete safePayload.search_vector;
  delete safePayload.created_at;
  delete safePayload.last_import_job_id;

  if (recordId) {
    const { data, error } = await supabase
      .from('alumni')
      .update(safePayload)
      .eq('id', recordId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('alumni')
      .insert([safePayload as AlumnusInsert])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

/**
 * Mark an alumnus record as verified (Admin only).
 */
export async function markAlumnusVerified(
  recordId: string,
  updatedConfidence?: string
): Promise<AlumnusRow> {
  const payload: Partial<AlumnusRow> = {
    needs_verification: false,
    last_verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (updatedConfidence) {
    payload.data_confidence = updatedConfidence;
  }

  const { data, error } = await supabase
    .from('alumni')
    .update(payload)
    .eq('id', recordId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
