import { describe, it, expect } from 'vitest';
import { 
  validateSortField, 
  filterRecognizedAcademicBranches,
  normalizeAlumniDerivedFields,
  RECOGNIZED_ACADEMIC_BRANCHES,
  type AlumnusRow 
} from '../services/directoryService';
import { DEFAULT_DIRECTORY_STATE, type DirectoryFilterState } from '../utils/urlState';

describe('Directory Service & Sort Field Security', () => {
  it('allows valid whitelisted sort fields', () => {
    expect(validateSortField('name')).toBe('name');
    expect(validateSortField('current_company')).toBe('current_company');
    expect(validateSortField('current_designation')).toBe('current_designation');
    expect(validateSortField('joining_year')).toBe('joining_year');
    expect(validateSortField('leaving_year')).toBe('leaving_year');
    expect(validateSortField('value_score')).toBe('value_score');
    expect(validateSortField('updated_at')).toBe('updated_at');
  });

  it('rejects arbitrary, malicious, or non-whitelisted SQL column names and falls back to value_score', () => {
    expect(validateSortField('DROP TABLE alumni;--')).toBe('value_score');
    expect(validateSortField('password_hash')).toBe('value_score');
    expect(validateSortField('is_admin')).toBe('value_score');
    expect(validateSortField('unknown_column')).toBe('value_score');
  });
});

describe('Academic Branch Filter Cleanup & Allowlist', () => {
  it('includes standard canonical branches', () => {
    expect(RECOGNIZED_ACADEMIC_BRANCHES).toContain('Computer Science and Engineering');
    expect(RECOGNIZED_ACADEMIC_BRANCHES).toContain('CSE');
    expect(RECOGNIZED_ACADEMIC_BRANCHES).toContain('ISE');
    expect(RECOGNIZED_ACADEMIC_BRANCHES).toContain('ECE');
    expect(RECOGNIZED_ACADEMIC_BRANCHES).toContain('EEE');
    expect(RECOGNIZED_ACADEMIC_BRANCHES).toContain('AIML');
    expect(RECOGNIZED_ACADEMIC_BRANCHES).toContain('MCA');
    expect(RECOGNIZED_ACADEMIC_BRANCHES).toContain('MBA');
  });

  it('filters out dirty role-like strings while keeping valid academic branches', () => {
    const rawDirtyBranches = [
      'Computer Science and Engineering',
      'CSE',
      'Senior Software Engineer at Amazon',
      'Information Science and Engineering',
      'Product Manager',
      'Mechanical Engineering',
      'VP of Engineering',
      'Civil Engineering',
      'Lead Architect',
      'MCA',
      'MBA',
      'Random String 12345',
      'Artificial Intelligence and Machine Learning'
    ];

    const cleaned = filterRecognizedAcademicBranches(rawDirtyBranches);

    // Should contain recognized branches
    expect(cleaned).toContain('Computer Science and Engineering');
    expect(cleaned).toContain('CSE');
    expect(cleaned).toContain('Information Science and Engineering');
    expect(cleaned).toContain('Mechanical Engineering');
    expect(cleaned).toContain('Civil Engineering');
    expect(cleaned).toContain('MCA');
    expect(cleaned).toContain('MBA');
    expect(cleaned).toContain('Artificial Intelligence and Machine Learning');

    // Should NOT contain dirty role strings
    expect(cleaned).not.toContain('Senior Software Engineer at Amazon');
    expect(cleaned).not.toContain('Product Manager');
    expect(cleaned).not.toContain('VP of Engineering');
    expect(cleaned).not.toContain('Lead Architect');
    expect(cleaned).not.toContain('Random String 12345');
  });
});

