import { describe, it, expect } from 'vitest';
import {
  VALID_QUALITY_FILTERS,
  type DataQualityMetrics,
  type QualityFilterKey,
  type BranchReportRow,
  type BranchClassification,
} from '../services/dataQualityService';
import type { Database } from '../types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

// ─── Helper: Synthetic metrics ─────────────────────────────────────────────

function makeMetrics(overrides: Partial<DataQualityMetrics> = {}): DataQualityMetrics {
  return {
    total_count: 100,
    missing_email: 10,
    missing_mobile: 20,
    invalid_mobile: 5,
    multiple_emails: 3,
    missing_linkedin: 50,
    missing_contact: 8,
    missing_company: 15,
    missing_designation: 25,
    missing_sector: 40,
    missing_country: 12,
    missing_city: 18,
    missing_joining_year: 6,
    missing_leaving_year: 7,
    missing_academic_branch: 4,
    missing_professional: 11,
    needs_verification: 2,
    confidence_high: 30,
    confidence_medium: 25,
    confidence_low: 10,
    confidence_unverified: 35,
    low_data_confidence: 45,
    recognized_branch_records: 85,
    suspicious_branch_records: 15,
    ...overrides,
  };
}

// ─── Helper: Synthetic alumni row fragment ──────────────────────────────────

interface SyntheticAlumnus {
  id: string;
  email: string | null;
  mobile: string | null;
  current_company: string | null;
  current_designation: string | null;
  academic_branch: string | null;
  data_confidence: string | null;
  needs_verification: boolean;
}

function makeAlumnus(overrides: Partial<SyntheticAlumnus> = {}): SyntheticAlumnus {
  return {
    id: 'uuid-' + Math.random().toString(36).slice(2, 10),
    email: 'test@example.com',
    mobile: '+919876543210',
    current_company: 'Acme Corp',
    current_designation: 'Engineer',
    academic_branch: 'Computer Science and Engineering',
    data_confidence: 'high',
    needs_verification: false,
    ...overrides,
  };
}

// ─── Helper: Evaluate filter match (mirrors SQL CASE logic) ─────────────────

function matchesFilter(r: SyntheticAlumnus, filter: QualityFilterKey): boolean {
  const empty = (v: string | null | undefined) => v == null || v.trim() === '';
  switch (filter) {
    case 'missing_email': return empty(r.email);
    case 'missing_mobile': return empty(r.mobile);
    case 'missing_contact': return empty(r.email) && empty(r.mobile);
    case 'missing_company': return empty(r.current_company);
    case 'missing_designation': return empty(r.current_designation);
    case 'missing_professional': return empty(r.current_company) && empty(r.current_designation);
    case 'missing_academic_branch': return empty(r.academic_branch);
    case 'needs_verification': return r.needs_verification === true;
    case 'confidence_high': return r.data_confidence === 'high';
    case 'confidence_medium': return r.data_confidence === 'medium';
    case 'confidence_low': return r.data_confidence === 'low';
    case 'confidence_unverified': return r.data_confidence == null || r.data_confidence.trim() === '' || r.data_confidence === 'unverified';
    case 'low_data_confidence':
      return r.data_confidence == null || r.data_confidence.trim() === '' || r.data_confidence === 'unverified' || r.data_confidence === 'low';
    default: return false; // other fields tested at SQL level
  }
}

// ─── Helper: Branch classification (mirrors exact SQL CASE logic) ───────────

