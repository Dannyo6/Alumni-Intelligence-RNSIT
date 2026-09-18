/** Deterministic fixture data for the local visual harness. Not used by the app. */
import type { QualityRecord, DataQualityMetrics, BranchReportRow } from '../services/dataQualityService';
import type { AlumnusRow } from '../services/directoryService';
import type {
  AdminUserProfile, AdminImportJob, DuplicateCandidateItem, AdminAuditSummary, ImportJobDetails,
} from '../services/adminService';

const COMPANIES = ['Infosys', 'Amazon', 'Microsoft', 'TCS', 'Wipro', 'Accenture', 'Oracle', 'Deloitte', 'IBM', 'Cognizant'];
const ROLES = ['Senior Software Engineer', 'Engineering Manager', 'Data Scientist', 'Product Manager', 'SDE II', 'Principal Architect', 'QA Lead', 'DevOps Engineer'];
const BRANCHES = ['Computer Science and Engineering', 'Information Science and Engineering', 'Electronics and Communication', 'Mechanical Engineering', 'Civil Engineering'];
const CITIES: [string, string][] = [['Bengaluru', 'India'], ['Seattle', 'United States'], ['Berlin', 'Germany'], ['Toronto', 'Canada'], ['Pune', 'India'], ['London', 'United Kingdom']];
const NAMES = ['Aarav Sharma', 'Divya Rao', 'Karthik Nair', 'Meera Iyer', 'Rohan Gupta', 'Sneha Reddy', 'Vikram Patel', 'Ananya Desai', 'Nikhil Menon', 'Priya Kulkarni', 'Arjun Shetty', 'Ishita Bose', 'Rahul Verma', 'Tanvi Joshi', 'Suresh Kumar', 'Lakshmi Pillai', 'Aditya Bhat', 'Neha Agarwal', 'Manoj Hegde', 'Kavya Prasad'];
const SECTORS = ['IT Services', 'Product', 'Consulting', 'Finance', 'Manufacturing'];
const CATEGORIES = ['High Value', 'Top Employer', 'Global Alumni', 'General Alumni'];

export const makeAlumnus = (i: number): AlumnusRow => {
  const [city, country] = CITIES[i % CITIES.length];
  const joining = 2010 + (i % 10);
  return {
    id: `alum-${String(i).padStart(4, '0')}-uuid`,
    name: NAMES[i % NAMES.length],
    email: i % 5 === 0 ? null : `${NAMES[i % NAMES.length].split(' ')[0].toLowerCase()}${i}@example.com`,
    mobile: i % 4 === 0 ? null : `+91 98${String(10000000 + i * 137).slice(0, 8)}`,
    alternate_emails: i % 7 === 0 ? [`alt${i}@example.com`] : null,
    current_company: i % 6 === 0 ? null : COMPANIES[i % COMPANIES.length],
    current_designation: i % 8 === 0 ? null : ROLES[i % ROLES.length],
    company_sector: SECTORS[i % SECTORS.length],
    city,
    country,
    joining_year: joining,
    leaving_year: joining + 4,
    academic_branch: BRANCHES[i % BRANCHES.length],
    branch_or_designation_raw: BRANCHES[i % BRANCHES.length],
    rnsit_role: 'Alumnus',
    profile_link: i % 3 === 0 ? `https://example.com/p/${i}` : null,
    linkedin_url: i % 2 === 0 ? `https://linkedin.com/in/user${i}` : null,
    primary_category: CATEGORIES[i % CATEGORIES.length],
    is_high_value: i % 9 === 0,
    is_global: country !== 'India',
    is_top_employer: i % 3 === 0,
    is_student_or_rnsit: i % 11 === 0,
    needs_verification: i % 5 === 2,
    value_score: 40 + ((i * 7) % 60),
    status: 'active',
    data_confidence: ['High', 'Standard', 'Unverified'][i % 3],
    notes: i % 10 === 0 ? 'Contacted during 2024 alumni outreach drive. Details confirmed by phone.' : null,
    last_verified_at: i % 4 === 0 ? new Date(Date.now() - i * 86400000).toISOString() : null,
    updated_at: new Date(Date.now() - i * 43200000).toISOString(),
    created_at: new Date(Date.now() - i * 172800000).toISOString(),
  } as unknown as AlumnusRow;
};

