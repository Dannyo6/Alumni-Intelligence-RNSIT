// Preview-only stand-in for the data quality service.
export * from '../../services/dataQualityService';
import type { DataQualityMetrics, QualityRecordsResult, BranchReportRow } from '../../services/dataQualityService';
import { QUALITY_METRICS, QUALITY_RECORDS, BRANCH_REPORT } from '../fixtures';

export async function fetchDataQualityMetrics(): Promise<DataQualityMetrics> {
  return QUALITY_METRICS;
}

export async function fetchQualityRecords(): Promise<QualityRecordsResult> {
  return { records: QUALITY_RECORDS, totalCount: 517 };
}

export async function fetchBranchNormalizationReport(): Promise<BranchReportRow[]> {
  return BRANCH_REPORT;
}