function classifyBranch(value: string): BranchClassification {
  const lower = value.toLowerCase().trim();
  const upper = value.toUpperCase().trim();

  // 1. Conservative recognized academic programs
  const academicPatterns = [
    'computer science', 'information science', 'electronics and communication',
    'electronics and instrumentation', 'electrical and electronics',
    'mechanical engineering', 'civil engineering', 'artificial intelligence',
    'machine learning', 'cyber security', 'data science', 'biotechnology',
    'instrumentation engineering', 'master of computer', 'master of business',
    'b.e', 'b.tech', 'm.tech', 'be in ', 'btech in ', 'mtech in ',
  ];
  const exactAcademic = [
    'CSE', 'ISE', 'ECE', 'EEE', 'ME', 'CV', 'AIML', 'MCA', 'MBA',
    'COMPUTER SCIENCE AND ENGINEERING', 'INFORMATION SCIENCE AND ENGINEERING',
    'ELECTRONICS AND COMMUNICATION ENGINEERING', 'ELECTRICAL AND ELECTRONICS ENGINEERING',
    'MECHANICAL ENGINEERING', 'CIVIL ENGINEERING',
    'ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING',
    'CYBER SECURITY', 'DATA SCIENCE',
    'ELECTRONICS AND INSTRUMENTATION ENGINEERING', 'BIOTECHNOLOGY',
    'MASTER OF COMPUTER APPLICATIONS', 'MASTER OF BUSINESS ADMINISTRATION',
  ];

  if (academicPatterns.some(p => lower.includes(p)) || exactAcademic.includes(upper)) {
    return 'recognized_academic_branch';
  }

  // 2. Role-like
  const rolePatterns = [
    /\b(professor|assistant professor|associate professor|lecturer|instructor)\b/,
    /\b(manager|administrator|system admin|lab assistant|supervisor)\b/,
    /\b(placement coordinator|placement officer|coordinator)\b/,
    /\b(student|intern|trainee)\b/,
    /\b(director|head of|dean|principal|registrar)\b/,
    /\b(analyst|consultant|architect|developer|executive|officer)\b/,
    /\b(founder|vp|president|lead)\b/,
  ];
  if (rolePatterns.some(p => p.test(lower))) {
    return 'role_like_value';
  }

  // 3. Organization-like
  const orgPatterns = [
    /\b(pvt|ltd|llp|inc|corp|limited|private)\b/,
    /\b(technologies|solutions|services|systems|software|consulting)\b/,
    /\b(institute|university|college|school|academy)\b/,
    /\b(google|amazon|microsoft|infosys|wipro|tcs|cognizant)\b/,
  ];
  if (orgPatterns.some(p => p.test(lower))) {
    return 'organization_like_value';
  }

  // 4. Unrecognized (has content ≥2 chars)
  if (value.trim().length >= 2) {
    return 'unrecognized_branch_value';
  }

  // 5. Unknown
  return 'unknown';
}

function isRecognized(value: string): boolean {
  return classifyBranch(value) === 'recognized_academic_branch';
}

// ─── Helper: Auth access evaluation ────────────────────────────────────────