/** Deliberately extreme rows — the layout stress cases. */
const EXTREMES: AlumnusRow[] = [
  {
    ...makeAlumnus(100),
    id: 'alum-x001-uuid',
    name: 'Venkatasubramanian Balasubramanian Krishnamurthy Iyengar',
    current_company:
      'Tata Consultancy Services Global Delivery Centre — Banking & Financial Services Division',
    current_designation:
      'Associate Vice President, Enterprise Data Platform Engineering & Governance',
    academic_branch: 'Electronics and Instrumentation Engineering (Autonomous Programme)',
    city: 'Thiruvananthapuram',
    country: 'United States Minor Outlying Islands',
    company_sector: 'Banking, Financial Services and Insurance',
    email: 'venkatasubramanian.balasubramanian.krishnamurthy@enterprise-example-domain.co.in',
    value_score: 100,
    is_high_value: true,
    needs_verification: true,
  } as unknown as AlumnusRow,
  {
    ...makeAlumnus(101),
    id: 'alum-x002-uuid',
    name: 'A',
    current_company: null,
    current_designation: null,
    academic_branch: null,
    branch_or_designation_raw: null,
    city: null,
    country: null,
    company_sector: null,
    email: null,
    mobile: null,
    primary_category: null,
    joining_year: null,
    leaving_year: null,
    value_score: 0,
    notes: null,
  } as unknown as AlumnusRow,
  {
    ...makeAlumnus(102),
    id: 'alum-x003-uuid',
    name: 'Ωμέγα Ünïcödé Ñâme 测试 نموذج',
    current_company: 'Ω-Corp (München) GmbH & Co. KGaA',
    current_designation: 'Chief Räsearch Öfficer',
    academic_branch: 'Computer Science and Engineering',
    joining_year: 1971,
    leaving_year: 2031,
    value_score: 99,
  } as unknown as AlumnusRow,
];

export const ALUMNI: AlumnusRow[] = [
  ...Array.from({ length: 47 }, (_, i) => makeAlumnus(i)),
  ...EXTREMES,
];

export const QUALITY_METRICS: DataQualityMetrics = {
  total_count: 6472,
  missing_email: 1352, missing_mobile: 2084, invalid_mobile: 143, multiple_emails: 318,
  missing_linkedin: 3901, missing_contact: 728,
  missing_company: 906, missing_designation: 1140, missing_sector: 1588,
  missing_country: 640, missing_city: 812, missing_joining_year: 288,
  missing_leaving_year: 331, missing_academic_branch: 402, missing_professional: 615,
  needs_verification: 517,
  confidence_high: 2914, confidence_medium: 2201, confidence_low: 786, confidence_unverified: 571,
  low_data_confidence: 431,
  recognized_branch_records: 5904, suspicious_branch_records: 568,
};

export const makeQualityRecord = (i: number): QualityRecord => {
  const a = makeAlumnus(i) as any;
  return { ...a, mobile_valid: i % 6 !== 0, total_count: 517 } as QualityRecord;
};

export const QUALITY_RECORDS: QualityRecord[] = [
  ...Array.from({ length: 21 }, (_, i) => makeQualityRecord(i)),
  ...EXTREMES.map((a) => ({ ...(a as any), mobile_valid: false, total_count: 517 }) as QualityRecord),
];

