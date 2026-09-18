// Preview-only stand-in: keeps every real type/helper, fakes the network calls.
export * from '../../services/directoryService';
import type { AlumnusRow, AlumniDiscoveryResult, DirectoryFilterOptions, ExportResult } from '../../services/directoryService';
import { ALUMNI } from '../fixtures';

export async function fetchAlumniDiscovery(state: any): Promise<AlumniDiscoveryResult> {
  const size = state?.pageSize ?? 50;
  return {
    records: ALUMNI.slice(0, size) as AlumnusRow[],
    totalCount: 6472,
    parsedQuery: state?.searchQuery
      ? { detectedPills: [{ label: `Company: ${state.searchQuery}` }, { label: 'Batch: 2019' }] }
      : undefined,
  } as AlumniDiscoveryResult;
}

export async function fetchDirectoryFilterOptions(): Promise<DirectoryFilterOptions> {
  return {
    branches: ['Computer Science and Engineering', 'Information Science and Engineering', 'Electronics and Communication', 'Mechanical Engineering'],
    countries: ['India', 'United States', 'Germany', 'Canada', 'United Kingdom'],
    sectors: ['IT Services', 'Product', 'Consulting', 'Finance', 'Manufacturing'],
    categories: ['High Value', 'Top Employer', 'Global Alumni', 'General Alumni'],
  } as DirectoryFilterOptions;
}

export async function searchDirectoryFilterOptions(): Promise<string[]> {
  return ['Amazon', 'Accenture', 'Adobe'];
}

export async function fetchFilteredAlumniForExport(): Promise<ExportResult> {
  return { records: ALUMNI, totalCount: 6472, totalAvailable: 6472, isCapped: false } as unknown as ExportResult;
}

export async function saveAlumnusRecord(_id: any, data: any) {
  return { ...ALUMNI[0], ...data } as AlumnusRow;
}

export async function markAlumnusVerified(_id: string, confidence?: string) {
  return { ...ALUMNI[0], needs_verification: false, data_confidence: confidence ?? 'High' } as AlumnusRow;
}