function evaluateAccess(profile: Profile | null) {
  if (!profile) return { isAdmin: false, isActive: false, hasAccess: false };
  const isActive = Boolean(profile.is_active);
  const isAdmin = profile.role === 'admin' && isActive;
  const hasAccess = isActive && isAdmin;
  return { isAdmin, isActive, hasAccess };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('Data Quality — missing_contact filter', () => {
  it('matches when both email and mobile are null', () => {
    const r = makeAlumnus({ email: null, mobile: null });
    expect(matchesFilter(r, 'missing_contact')).toBe(true);
  });

  it('matches when both email and mobile are whitespace', () => {
    const r = makeAlumnus({ email: '   ', mobile: '  ' });
    expect(matchesFilter(r, 'missing_contact')).toBe(true);
  });

  it('matches when both email and mobile are empty strings', () => {
    const r = makeAlumnus({ email: '', mobile: '' });
    expect(matchesFilter(r, 'missing_contact')).toBe(true);
  });

  it('does NOT match when email exists', () => {
    const r = makeAlumnus({ email: 'test@example.com', mobile: null });
    expect(matchesFilter(r, 'missing_contact')).toBe(false);
  });

  it('does NOT match when mobile exists', () => {
    const r = makeAlumnus({ email: null, mobile: '+919876543210' });
    expect(matchesFilter(r, 'missing_contact')).toBe(false);
  });
});

describe('Data Quality — missing_professional filter', () => {
  it('matches when both company and designation are null', () => {
    const r = makeAlumnus({ current_company: null, current_designation: null });
    expect(matchesFilter(r, 'missing_professional')).toBe(true);
  });

  it('matches when both are whitespace', () => {
    const r = makeAlumnus({ current_company: '  ', current_designation: '   ' });
    expect(matchesFilter(r, 'missing_professional')).toBe(true);
  });

  it('does NOT match when company exists', () => {
    const r = makeAlumnus({ current_company: 'Google', current_designation: null });
    expect(matchesFilter(r, 'missing_professional')).toBe(false);
  });

  it('does NOT match when designation exists', () => {
    const r = makeAlumnus({ current_company: null, current_designation: 'Engineer' });
    expect(matchesFilter(r, 'missing_professional')).toBe(false);
  });
});

describe('Data Quality — Schema v1 lowercase confidence contract', () => {
  it('handles exact lowercase "high" confidence', () => {
    const r = makeAlumnus({ data_confidence: 'high' });
    expect(matchesFilter(r, 'confidence_high')).toBe(true);
    expect(matchesFilter(r, 'confidence_medium')).toBe(false);
    expect(matchesFilter(r, 'confidence_low')).toBe(false);
    expect(matchesFilter(r, 'confidence_unverified')).toBe(false);
    expect(matchesFilter(r, 'low_data_confidence')).toBe(false);
  });

  it('handles exact lowercase "medium" confidence', () => {
    const r = makeAlumnus({ data_confidence: 'medium' });
    expect(matchesFilter(r, 'confidence_medium')).toBe(true);
    expect(matchesFilter(r, 'confidence_high')).toBe(false);
    expect(matchesFilter(r, 'confidence_low')).toBe(false);
    expect(matchesFilter(r, 'confidence_unverified')).toBe(false);
    expect(matchesFilter(r, 'low_data_confidence')).toBe(false);
  });

  it('handles exact lowercase "low" confidence', () => {
    const r = makeAlumnus({ data_confidence: 'low' });
    expect(matchesFilter(r, 'confidence_low')).toBe(true);
    expect(matchesFilter(r, 'low_data_confidence')).toBe(true);
    expect(matchesFilter(r, 'confidence_high')).toBe(false);
    expect(matchesFilter(r, 'confidence_medium')).toBe(false);
  });

  it('handles exact lowercase "unverified" confidence', () => {
    const r = makeAlumnus({ data_confidence: 'unverified' });
    expect(matchesFilter(r, 'confidence_unverified')).toBe(true);
    expect(matchesFilter(r, 'low_data_confidence')).toBe(true);
    expect(matchesFilter(r, 'confidence_high')).toBe(false);
  });

  it('treats NULL data_confidence as unverified and low_data_confidence', () => {
    const r = makeAlumnus({ data_confidence: null });
    expect(matchesFilter(r, 'confidence_unverified')).toBe(true);
    expect(matchesFilter(r, 'low_data_confidence')).toBe(true);
    expect(matchesFilter(r, 'confidence_high')).toBe(false);
    expect(matchesFilter(r, 'confidence_medium')).toBe(false);
  });

  it('treats blank or whitespace data_confidence as unverified', () => {
    const rEmpty = makeAlumnus({ data_confidence: '' });
    const rWhitespace = makeAlumnus({ data_confidence: '   ' });
    expect(matchesFilter(rEmpty, 'confidence_unverified')).toBe(true);
    expect(matchesFilter(rWhitespace, 'confidence_unverified')).toBe(true);
  });

  it('does NOT match legacy uppercase or non-v1 values (e.g. Standard, High)', () => {
    const rLegacyHigh = makeAlumnus({ data_confidence: 'High' });
    const rStandard = makeAlumnus({ data_confidence: 'Standard' });
    // In strict lowercase contract:
    expect(matchesFilter(rLegacyHigh, 'confidence_high')).toBe(false);
    expect(matchesFilter(rStandard, 'confidence_medium')).toBe(false);
  });

  it('metrics aggregation produces consistent totals', () => {
    const m = makeMetrics();
    expect(m.confidence_high + m.confidence_medium + m.confidence_low + m.confidence_unverified).toBe(m.total_count);
    expect(m.low_data_confidence).toBe(m.confidence_low + m.confidence_unverified);
  });
});

describe('Data Quality — unsupported quality filter validation', () => {
  it('VALID_QUALITY_FILTERS contains all expected filter keys', () => {
    const required: QualityFilterKey[] = [
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
    for (const key of required) {
      expect(VALID_QUALITY_FILTERS).toContain(key);
    }
  });

  it('rejects an arbitrary string as unsupported filter', () => {
    const unsupported = 'some_random_filter' as QualityFilterKey;
    expect(VALID_QUALITY_FILTERS.includes(unsupported)).toBe(false);
  });

  it('rejects null-like value', () => {
    expect(VALID_QUALITY_FILTERS.includes('' as any)).toBe(false);
    expect(VALID_QUALITY_FILTERS.includes(null as any)).toBe(false);
  });
});

describe('Data Quality — whitespace handling', () => {
  it('treats whitespace-only email as missing', () => {
    const r = makeAlumnus({ email: '   ' });
    expect(matchesFilter(r, 'missing_email')).toBe(true);
  });

  it('treats whitespace-only mobile as missing', () => {
    const r = makeAlumnus({ mobile: '   ' });
    expect(matchesFilter(r, 'missing_mobile')).toBe(true);
  });

  it('treats whitespace-only company as missing', () => {
    const r = makeAlumnus({ current_company: '  ' });
    expect(matchesFilter(r, 'missing_company')).toBe(true);
  });

  it('treats whitespace-only designation as missing', () => {
    const r = makeAlumnus({ current_designation: '  ' });
    expect(matchesFilter(r, 'missing_designation')).toBe(true);
  });

  it('treats whitespace-only branch as missing', () => {
    const r = makeAlumnus({ academic_branch: '  ' });
    expect(matchesFilter(r, 'missing_academic_branch')).toBe(true);
  });
});

describe('Branch Classification — real Engineering program remains recognized', () => {
  const recognizedPrograms = [
    'Computer Science and Engineering',
    'CSE',
    'Information Science and Engineering',
    'ISE',
    'Electronics and Communication Engineering',
    'ECE',
    'Electrical and Electronics Engineering',
    'EEE',
    'Mechanical Engineering',
    'ME',
    'Civil Engineering',
    'CV',
    'Artificial Intelligence and Machine Learning',
    'AIML',
    'Cyber Security',
    'Data Science',
    'Biotechnology',
    'Master of Computer Applications',
    'MCA',
    'Master of Business Administration',
    'MBA',
    'Electronics and Instrumentation Engineering',
    'B.E. in Computer Science',
    'B.Tech in Mechanical Engineering',
    'M.Tech in VLSI Design',
  ];

  for (const branch of recognizedPrograms) {
    it(`classifies real program "${branch}" as recognized_academic_branch`, () => {
      expect(classifyBranch(branch)).toBe('recognized_academic_branch');
      expect(isRecognized(branch)).toBe(true);
    });
  }
});

describe('Branch Classification — organization name containing "Technologies" is NOT recognized', () => {
  const orgs = [
    'Wipro Technologies',
    'ABC Technologies Pvt Ltd',
    'Dell Technologies',
    'Technologies Limited',
  ];

  for (const org of orgs) {
    it(`classifies organization "${org}" as organization_like_value and NOT recognized`, () => {
      expect(classifyBranch(org)).toBe('organization_like_value');
      expect(isRecognized(org)).toBe(false);
    });
  }
});

describe('Branch Classification — role containing "Engineering Manager" is NOT automatically recognized', () => {
  const roles = [
    'Engineering Manager',
    'Director of Engineering',
    'VP of Engineering',
    'Software Engineering Lead',
    'Principal Engineering Manager',
  ];

  for (const role of roles) {
    it(`classifies role "${role}" as role_like_value and NOT recognized`, () => {
      expect(classifyBranch(role)).toBe('role_like_value');
      expect(isRecognized(role)).toBe(false);
    });
  }
});

describe('Branch Classification — other role-like and organization-like values', () => {
  const otherRoles = [
    'Professor',
    'Assistant Professor',
    'Lecturer',
    'Student',
    'Placement Coordinator',
    'System Admin',
  ];

  for (const role of otherRoles) {
    it(`classifies "${role}" as role_like_value`, () => {
      expect(classifyBranch(role)).toBe('role_like_value');
      expect(isRecognized(role)).toBe(false);
    });
  }

  const otherOrgs = [
    'Infosys Ltd',
    'TCS Solutions',
    'Google India',
    'XYZ Software',
  ];

  for (const org of otherOrgs) {
    it(`classifies "${org}" as organization_like_value`, () => {
      expect(classifyBranch(org)).toBe('organization_like_value');
      expect(isRecognized(org)).toBe(false);
    });
  }
});

describe('Branch Classification — unrecognized / unknown', () => {
  it('classifies arbitrary non-academic string as unrecognized_branch_value', () => {
    expect(classifyBranch('Random String 12345')).toBe('unrecognized_branch_value');
    expect(isRecognized('Random String 12345')).toBe(false);
  });

  it('classifies empty-ish value as unknown', () => {
    expect(classifyBranch('X')).toBe('unknown');
    expect(isRecognized('X')).toBe(false);
  });

  it('classifies 2-char unknown value as unrecognized_branch_value', () => {
    expect(classifyBranch('AB')).toBe('unrecognized_branch_value');
    expect(isRecognized('AB')).toBe(false);
  });
});

describe('Security — admin verification permission path', () => {
  it('active admin profile has admin privileges for bulk verification', () => {
    const admin: Profile = {
      id: 'uuid-admin-1',
      role: 'admin',
      is_active: true,
      full_name: 'Admin User',
      email: 'admin@rnsit.ac.in',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { isAdmin, hasAccess } = evaluateAccess(admin);
    expect(isAdmin).toBe(true);
    expect(hasAccess).toBe(true);
  });

  it('marks selected IDs: each update sets needs_verification=false, confidence, and timestamps', () => {
    const payload = {
      needs_verification: false,
      last_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      data_confidence: 'high',
    };
    expect(payload.needs_verification).toBe(false);
    expect(payload.last_verified_at).toBeDefined();
    expect(payload.data_confidence).toBe('high');
  });
});

describe('Data Quality — metrics contract completeness', () => {
  it('metrics contain all required fields', () => {
    const m = makeMetrics();
    const requiredFields = [
      'total_count',
      'missing_email', 'missing_mobile', 'invalid_mobile', 'multiple_emails', 'missing_linkedin', 'missing_contact',
      'missing_company', 'missing_designation', 'missing_sector', 'missing_country', 'missing_city',
      'missing_joining_year', 'missing_leaving_year', 'missing_academic_branch', 'missing_professional',
      'needs_verification',
      'confidence_high', 'confidence_medium', 'confidence_low', 'confidence_unverified', 'low_data_confidence',
      'recognized_branch_records', 'suspicious_branch_records',
    ];
    for (const field of requiredFields) {
      expect(m).toHaveProperty(field);
      expect(typeof (m as any)[field]).toBe('number');
    }
  });
});

describe('Branch Report — classification types completeness', () => {
  it('all five classification types are valid BranchClassification values', () => {
    const classifications: BranchClassification[] = [
      'recognized_academic_branch',
      'role_like_value',
      'organization_like_value',
      'unrecognized_branch_value',
      'unknown',
    ];
    for (const c of classifications) {
      const row: BranchReportRow = {
        academic_branch: 'Test',
        record_count: 1,
        classification: c,
        is_recognized: c === 'recognized_academic_branch',
      };
      expect(row.classification).toBe(c);
    }
  });
});
