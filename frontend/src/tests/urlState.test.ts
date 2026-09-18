import { describe, it, expect } from 'vitest';
import { 
  parseUrlToDirectoryState, 
  serializeDirectoryStateToUrl, 
  DEFAULT_DIRECTORY_STATE,
  type DirectoryFilterState 
} from '../utils/urlState';

describe('URL State Serialization & Deserialization', () => {
  it('parses URL query params into typed state', () => {
    const params = new URLSearchParams('q=amazon&company=Amazon&branch=CSE&leavingYear=2019&page=2&pageSize=25&highValue=true&sort=name&order=asc');
    const state = parseUrlToDirectoryState(params);

    expect(state.searchQuery).toBe('amazon');
    expect(state.company).toBe('Amazon');
    expect(state.branch).toBe('CSE');
    expect(state.leavingYear).toBe(2019);
    expect(state.page).toBe(2);
    expect(state.pageSize).toBe(25);
    expect(state.isHighValue).toBe(true);
    expect(state.sortBy).toBe('name');
    expect(state.sortOrder).toBe('asc');
  });

  it('serializes state back to clean URLSearchParams', () => {
    const state: DirectoryFilterState = {
      ...DEFAULT_DIRECTORY_STATE,
      searchQuery: 'Microsoft',
      company: 'Microsoft',
      branch: 'ISE',
      page: 3,
      pageSize: 100,
      isGlobal: true,
      sortBy: 'joining_year',
      sortOrder: 'asc',
    };

    const params = serializeDirectoryStateToUrl(state);
    expect(params.get('q')).toBe('Microsoft');
    expect(params.get('company')).toBe('Microsoft');
    expect(params.get('branch')).toBe('ISE');
    expect(params.get('page')).toBe('3');
    expect(params.get('pageSize')).toBe('100');
    expect(params.get('global')).toBe('true');
    expect(params.get('sort')).toBe('joining_year');
    expect(params.get('order')).toBe('asc');
  });

  it('strictly NEVER encodes email, mobile, or PII into URL parameters', () => {
    const state: DirectoryFilterState = {
      ...DEFAULT_DIRECTORY_STATE,
      hasEmail: true,
      hasMobile: true,
    };

    const params = serializeDirectoryStateToUrl(state);
    expect(params.get('hasEmail')).toBe('true');
    expect(params.get('hasMobile')).toBe('true');
    
    // Ensure no raw email or phone parameter exists
    expect(params.get('email')).toBeNull();
    expect(params.get('mobile')).toBeNull();
    expect(params.get('phone')).toBeNull();
  });

  it('uses safe defaults when given empty or malformed URL params', () => {
    const params = new URLSearchParams('page=-5&pageSize=999');
    const state = parseUrlToDirectoryState(params);

    expect(state.page).toBe(1);
    expect(state.pageSize).toBe(50); // falls back to default 50
    expect(state.sortBy).toBe('value_score');
  });
});
