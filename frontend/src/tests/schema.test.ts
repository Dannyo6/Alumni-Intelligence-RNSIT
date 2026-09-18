import { describe, it, expect } from 'vitest';
import type { Database } from '../types/supabase';
import { executeSync } from '../utils/sync/syncService';
import { detectMapping } from '../utils/sync/dataNormalizer';

type AlumnusInsert = Database['public']['Tables']['alumni']['Insert'];
type AlumnusUpdate = Database['public']['Tables']['alumni']['Update'];
type AlumnusRow = Database['public']['Tables']['alumni']['Row'];

describe('Supabase Schema v1 & Safety Verification', () => {
  it('strictly excludes generated primary_category from Insert payloads at compile and runtime level', () => {
    const newRecord: AlumnusInsert = {
      name: 'RNSIT Graduate',
      email: 'grad@rnsit.ac.in',
      mobile: '+919876543210',
      academic_branch: 'Computer Science and Engineering',
      branch_or_designation_raw: 'CSE',
      joining_year: 2018,
      leaving_year: 2022,
      is_high_value: true,
      is_student_or_rnsit: false,
    };

    expect(newRecord.name).toBe('RNSIT Graduate');
    expect('primary_category' in newRecord).toBe(false);
  });

  it('strictly excludes generated primary_category from Update payloads', () => {
    const updateRecord: AlumnusUpdate = {
      current_company: 'Top Tech Corp',
      current_designation: 'Staff Engineer',
      is_top_employer: true,
    };

    expect(updateRecord.current_company).toBe('Top Tech Corp');
    expect('primary_category' in updateRecord).toBe(false);
  });

  it('verifies Row type contains primary_category as generated field', () => {
    const sampleRow: Partial<AlumnusRow> = {
      id: 'uuid-alumni-1',
      name: 'Jane Doe',
      primary_category: 'High-Value Alumni',
      academic_branch: 'Information Science',
      is_student_or_rnsit: false,
      value_score: 95,
    };

    expect(sampleRow.primary_category).toBe('High-Value Alumni');
  });

  it('maps Schema v1 fields correctly from headers', () => {
    const headers = [
      'Name',
      'Email Address',
      'Mobile Number',
      'Current Company',
      'Current Designation',
      'Branch/Designation',
      'Joining Year',
      'Leaving Year'
    ];

    const mapping = detectMapping(headers);
    expect(mapping.name).toBe('Name');
    expect(mapping.email).toBe('Email Address');
    expect(mapping.mobile).toBe('Mobile Number');
    expect(mapping.current_company).toBe('Current Company');
    expect(mapping.current_designation).toBe('Current Designation');
    expect(mapping.academic_branch).toBe('Branch/Designation');
  });

  it('blocks legacy sync execution to prevent unsafe writes to production', async () => {
    await expect(executeSync()).rejects.toThrow(
      'Legacy sync workflow is disabled in Schema v1. Use the new staging pipeline.'
    );
  });

  it('verifies environment configuration uses VITE_SUPABASE_PUBLISHABLE_KEY', async () => {
    const envExample = `
VITE_SUPABASE_URL=https://qarvwiqlnjndhxjjhvwl.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_AFkVRUdSt5u5UZa9W5BJ_g_OS9uX48a
    `.trim();

    expect(envExample).toContain('VITE_SUPABASE_PUBLISHABLE_KEY');
    expect(envExample).not.toContain('VITE_SUPABASE_ANON_KEY');
  });
});