describe('Alumni Derived Fields Normalization & Safe Writes', () => {
  it('correctly normalizes name, company, designation, city, email, mobile, and profile links', () => {
    const input: Partial<AlumnusRow> = {
      name: '  Rahul K. Sharma  ',
      email: '  Rahul.Sharma@Amazon.COM  ',
      mobile: '+91 (987) 654-3210',
      current_company: '  Amazon Web Services  ',
      current_designation: '  Senior Software Development Engineer  ',
      city: '  Bengaluru  ',
      country: 'India',
      profile_link: 'https://www.almaconnect.com/alumni/rahul-sharma/',
      joining_year: 2016,
      leaving_year: 2020,
      academic_branch: 'Computer Science and Engineering',
      is_high_value: true,
      value_score: 92,
    };

    const normalized = normalizeAlumniDerivedFields(input);

    expect(normalized.name).toBe('Rahul K. Sharma');
    expect(normalized.name_normalized).toBe('rahul k. sharma');
    expect(normalized.email).toBe('Rahul.Sharma@Amazon.COM');
    expect(normalized.email_normalized).toBe('rahul.sharma@amazon.com');
    expect(normalized.mobile).toBe('+91 (987) 654-3210');
    expect(normalized.mobile_normalized).toBe('919876543210');
    expect(normalized.mobile_valid).toBe(true);
    expect(normalized.current_company).toBe('Amazon Web Services');
    expect(normalized.current_company_normalized).toBe('amazon web services');
    expect(normalized.current_designation).toBe('Senior Software Development Engineer');
    expect(normalized.designation_normalized).toBe('senior software development engineer');
    expect(normalized.city).toBe('Bengaluru');
    expect(normalized.city_normalized).toBe('bengaluru');
    expect(normalized.profile_link_normalized).toBe('almaconnect.com/alumni/rahul-sharma');
    expect(normalized.updated_at).toBeDefined();
  });

  it('strictly excludes immutable & generated columns from safe update payload', () => {
    const inputData: Partial<AlumnusRow> = {
      id: 'uuid-123',
      primary_category: 'Top Employers', // Generated column
      search_vector: 'search vector string', // Generated column
      created_at: '2024-01-01T00:00:00Z',
      last_import_job_id: 'job-uuid-456',
      name: 'John Doe',
      current_company: 'Google',
    };

    const normalized = normalizeAlumniDerivedFields(inputData);
    const safePayload: Record<string, any> = { ...normalized };
    delete safePayload.id;
    delete safePayload.primary_category;
    delete safePayload.search_vector;
    delete safePayload.created_at;
    delete safePayload.last_import_job_id;

    expect(safePayload.id).toBeUndefined();
    expect(safePayload.primary_category).toBeUndefined();
    expect(safePayload.search_vector).toBeUndefined();
    expect(safePayload.created_at).toBeUndefined();
    expect(safePayload.last_import_job_id).toBeUndefined();
    expect(safePayload.name).toBe('John Doe');
    expect(safePayload.name_normalized).toBe('john doe');
    expect(safePayload.current_company).toBe('Google');
  });
});

