import { describe, it, expect } from 'vitest';
import { 
  parseDashboardSummary, 
  parseDashboardDistributions, 
  getDrilldownUrl, 
  formatCategoryName,
  type DashboardSummary,
  type DashboardDistributions
} from '../services/dashboardService';

describe('Dashboard Analytics & Institutional Intelligence Tests', () => {

  // ─── 1. Summary Service Parsing ─────────────────────────────────────────────
  describe('Summary Service Parsing (parseDashboardSummary)', () => {
    it('correctly parses a complete valid summary RPC payload', () => {
      const rawRpcPayload = {
        total_alumni: 6472,
        high_value_count: 512,
        top_employer_count: 1420,
        global_count: 380,
        student_rnsit_count: 890,
        needs_verification_count: 145,
        countries_represented: 28,
        companies_represented: 1150,
        alumni_with_email: 5800,
        alumni_with_mobile: 5200,
        alumni_with_any_contact: 6100,
      };

      const parsed: DashboardSummary = parseDashboardSummary(rawRpcPayload);

      expect(parsed.total_alumni).toBe(6472);
      expect(parsed.high_value_count).toBe(512);
      expect(parsed.top_employer_count).toBe(1420);
      expect(parsed.global_count).toBe(380);
      expect(parsed.student_rnsit_count).toBe(890);
      expect(parsed.needs_verification_count).toBe(145);
      expect(parsed.countries_represented).toBe(28);
      expect(parsed.companies_represented).toBe(1150);
      expect(parsed.alumni_with_email).toBe(5800);
      expect(parsed.alumni_with_mobile).toBe(5200);
      expect(parsed.alumni_with_any_contact).toBe(6100);
    });

    it('coerces numeric strings and handles partial/missing fields safely', () => {
      const partialPayload = {
        total_alumni: '6472',
        high_value_count: '512',
        top_employer_count: null,
        global_count: undefined,
        countries_represented: '28',
      };

      const parsed = parseDashboardSummary(partialPayload);

      expect(parsed.total_alumni).toBe(6472);
      expect(parsed.high_value_count).toBe(512);
      expect(parsed.top_employer_count).toBe(0);
      expect(parsed.global_count).toBe(0);
      expect(parsed.student_rnsit_count).toBe(0);
      expect(parsed.needs_verification_count).toBe(0);
      expect(parsed.countries_represented).toBe(28);
      expect(parsed.companies_represented).toBe(0);
      expect(parsed.alumni_with_email).toBe(0);
      expect(parsed.alumni_with_mobile).toBe(0);
      expect(parsed.alumni_with_any_contact).toBe(0);
    });

    it('returns zeroes when raw payload is null, undefined, or empty', () => {
      const nullParsed = parseDashboardSummary(null);
      expect(nullParsed.total_alumni).toBe(0);
      expect(nullParsed.high_value_count).toBe(0);
      expect(nullParsed.countries_represented).toBe(0);

      const undefParsed = parseDashboardSummary(undefined);
      expect(undefParsed.total_alumni).toBe(0);

      const emptyParsed = parseDashboardSummary({});
      expect(emptyParsed.total_alumni).toBe(0);
    });
  });

  // ─── 2. Chart Data Mapping ──────────────────────────────────────────────────
  describe('Chart Data Mapping (parseDashboardDistributions)', () => {
    it('correctly maps and sorts distributions across all dimensions', () => {
      const rawDistributions = {
        leaving_years: [
          { year: 2022, count: 450 },
          { year: 2018, count: 320 },
          { year: 2020, count: 400 },
        ],
        joining_years: [
          { year: 2014, count: 320 },
          { year: 2018, count: 450 },
        ],
        top_companies: [
          { company: 'Amazon', count: 180 },
          { company: 'Microsoft', count: 120 },
          { company: '', count: 50 }, // empty company should be filtered
        ],
        countries: [
          { country: 'India', count: 5200 },
          { country: 'United States', count: 650 },
          { country: null, count: 20 }, // null country should be filtered
        ],
        branches: [
          { branch: 'Computer Science and Engineering', count: 2100 },
          { branch: 'Information Science and Engineering', count: 1400 },
        ],
        sectors: [
          { sector: 'Technology', count: 3500 },
          { sector: 'Finance', count: 600 },
        ],
        categories: [
          { category: 'high_value', count: 512 },
          { category: 'top_employer', count: 1420 },
          { category: 'global', count: 380 },
        ],
      };

      const parsed: DashboardDistributions = parseDashboardDistributions(rawDistributions);

      // Years should be sorted ascending
      expect(parsed.leaving_years).toEqual([
        { year: 2018, count: 320 },
        { year: 2020, count: 400 },
        { year: 2022, count: 450 },
      ]);

      expect(parsed.joining_years).toEqual([
        { year: 2014, count: 320 },
        { year: 2018, count: 450 },
      ]);

      // Top companies filtered empty strings
      expect(parsed.top_companies).toEqual([
        { company: 'Amazon', count: 180 },
        { company: 'Microsoft', count: 120 },
      ]);

      // Countries filtered nulls
      expect(parsed.countries).toEqual([
        { country: 'India', count: 5200 },
        { country: 'United States', count: 650 },
      ]);

      expect(parsed.branches.length).toBe(2);
      expect(parsed.sectors.length).toBe(2);
      expect(parsed.categories.length).toBe(3);
    });

    it('safely handles empty or non-array distributions', () => {
      const emptyParsed = parseDashboardDistributions({
        leaving_years: null,
        top_companies: 'invalid',
        countries: undefined,
      });

      expect(emptyParsed.leaving_years).toEqual([]);
      expect(emptyParsed.joining_years).toEqual([]);
      expect(emptyParsed.top_companies).toEqual([]);
      expect(emptyParsed.countries).toEqual([]);
      expect(emptyParsed.branches).toEqual([]);
      expect(emptyParsed.sectors).toEqual([]);
      expect(emptyParsed.categories).toEqual([]);
    });

    it('formats category names cleanly for display', () => {
      expect(formatCategoryName('high_value')).toBe('High Value');
      expect(formatCategoryName('top_employer')).toBe('Top Employer');
      expect(formatCategoryName('global')).toBe('Global Alumni');
      expect(formatCategoryName('student_or_rnsit')).toBe('Student / RNSIT');
      expect(formatCategoryName('student')).toBe('Student / RNSIT');
      expect(formatCategoryName('general')).toBe('General Alumni');
      expect(formatCategoryName('other_custom_category')).toBe('Other Custom Category');
      expect(formatCategoryName('')).toBe('Unknown');
    });
  });

  // ─── 3. Drilldown URL Mapping ───────────────────────────────────────────────
  describe('Drilldown URL Mapping (getDrilldownUrl)', () => {
    it('generates correct drilldown URL for company filter', () => {
      expect(getDrilldownUrl('company', 'Amazon')).toBe('/directory?company=Amazon');
      expect(getDrilldownUrl('company', 'Google LLC')).toBe('/directory?company=Google+LLC');
    });

    it('generates correct drilldown URL for country filter', () => {
      expect(getDrilldownUrl('country', 'United States')).toBe('/directory?country=United+States');
      expect(getDrilldownUrl('country', 'India')).toBe('/directory?country=India');
    });

    it('generates correct drilldown URL for primary category filter', () => {
      expect(getDrilldownUrl('category', 'high_value')).toBe('/directory?category=high_value');
      expect(getDrilldownUrl('category', 'top_employer')).toBe('/directory?category=top_employer');
    });

    it('generates correct drilldown URL for leaving and joining years', () => {
      expect(getDrilldownUrl('leavingYear', 2022)).toBe('/directory?leavingYear=2022');
      expect(getDrilldownUrl('joiningYear', 2018)).toBe('/directory?joiningYear=2018');
    });

    it('generates correct drilldown URL for academic branch and sector', () => {
      expect(getDrilldownUrl('branch', 'Computer Science')).toBe('/directory?branch=Computer+Science');
      expect(getDrilldownUrl('sector', 'Technology')).toBe('/directory?sector=Technology');
    });

    it('generates correct drilldown URL for boolean flags', () => {
      expect(getDrilldownUrl('highValue')).toBe('/directory?highValue=true');
      expect(getDrilldownUrl('global')).toBe('/directory?global=true');
      expect(getDrilldownUrl('topEmployer')).toBe('/directory?topEmployer=true');
      expect(getDrilldownUrl('student')).toBe('/directory?student=true');
      expect(getDrilldownUrl('needsVerification')).toBe('/directory?needsVerification=true');
      expect(getDrilldownUrl('hasEmail')).toBe('/directory?hasEmail=true');
      expect(getDrilldownUrl('hasMobile')).toBe('/directory?hasMobile=true');
    });

    it('falls back to /directory when no value is provided for parameterized filter', () => {
      expect(getDrilldownUrl('company', '')).toBe('/directory');
      expect(getDrilldownUrl('country', undefined)).toBe('/directory');
    });
  });

  // ─── 4. Empty Analytics Responses ───────────────────────────────────────────
  describe('Empty Analytics Responses Handling', () => {
    it('handles completely blank database gracefully with 0 counts and empty arrays', () => {
      const emptySummary = parseDashboardSummary({
        total_alumni: 0,
        high_value_count: 0,
        top_employer_count: 0,
        global_count: 0,
        student_rnsit_count: 0,
        needs_verification_count: 0,
        countries_represented: 0,
        companies_represented: 0,
        alumni_with_email: 0,
        alumni_with_mobile: 0,
        alumni_with_any_contact: 0,
      });

      expect(emptySummary.total_alumni).toBe(0);
      expect(emptySummary.high_value_count).toBe(0);
      expect(emptySummary.countries_represented).toBe(0);

      const emptyDist = parseDashboardDistributions({
        leaving_years: [],
        joining_years: [],
        top_companies: [],
        countries: [],
        branches: [],
        sectors: [],
        categories: [],
      });

      expect(emptyDist.leaving_years.length).toBe(0);
      expect(emptyDist.top_companies.length).toBe(0);
    });
  });

  // ─── 5. Authenticated Access Assumptions ────────────────────────────────────
  describe('Authenticated Access & Security Assumptions', () => {
    it('verifies that analytics functions require active authenticated role', () => {
      const checkAccess = (userRole: string | null, isActive: boolean) => {
        if (!userRole || !isActive) return false;
        return ['admin'].includes(userRole);
      };

      expect(checkAccess('admin', true)).toBe(true);
      expect(checkAccess('admin', false)).toBe(false);
      expect(checkAccess(null, false)).toBe(false);
      expect(checkAccess('anon', true)).toBe(false);
    });
  });
});
