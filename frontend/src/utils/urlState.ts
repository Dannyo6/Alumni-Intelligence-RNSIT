export interface DirectoryFilterState {
  searchQuery: string;
  company: string;
  designation: string;
  sector: string;
  branch: string;
  country: string;
  city: string;
  joiningYear: number | null;
  leavingYear: number | null;
  primaryCategory: string;
  isHighValue: boolean;
  isGlobal: boolean;
  isTopEmployer: boolean;
  isStudentOrRnsit: boolean;
  needsVerification: boolean;
  hasEmail: boolean;
  hasMobile: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export const DEFAULT_DIRECTORY_STATE: DirectoryFilterState = {
  searchQuery: '',
  company: '',
  designation: '',
  sector: '',
  branch: '',
  country: '',
  city: '',
  joiningYear: null,
  leavingYear: null,
  primaryCategory: '',
  isHighValue: false,
  isGlobal: false,
  isTopEmployer: false,
  isStudentOrRnsit: false,
  needsVerification: false,
  hasEmail: false,
  hasMobile: false,
  sortBy: 'value_score',
  sortOrder: 'desc',
  page: 1,
  pageSize: 50,
};

/**
 * Parses URLSearchParams into DirectoryFilterState (strictly omitting any PII).
 */
export function parseUrlToDirectoryState(searchParams: URLSearchParams): DirectoryFilterState {
  return {
    searchQuery: searchParams.get('q') || '',
    company: searchParams.get('company') || '',
    designation: searchParams.get('designation') || '',
    sector: searchParams.get('sector') || '',
    branch: searchParams.get('branch') || '',
    country: searchParams.get('country') || '',
    city: searchParams.get('city') || '',
    joiningYear: searchParams.get('joiningYear') ? parseInt(searchParams.get('joiningYear')!, 10) || null : null,
    leavingYear: searchParams.get('leavingYear') ? parseInt(searchParams.get('leavingYear')!, 10) || null : null,
    primaryCategory: searchParams.get('category') || '',
    isHighValue: searchParams.get('highValue') === 'true',
    isGlobal: searchParams.get('global') === 'true',
    isTopEmployer: searchParams.get('topEmployer') === 'true',
    isStudentOrRnsit: searchParams.get('student') === 'true',
    needsVerification: searchParams.get('needsVerification') === 'true',
    hasEmail: searchParams.get('hasEmail') === 'true',
    hasMobile: searchParams.get('hasMobile') === 'true',
    sortBy: searchParams.get('sort') || 'value_score',
    sortOrder: (searchParams.get('order') === 'asc' ? 'asc' : 'desc'),
    page: Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1),
    pageSize: [25, 50, 100].includes(parseInt(searchParams.get('pageSize') || '50', 10))
      ? parseInt(searchParams.get('pageSize') || '50', 10)
      : 50,
  };
}

/**
 * Serializes DirectoryFilterState into URLSearchParams (never includes PII).
 */
export function serializeDirectoryStateToUrl(state: DirectoryFilterState): URLSearchParams {
  const params = new URLSearchParams();

  if (state.searchQuery.trim()) params.set('q', state.searchQuery.trim());
  if (state.company.trim()) params.set('company', state.company.trim());
  if (state.designation.trim()) params.set('designation', state.designation.trim());
  if (state.sector.trim()) params.set('sector', state.sector.trim());
  if (state.branch.trim()) params.set('branch', state.branch.trim());
  if (state.country.trim()) params.set('country', state.country.trim());
  if (state.city.trim()) params.set('city', state.city.trim());
  if (state.joiningYear) params.set('joiningYear', String(state.joiningYear));
  if (state.leavingYear) params.set('leavingYear', String(state.leavingYear));
  if (state.primaryCategory.trim()) params.set('category', state.primaryCategory.trim());

  if (state.isHighValue) params.set('highValue', 'true');
  if (state.isGlobal) params.set('global', 'true');
  if (state.isTopEmployer) params.set('topEmployer', 'true');
  if (state.isStudentOrRnsit) params.set('student', 'true');
  if (state.needsVerification) params.set('needsVerification', 'true');
  if (state.hasEmail) params.set('hasEmail', 'true');
  if (state.hasMobile) params.set('hasMobile', 'true');

  if (state.sortBy && state.sortBy !== 'value_score') params.set('sort', state.sortBy);
  if (state.sortOrder && state.sortOrder !== 'desc') params.set('order', state.sortOrder);
  if (state.page > 1) params.set('page', String(state.page));
  if (state.pageSize !== 50) params.set('pageSize', String(state.pageSize));

  return params;
}