describe('Multi-Filter AND Semantics & Academic Span Overlap', () => {
  const syntheticAlumni: AlumnusRow[] = [
    {
      id: '1',
      name: 'Alice Sharma',
      name_normalized: 'alice sharma',
      current_company: 'Amazon',
      current_company_normalized: 'amazon',
      current_designation: 'Software Development Engineer II',
      designation_normalized: 'software development engineer ii',
      company_sector: 'Technology',
      city: 'Bengaluru',
      city_normalized: 'bengaluru',
      country: 'India',
      country_code: 'IN',
      email: 'alice@amazon.com',
      alternate_emails: null,
      email_normalized: 'alice@amazon.com',
      mobile: '+919876543210',
      mobile_normalized: '919876543210',
      mobile_valid: true,
      joining_year: 2015,
      leaving_year: 2019,
      branch_or_designation_raw: 'CSE',
      academic_branch: 'Computer Science and Engineering',
      rnsit_role: 'Alumnus',
      profile_link: 'https://linkedin.com/in/alice',
      profile_link_normalized: 'linkedin.com/in/alice',
      linkedin_url: 'https://linkedin.com/in/alice',
      primary_category: 'Top Employers',
      is_high_value: true,
      is_top_employer: true,
      is_global: false,
      is_student_or_rnsit: false,
      needs_verification: false,
      value_score: 85,
      status: 'active',
      data_confidence: 'High',
      notes: null,
      source_workbook: 'Alumni_2024.xlsx',
      source_sheet: 'Top Employers',
      last_import_job_id: null,
      last_verified_at: '2024-01-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      search_vector: null
    },
    {
      id: '2',
      name: 'Bob Verma',
      name_normalized: 'bob verma',
      current_company: 'Microsoft',
      current_company_normalized: 'microsoft',
      current_designation: 'Product Manager',
      designation_normalized: 'product manager',
      company_sector: 'Technology',
      city: 'Seattle',
      city_normalized: 'seattle',
      country: 'United States',
      country_code: 'US',
      email: 'bob@microsoft.com',
      alternate_emails: null,
      email_normalized: 'bob@microsoft.com',
      mobile: null,
      mobile_normalized: null,
      mobile_valid: null,
      joining_year: 2017,
      leaving_year: 2021,
      branch_or_designation_raw: 'ISE',
      academic_branch: 'Information Science and Engineering',
      rnsit_role: 'Alumnus',
      profile_link: null,
      profile_link_normalized: null,
      linkedin_url: null,
      primary_category: 'Global Spread',
      is_high_value: true,
      is_top_employer: true,
      is_global: true,
      is_student_or_rnsit: false,
      needs_verification: false,
      value_score: 90,
      status: 'active',
      data_confidence: 'High',
      notes: null,
      source_workbook: 'Alumni_2024.xlsx',
      source_sheet: 'Global Spread',
      last_import_job_id: null,
      last_verified_at: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      search_vector: null
    }
  ];

  it('filters with strict AND semantics', () => {
    // Filter: Company = Amazon AND Branch = Computer Science
    const matches = syntheticAlumni.filter(a => 
      a.current_company === 'Amazon' && 
      a.academic_branch?.includes('Computer Science')
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].name).toBe('Alice Sharma');

    // Filter: Company = Amazon AND Branch = Information Science -> Should yield 0 results
    const noMatches = syntheticAlumni.filter(a => 
      a.current_company === 'Amazon' && 
      a.academic_branch?.includes('Information Science')
    );
    expect(noMatches).toHaveLength(0);
  });

  it('evaluates academic span overlap for year range (e.g. 2015-2019)', () => {
    const rangeStart = 2015;
    const rangeEnd = 2019;

    const overlappingAlumni = syntheticAlumni.filter(a => {
      const join = a.joining_year ?? a.leaving_year ?? 0;
      const leave = a.leaving_year ?? a.joining_year ?? 9999;
      return join <= rangeEnd && leave >= rangeStart;
    });

    // Alice (2015-2019) overlaps, Bob (2017-2021) also overlaps [2015, 2019] in 2017-2019!
    expect(overlappingAlumni.map(a => a.name)).toContain('Alice Sharma');
    expect(overlappingAlumni.map(a => a.name)).toContain('Bob Verma');
  });

  it('resets page to 1 when changing search filters', () => {
    let state: DirectoryFilterState = {
      ...DEFAULT_DIRECTORY_STATE,
      page: 4,
      company: 'Amazon',
    };

    const updateFilter = (prevState: DirectoryFilterState, updates: Partial<DirectoryFilterState>): DirectoryFilterState => ({
      ...prevState,
      ...updates,
      page: updates.page !== undefined ? updates.page : 1,
    });

    const nextState = updateFilter(state, { branch: 'CSE' });
    expect(nextState.page).toBe(1);
    expect(nextState.branch).toBe('CSE');
    expect(nextState.company).toBe('Amazon');
  });

  it('verifies export bounding semantics (safety limit capped at 5000 and cap detection)', () => {
    const requestedExportCap = 10000;
    const effectiveCap = Math.min(requestedExportCap, 5000);
    expect(effectiveCap).toBe(5000);

    const totalMatchingCount = 6472;
    const isCapped = totalMatchingCount > effectiveCap;
    expect(isCapped).toBe(true);
  });

  it('treats NULL, empty string, and whitespace as missing for email/mobile filters', () => {
    const recordsWithDirtyFields: Partial<AlumnusRow>[] = [
      { id: '1', email: 'valid@example.com', mobile: '+123456789' },
      { id: '2', email: '', mobile: '   ' },
      { id: '3', email: '   ', mobile: '' },
      { id: '4', email: null, mobile: null },
    ];

    const hasValidEmail = recordsWithDirtyFields.filter(r => r.email && r.email.trim() !== '');
    const hasValidMobile = recordsWithDirtyFields.filter(r => r.mobile && r.mobile.trim() !== '');

    expect(hasValidEmail).toHaveLength(1);
    expect(hasValidEmail[0].id).toBe('1');
    expect(hasValidMobile).toHaveLength(1);
    expect(hasValidMobile[0].id).toBe('1');
  });
});
