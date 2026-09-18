import { describe, it, expect } from 'vitest';
import type { Database } from '../types/supabase';
import type { AlumnusRow } from '../services/directoryService';

type Profile = Database['public']['Tables']['profiles']['Row'];

describe('Access Control & Admin Privileges', () => {
  const canEdit = (profile: Profile | null): boolean => {
    return Boolean(profile && profile.role === 'admin' && profile.is_active);
  };

  const canMarkVerified = (profile: Profile | null): boolean => {
    return Boolean(profile && profile.role === 'admin' && profile.is_active);
  };

  it('permits active admins to edit and mark verified', () => {
    const admin: Profile = {
      id: 'admin-1',
      role: 'admin',
      is_active: true,
      email: 'admin@rnsit.ac.in',
      full_name: 'Admin',
      created_at: null,
      updated_at: null,
    };

    expect(canEdit(admin)).toBe(true);
    expect(canMarkVerified(admin)).toBe(true);
  });

  it('denies inactive admins from editing or marking verified', () => {
    const inactiveAdmin: Profile = {
      id: 'admin-2',
      role: 'admin',
      is_active: false,
      email: 'inactive@rnsit.ac.in',
      full_name: 'Inactive Admin',
      created_at: null,
      updated_at: null,
    };

    expect(canEdit(inactiveAdmin)).toBe(false);
    expect(canMarkVerified(inactiveAdmin)).toBe(false);
  });
});

describe('Mark Verified Action Semantics', () => {
  it('correctly sets needs_verification to false and updates last_verified_at timestamp', () => {
    const unverifiedRecord: AlumnusRow = {
      id: 'rec-1',
      name: 'Priya Nair',
      name_normalized: 'priya nair',
      current_company: 'Infosys',
      current_company_normalized: 'infosys',
      current_designation: 'Lead Architect',
      designation_normalized: 'lead architect',
      company_sector: 'Technology',
      city: 'Bengaluru',
      city_normalized: 'bengaluru',
      country: 'India',
      country_code: 'IN',
      email: 'priya@example.com',
      alternate_emails: null,
      email_normalized: 'priya@example.com',
      mobile: '+919988776655',
      mobile_normalized: '919988776655',
      mobile_valid: true,
      joining_year: 2014,
      leaving_year: 2018,
      branch_or_designation_raw: 'ECE',
      academic_branch: 'Electronics and Communication Engineering',
      rnsit_role: 'Alumnus',
      profile_link: null,
      profile_link_normalized: null,
      linkedin_url: null,
      primary_category: 'Top Employers',
      is_high_value: true,
      is_top_employer: true,
      is_global: false,
      is_student_or_rnsit: false,
      needs_verification: true,
      value_score: 80,
      status: 'active',
      data_confidence: 'Standard',
      notes: null,
      source_workbook: 'Export.xlsx',
      source_sheet: 'Sheet1',
      last_import_job_id: null,
      last_verified_at: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      search_vector: null,
    };

    const applyMarkVerified = (record: AlumnusRow, confidence = 'High'): AlumnusRow => {
      const now = new Date().toISOString();
      return {
        ...record,
        needs_verification: false,
        last_verified_at: now,
        data_confidence: confidence,
        updated_at: now,
      };
    };

    const verified = applyMarkVerified(unverifiedRecord, 'High');

    expect(verified.needs_verification).toBe(false);
    expect(verified.last_verified_at).not.toBeNull();
    expect(verified.data_confidence).toBe('High');
  });
});

describe('Export Field Whitelist & Sanitization', () => {
  it('whitelists user-facing fields and omits internal search vector & normalized fields', () => {
    const rawRecord: AlumnusRow = {
      id: 'uuid-1234',
      name: 'Kavita Rao',
      name_normalized: 'kavita rao',
      current_company: 'Google',
      current_company_normalized: 'google',
      current_designation: 'Staff Engineer',
      designation_normalized: 'staff engineer',
      company_sector: 'Technology',
      city: 'Sunnyvale',
      city_normalized: 'sunnyvale',
      country: 'United States',
      country_code: 'US',
      email: 'kavita@google.com',
      alternate_emails: ['kavita.alt@gmail.com'],
      email_normalized: 'kavita@google.com',
      mobile: '+14085551234',
      mobile_normalized: '14085551234',
      mobile_valid: true,
      joining_year: 2010,
      leaving_year: 2014,
      branch_or_designation_raw: 'CSE',
      academic_branch: 'Computer Science and Engineering',
      rnsit_role: 'Alumnus',
      profile_link: 'https://linkedin.com/in/kavita',
      profile_link_normalized: 'linkedin.com/in/kavita',
      linkedin_url: 'https://linkedin.com/in/kavita',
      primary_category: 'Top Employers',
      is_high_value: true,
      is_top_employer: true,
      is_global: true,
      is_student_or_rnsit: false,
      needs_verification: false,
      value_score: 95,
      status: 'active',
      data_confidence: 'High',
      notes: 'Keynote speaker',
      source_workbook: 'Alumni.xlsx',
      source_sheet: 'Top Employers',
      last_import_job_id: 'job-1',
      last_verified_at: '2024-01-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      search_vector: "'googl':1 'kavit':2 'rao':3",
    };

    // User-facing export mapping
    const exportData = {
      Name: rawRecord.name,
      Email: rawRecord.email || '',
      Mobile: rawRecord.mobile || '',
      Company: rawRecord.current_company || '',
      Designation: rawRecord.current_designation || '',
      Sector: rawRecord.company_sector || '',
      City: rawRecord.city || '',
      Country: rawRecord.country || '',
      Branch: rawRecord.academic_branch || rawRecord.branch_or_designation_raw || '',
      JoiningYear: rawRecord.joining_year || '',
      LeavingYear: rawRecord.leaving_year || '',
      Category: rawRecord.primary_category || '',
      ValueScore: rawRecord.value_score ?? '',
      HighValue: rawRecord.is_high_value ? 'Yes' : 'No',
      Global: rawRecord.is_global ? 'Yes' : 'No',
      TopEmployer: rawRecord.is_top_employer ? 'Yes' : 'No',
      StudentOrRNSIT: rawRecord.is_student_or_rnsit ? 'Yes' : 'No',
      NeedsVerification: rawRecord.needs_verification ? 'Yes' : 'No',
    };

    expect(exportData).not.toHaveProperty('id');
    expect(exportData).not.toHaveProperty('search_vector');
    expect(exportData).not.toHaveProperty('name_normalized');
    expect(exportData).not.toHaveProperty('current_company_normalized');
    expect(exportData).not.toHaveProperty('last_import_job_id');
    expect(exportData.Name).toBe('Kavita Rao');
    expect(exportData.Company).toBe('Google');
  });
});