export const BRANCH_REPORT: BranchReportRow[] = [
  { academic_branch: 'Computer Science and Engineering', record_count: 1842, classification: 'recognized_academic_branch', is_recognized: true },
  { academic_branch: 'Information Science and Engineering', record_count: 1288, classification: 'recognized_academic_branch', is_recognized: true },
  { academic_branch: 'Electronics and Communication', record_count: 1104, classification: 'recognized_academic_branch', is_recognized: true },
  { academic_branch: 'Mechanical Engineering', record_count: 812, classification: 'recognized_academic_branch', is_recognized: true },
  { academic_branch: 'Senior Software Engineer', record_count: 96, classification: 'role_like_value', is_recognized: false },
  { academic_branch: 'Project Manager', record_count: 61, classification: 'role_like_value', is_recognized: false },
  { academic_branch: 'Infosys Ltd', record_count: 47, classification: 'organization_like_value', is_recognized: false },
  { academic_branch: 'Wipro Technologies', record_count: 33, classification: 'organization_like_value', is_recognized: false },
  { academic_branch: 'B.E', record_count: 214, classification: 'unrecognized_branch_value', is_recognized: false },
  { academic_branch: '—', record_count: 18, classification: 'unknown', is_recognized: false },
  { academic_branch: 'Electronics and Instrumentation Engineering (Autonomous Programme) — Legacy Intake', record_count: 7, classification: 'unrecognized_branch_value', is_recognized: false },
];

export const ADMIN_USERS: AdminUserProfile[] = [
  { id: 'u-1', email: 'eya.clinic@gmail.com', full_name: 'Bhuvan SK', role: 'admin', is_active: true, created_at: '2025-03-14T09:12:00Z', updated_at: null },
  { id: 'u-2', email: 'registrar@rnsit.ac.in', full_name: 'Deepa Registrar', role: 'admin', is_active: true, created_at: '2025-05-02T11:40:00Z', updated_at: null },
  { id: 'u-3', email: 'placement@rnsit.ac.in', full_name: 'Placement Cell', role: 'viewer', is_active: true, created_at: '2025-06-21T14:05:00Z', updated_at: null },
  { id: 'u-4', email: 'intern.data@rnsit.ac.in', full_name: 'Data Intern', role: 'viewer', is_active: false, created_at: '2026-01-09T08:30:00Z', updated_at: null },
];

export const IMPORT_JOBS: AdminImportJob[] = [
  { id: 'job-1', filename: 'Alumni_Master_2026_Q1.xlsx', mode: 'upsert', status: 'completed', total_rows: 1820, valid_rows: 1794, invalid_rows: 26, new_records: 402, updated_records: 1392, duplicate_rows: 14, possible_duplicate_rows: 31, error_rows: 26, uploaded_by: 'u-1', uploaded_by_email: 'eya.clinic@gmail.com', uploaded_by_name: 'Bhuvan SK', started_at: null, completed_at: null, created_at: '2026-02-11T10:22:00Z', updated_at: null },
  { id: 'job-2', filename: 'CSE_Batch_2019_Update.xlsx', mode: 'standard', status: 'running', total_rows: 640, valid_rows: 512, invalid_rows: 0, new_records: 88, updated_records: 424, duplicate_rows: 6, possible_duplicate_rows: 9, error_rows: 0, uploaded_by: 'u-2', uploaded_by_email: 'registrar@rnsit.ac.in', uploaded_by_name: 'Deepa Registrar', started_at: null, completed_at: null, created_at: '2026-02-18T15:48:00Z', updated_at: null },
  { id: 'job-3', filename: 'Global_Alumni_Outreach.xlsx', mode: 'standard', status: 'failed', total_rows: 312, valid_rows: 118, invalid_rows: 194, new_records: 0, updated_records: 0, duplicate_rows: 22, possible_duplicate_rows: 40, error_rows: 194, uploaded_by: 'u-2', uploaded_by_email: 'registrar@rnsit.ac.in', uploaded_by_name: 'Deepa Registrar', started_at: null, completed_at: null, created_at: '2026-03-02T09:03:00Z', updated_at: null },
  { id: 'job-4', filename: 'ISE_Placements_Merge.xlsx', mode: 'upsert', status: 'pending', total_rows: 244, valid_rows: 0, invalid_rows: 0, new_records: 0, updated_records: 0, duplicate_rows: 0, possible_duplicate_rows: 0, error_rows: 0, uploaded_by: 'u-1', uploaded_by_email: 'eya.clinic@gmail.com', uploaded_by_name: 'Bhuvan SK', started_at: null, completed_at: null, created_at: '2026-03-19T17:31:00Z', updated_at: null },
];

