import { supabase } from '../utils/supabase';
import type { Database } from '../types/supabase';

export type AlumnusRow = Database['public']['Tables']['alumni']['Row'];

// ─── Metric Dimensions ───────────────────────────────────────────────────────

export interface DataQualityMetrics {
  total_count: number;

  // Contact & Identity
  missing_email: number;
  missing_mobile: number;
  invalid_mobile: number;
  multiple_emails: number;
  missing_linkedin: number;
  missing_contact: number;

  // Professional & Academic
  missing_company: number;
  missing_designation: number;
  missing_sector: number;
  missing_country: number;
  missing_city: number;
  missing_joining_year: number;
  missing_leaving_year: number;
  missing_academic_branch: number;
  missing_professional: number;

  // Governance
  needs_verification: number;

  // Confidence distribution
  confidence_high: number;
  confidence_medium: number;
  confidence_low: number;
  confidence_unverified: number;
  low_data_confidence: number;

  // Branch quality aggregates
  recognized_branch_records: number;
  suspicious_branch_records: number;
}

// ─── Quality Records ──────────────────────────────────────────────────────────

export interface QualityRecord {
  id: string;
  name: string;
  email: string | null;
  mobile: string | null;
  mobile_valid: boolean | null;
  alternate_emails: string[] | null;
  current_company: string | null;
  current_designation: string | null;
  company_sector: string | null;
  city: string | null;
  country: string | null;
  joining_year: number | null;
  leaving_year: number | null;
  academic_branch: string | null;
  branch_or_designation_raw: string | null;
  rnsit_role: string | null;
  profile_link: string | null;
  linkedin_url: string | null;
  primary_category: string | null;
  is_high_value: boolean | null;
  is_global: boolean | null;
  is_top_employer: boolean | null;
  is_student_or_rnsit: boolean | null;
  needs_verification: boolean | null;
  value_score: number | null;
  status: string | null;
  data_confidence: string | null;
  notes: string | null;
  last_verified_at: string | null;
  updated_at: string | null;
  created_at: string | null;
  total_count: number;
}

export interface QualityRecordsResult {
  records: QualityRecord[];
  totalCount: number;
}

// ─── Supported filter keys ────────────────────────────────────────────────────

export type QualityFilterKey =
  | 'missing_email' | 'missing_mobile' | 'invalid_mobile' | 'multiple_emails' | 'missing_linkedin'
  | 'missing_contact'
  | 'missing_company' | 'missing_designation' | 'missing_sector'
  | 'missing_country' | 'missing_city'
  | 'missing_joining_year' | 'missing_leaving_year' | 'missing_academic_branch'
  | 'missing_professional'
  | 'needs_verification'
  | 'confidence_high' | 'confidence_medium' | 'confidence_low'
  | 'confidence_unverified' | 'low_data_confidence';

export const VALID_QUALITY_FILTERS: QualityFilterKey[] = [
  'missing_email', 'missing_mobile', 'invalid_mobile', 'multiple_emails', 'missing_linkedin',
  'missing_contact',
  'missing_company', 'missing_designation', 'missing_sector',
  'missing_country', 'missing_city',
  'missing_joining_year', 'missing_leaving_year', 'missing_academic_branch',
  'missing_professional',
  'needs_verification',
  'confidence_high', 'confidence_medium', 'confidence_low',
  'confidence_unverified', 'low_data_confidence',
];

// ─── Branch Report ─────────────────────────────────────────────────────────────

export type BranchClassification =
  | 'recognized_academic_branch'
  | 'role_like_value'
  | 'organization_like_value'
  | 'unrecognized_branch_value'
  | 'unknown';

export interface BranchReportRow {
  academic_branch: string;
  record_count: number;
  classification: BranchClassification;
  is_recognized: boolean;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

const numField = (v: unknown): number => Number(v ?? 0);

/**
 * Fetches all quality dimension counts in a single round trip.
 */
export async function fetchDataQualityMetrics(): Promise<DataQualityMetrics> {
  const { data, error } = await (supabase.rpc as any)('get_data_quality_metrics');
  if (error) throw error;
  const m = data as Record<string, unknown>;
  return {
    total_count:              numField(m.total_count),
    // Contact
    missing_email:            numField(m.missing_email),
    missing_mobile:           numField(m.missing_mobile),
    invalid_mobile:           numField(m.invalid_mobile),
    multiple_emails:          numField(m.multiple_emails),
    missing_linkedin:         numField(m.missing_linkedin),
    missing_contact:          numField(m.missing_contact),
    // Professional
    missing_company:          numField(m.missing_company),
    missing_designation:      numField(m.missing_designation),
    missing_sector:           numField(m.missing_sector),
    missing_country:          numField(m.missing_country),
    missing_city:             numField(m.missing_city),
    missing_joining_year:     numField(m.missing_joining_year),
    missing_leaving_year:     numField(m.missing_leaving_year),
    missing_academic_branch:  numField(m.missing_academic_branch),
    missing_professional:     numField(m.missing_professional),
    // Governance
    needs_verification:       numField(m.needs_verification),
    // Confidence
    confidence_high:          numField(m.confidence_high),
    confidence_medium:        numField(m.confidence_medium),
    confidence_low:           numField(m.confidence_low),
    confidence_unverified:    numField(m.confidence_unverified),
    low_data_confidence:      numField(m.low_data_confidence),
    // Branch aggregates
    recognized_branch_records:  numField(m.recognized_branch_records),
    suspicious_branch_records:  numField(m.suspicious_branch_records),
  };
}

/**
 * Fetches paginated alumni records for a given quality filter key.
 */
export async function fetchQualityRecords(
  filter: QualityFilterKey,
  page = 1,
  pageSize = 100
): Promise<QualityRecordsResult> {
  const limit = Math.min(Math.max(1, pageSize), 200);
  const offset = (Math.max(1, page) - 1) * limit;

  const { data, error } = await (supabase.rpc as any)('get_quality_records', {
    p_filter: filter,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;

  const rows: QualityRecord[] = Array.isArray(data) ? data : [];
  const totalCount = rows.length > 0 ? Number(rows[0].total_count ?? rows.length) : 0;

  return { records: rows, totalCount };
}

/**
 * Fetches the branch normalization report for the Branch Audit tab.
 */
export async function fetchBranchNormalizationReport(): Promise<BranchReportRow[]> {
  const { data, error } = await (supabase.rpc as any)('get_branch_normalization_report');
  if (error) throw error;
  if (!Array.isArray(data)) return [];
  return data.map((r: any) => ({
    academic_branch: r.academic_branch ?? 'Unknown',
    record_count: Number(r.record_count ?? r.count ?? 0),
    classification: r.classification ?? 'unknown',
    is_recognized: Boolean(r.is_recognized),
  }));
}
