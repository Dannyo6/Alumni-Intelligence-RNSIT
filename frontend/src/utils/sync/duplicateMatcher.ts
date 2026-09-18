import type { Database } from '../../types/supabase';
import type { AlumnusInsert } from '../excelImport';

type AlumnusRow = Database['public']['Tables']['alumni']['Row'];

export type MatchConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface MatchResult {
  matchFound: boolean;
  matchedRecord: AlumnusRow | null;
  confidence: MatchConfidence;
  factors: string[];
}

export const matchRecord = (
  normalizedRow: Partial<AlumnusInsert>,
  existingRecords: AlumnusRow[]
): MatchResult => {
  // 1. Exact Profile URL Match (High Confidence)
  if (normalizedRow.profile_link) {
    const profileMatch = existingRecords.find(
      r => r.profile_link === normalizedRow.profile_link
    );
    if (profileMatch) {
      return { 
        matchFound: true, 
        matchedRecord: profileMatch, 
        confidence: 'HIGH', 
        factors: ['Exact Profile URL'] 
      };
    }
  }

  // 2. Exact Normalized Email Match (High Confidence)
  if (normalizedRow.email) {
    const emailMatch = existingRecords.find(
      r => r.email?.toLowerCase().trim() === normalizedRow.email?.toLowerCase().trim()
    );
    if (emailMatch) {
      return { 
        matchFound: true, 
        matchedRecord: emailMatch, 
        confidence: 'HIGH', 
        factors: ['Exact Email'] 
      };
    }
  }

  // 3. Composite Identity Match & Scoring
  if (normalizedRow.name) {
    const nameStr = normalizedRow.name.toLowerCase().trim();
    let bestCandidate: AlumnusRow | null = null;
    let bestScore = 0;
    let bestFactors: string[] = [];

    for (const record of existingRecords) {
      const dbNameStr = record.name.toLowerCase().trim();
      let score = 0;
      const factors: string[] = [];
      
      if (dbNameStr === nameStr) {
        score += 40;
        factors.push('Name');
      } else {
        continue;
      }

      if (normalizedRow.joining_year && normalizedRow.joining_year === record.joining_year) {
        score += 20;
        factors.push('Joining Year');
      }
      if (normalizedRow.leaving_year && normalizedRow.leaving_year === record.leaving_year) {
        score += 20;
        factors.push('Leaving Year');
      }
      const rawBranch = normalizedRow.academic_branch || normalizedRow.branch_or_designation_raw;
      const recordBranch = record.academic_branch || record.branch_or_designation_raw;
      if (rawBranch && recordBranch && rawBranch.toLowerCase().trim() === recordBranch.toLowerCase().trim()) {
        score += 20;
        factors.push('Branch');
      }

      if (normalizedRow.current_company && record.current_company && normalizedRow.current_company.toLowerCase().trim() === record.current_company.toLowerCase().trim()) {
        score += 10;
        factors.push('Company');
      }
      if (normalizedRow.current_designation && record.current_designation && normalizedRow.current_designation.toLowerCase().trim() === record.current_designation.toLowerCase().trim()) {
        score += 10;
        factors.push('Designation');
      }
      if (normalizedRow.city && record.city && normalizedRow.city.toLowerCase().trim() === record.city.toLowerCase().trim()) {
        score += 10;
        factors.push('City');
      }

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = record;
        bestFactors = factors;
      }
    }

    if (bestCandidate) {
      if (bestScore >= 90) {
        return { matchFound: true, matchedRecord: bestCandidate, confidence: 'HIGH', factors: bestFactors };
      }
      if (bestScore >= 60) {
        return { matchFound: true, matchedRecord: bestCandidate, confidence: 'MEDIUM', factors: bestFactors };
      }
      if (bestScore > 40) {
        return { matchFound: true, matchedRecord: bestCandidate, confidence: 'LOW', factors: bestFactors };
      }
    }
  }

  return { matchFound: false, matchedRecord: null, confidence: 'NONE', factors: [] };
};