export const JOB_DETAILS: ImportJobDetails = {
  job: IMPORT_JOBS[0],
  errors: [
    { id: 'e1', import_job_id: 'job-1', sheet_name: 'Sheet1', row_number: 42, field_name: 'email', error_code: 'INVALID_EMAIL', message: 'Email address failed RFC 5322 validation.', created_at: null },
    { id: 'e2', import_job_id: 'job-1', sheet_name: 'Sheet1', row_number: 118, field_name: 'leaving_year', error_code: 'OUT_OF_RANGE', message: 'Leaving year 20199 is outside the accepted range 1960–2030.', created_at: null },
    { id: 'e3', import_job_id: 'job-1', sheet_name: 'Sheet2', row_number: 7, field_name: 'mobile', error_code: 'BAD_DIGITS', message: 'Mobile number contains fewer than 10 digits after normalization.', created_at: null },
  ],
  duplicates: [],
};

const dup = (i: number, status: string): DuplicateCandidateItem => ({
  id: `dup-${i}0000000-aaaa-bbbb-cccc`,
  import_job_id: 'job-1', existing_alumni_id: 'alum-0001-uuid', candidate_staging_row_id: null, candidate_alumni_id: null,
  match_reason: `{"name_similarity":0.9${i},"email_match":${i % 2 === 0}}`,
  match_score: 88.5 - i * 6.4,
  status,
  reviewed_by: null, reviewed_at: null, created_at: null, updated_at: null,
  existing_alumni_name: NAMES[i % NAMES.length],
  existing_alumni_company: COMPANIES[i % COMPANIES.length],
  existing_alumni_designation: ROLES[i % ROLES.length],
  existing_alumni_email: `${NAMES[i % NAMES.length].split(' ')[0].toLowerCase()}@example.com`,
  existing_alumni_mobile: '+91 9876543210',
  existing_alumni_branch: BRANCHES[i % BRANCHES.length],
  existing_alumni_leaving_year: 2018 + i,
  candidate_name: NAMES[i % NAMES.length].toUpperCase(),
  candidate_company: COMPANIES[(i + 1) % COMPANIES.length],
  candidate_designation: ROLES[(i + 2) % ROLES.length],
  candidate_email: `${NAMES[i % NAMES.length].split(' ')[0].toLowerCase()}.work@example.com`,
  candidate_mobile: '+91 9876543210',
  candidate_academic_branch: BRANCHES[i % BRANCHES.length],
  candidate_joining_year: 2014 + i,
  candidate_leaving_year: 2018 + i,
});

export const DUPLICATES: DuplicateCandidateItem[] = [dup(0, 'pending'), dup(1, 'pending'), dup(2, 'same_person')];

export const AUDIT_SUMMARY: AdminAuditSummary = {
  total_users: 4, admin_users: 2,  active_users: 3,
  total_import_jobs: 12, completed_import_jobs: 9,
  total_duplicates: 148, pending_duplicates: 37, resolved_duplicates: 111,
  verified_alumni: 5955, unverified_alumni: 517,
  recent_verifications: Array.from({ length: 5 }, (_, i) => ({
    id: `v-${i}`,
    name: NAMES[i],
    current_company: COMPANIES[i],
    current_designation: ROLES[i],
    academic_branch: BRANCHES[i % BRANCHES.length],
    leaving_year: 2016 + i,
    last_verified_at: new Date(Date.now() - i * 3600000 * 9).toISOString(),
    data_confidence: ['High', 'Standard', 'High', 'High', 'Standard'][i],
  })),
};

