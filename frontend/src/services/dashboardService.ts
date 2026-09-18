import { supabase } from '../utils/supabase';

// ─── Dashboard Summary Types ───────────────────────────────────────────────────

export interface DashboardSummary {
  total_alumni: number;
  high_value_count: number;
  top_employer_count: number;
  global_count: number;
  student_rnsit_count: number;
  needs_verification_count: number;
  countries_represented: number;
  companies_represented: number;
  alumni_with_email: number;
  alumni_with_mobile: number;
  alumni_with_any_contact: number;
}

// ─── Distribution Data Types ───────────────────────────────────────────────────

export interface YearDistribution {
  year: number;
  count: number;
}

export interface CompanyDistribution {
  company: string;
  count: number;
}

export interface CountryDistribution {
  country: string;
  count: number;
}

export interface BranchDistribution {
  branch: string;
  count: number;
}

export interface SectorDistribution {
  sector: string;
  count: number;
}

export interface CategoryDistribution {
  category: string;
  count: number;
}

export interface DashboardDistributions {
  leaving_years: YearDistribution[];
  joining_years: YearDistribution[];
  top_companies: CompanyDistribution[];
  countries: CountryDistribution[];
  branches: BranchDistribution[];
  sectors: SectorDistribution[];
  categories: CategoryDistribution[];
}

// ─── Safe Parsers & Helpers ────────────────────────────────────────────────────

const numField = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Safely parses raw RPC result into typed DashboardSummary
 */
export function parseDashboardSummary(raw: unknown): DashboardSummary {
  if (!raw || typeof raw !== 'object') {
    return {
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
    };
  }

  const m = raw as Record<string, unknown>;
  return {
    total_alumni:             numField(m.total_alumni),
    high_value_count:         numField(m.high_value_count),
    top_employer_count:       numField(m.top_employer_count),
    global_count:             numField(m.global_count),
    student_rnsit_count:      numField(m.student_rnsit_count),
    needs_verification_count: numField(m.needs_verification_count),
    countries_represented:    numField(m.countries_represented),
    companies_represented:    numField(m.companies_represented),
    alumni_with_email:        numField(m.alumni_with_email),
    alumni_with_mobile:       numField(m.alumni_with_mobile),
    alumni_with_any_contact:  numField(m.alumni_with_any_contact),
  };
}

/**
 * Safely parses raw RPC result into typed DashboardDistributions
 */
export function parseDashboardDistributions(raw: unknown): DashboardDistributions {
  const empty: DashboardDistributions = {
    leaving_years: [],
    joining_years: [],
    top_companies: [],
    countries: [],
    branches: [],
    sectors: [],
    categories: [],
  };

  if (!raw || typeof raw !== 'object') return empty;

  const d = raw as Record<string, unknown>;

  const parseYears = (arr: unknown): YearDistribution[] => {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const year = numField(item.year);
        const count = numField(item.count);
        return year > 0 ? { year, count } : null;
      })
      .filter((item): item is YearDistribution => item !== null)
      .sort((a, b) => a.year - b.year);
  };

  const parseCompanies = (arr: unknown): CompanyDistribution[] => {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const company = String(item.company || '').trim();
        const count = numField(item.count);
        return company ? { company, count } : null;
      })
      .filter((item): item is CompanyDistribution => item !== null);
  };

  const parseCountries = (arr: unknown): CountryDistribution[] => {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const country = String(item.country || '').trim();
        const count = numField(item.count);
        return country ? { country, count } : null;
      })
      .filter((item): item is CountryDistribution => item !== null);
  };

  const parseBranches = (arr: unknown): BranchDistribution[] => {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const branch = String(item.branch || '').trim();
        const count = numField(item.count);
        return branch ? { branch, count } : null;
      })
      .filter((item): item is BranchDistribution => item !== null);
  };

  const parseSectors = (arr: unknown): SectorDistribution[] => {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const sector = String(item.sector || '').trim();
        const count = numField(item.count);
        return sector ? { sector, count } : null;
      })
      .filter((item): item is SectorDistribution => item !== null);
  };

  const parseCategories = (arr: unknown): CategoryDistribution[] => {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const category = String(item.category || '').trim();
        const count = numField(item.count);
        return category ? { category, count } : null;
      })
      .filter((item): item is CategoryDistribution => item !== null);
  };

  return {
    leaving_years: parseYears(d.leaving_years),
    joining_years: parseYears(d.joining_years),
    top_companies: parseCompanies(d.top_companies),
    countries: parseCountries(d.countries),
    branches: parseBranches(d.branches),
    sectors: parseSectors(d.sectors),
    categories: parseCategories(d.categories),
  };
}

/**
 * Format category strings into clean display labels
 */
export function formatCategoryName(category: string): string {
  if (!category) return 'Unknown';
  switch (category.toLowerCase()) {
    case 'high_value':
      return 'High Value';
    case 'top_employer':
      return 'Top Employer';
    case 'global':
      return 'Global Alumni';
    case 'student_or_rnsit':
    case 'student':
      return 'Student / RNSIT';
    case 'general':
      return 'General Alumni';
    default:
      return category
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
  }
}

export type DrilldownDimension =
  | 'company'
  | 'country'
  | 'sector'
  | 'branch'
  | 'leavingYear'
  | 'joiningYear'
  | 'category'
  | 'highValue'
  | 'topEmployer'
  | 'global'
  | 'student'
  | 'needsVerification'
  | 'hasEmail'
  | 'hasMobile';

/**
 * Generates Directory filter URL with proper URL encoding
 */
export function getDrilldownUrl(dimension: DrilldownDimension, value?: string | number): string {
  const params = new URLSearchParams();

  switch (dimension) {
    case 'company':
      if (value) params.set('company', String(value).trim());
      break;
    case 'country':
      if (value) params.set('country', String(value).trim());
      break;
    case 'sector':
      if (value) params.set('sector', String(value).trim());
      break;
    case 'branch':
      if (value) params.set('branch', String(value).trim());
      break;
    case 'leavingYear':
      if (value) params.set('leavingYear', String(value));
      break;
    case 'joiningYear':
      if (value) params.set('joiningYear', String(value));
      break;
    case 'category':
      if (value) params.set('category', String(value).trim());
      break;
    case 'highValue':
      params.set('highValue', 'true');
      break;
    case 'topEmployer':
      params.set('topEmployer', 'true');
      break;
    case 'global':
      params.set('global', 'true');
      break;
    case 'student':
      params.set('student', 'true');
      break;
    case 'needsVerification':
      params.set('needsVerification', 'true');
      break;
    case 'hasEmail':
      params.set('hasEmail', 'true');
      break;
    case 'hasMobile':
      params.set('hasMobile', 'true');
      break;
  }

  const query = params.toString();
  return query ? `/directory?${query}` : '/directory';
}

// ─── API Fetchers ─────────────────────────────────────────────────────────────

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data, error } = await (supabase.rpc as any)('get_dashboard_summary');
  if (error) throw error;
  return parseDashboardSummary(data);
}

export async function fetchDashboardDistributions(): Promise<DashboardDistributions> {
  const { data, error } = await (supabase.rpc as any)('get_dashboard_distributions');
  if (error) throw error;
  return parseDashboardDistributions(data);
}
