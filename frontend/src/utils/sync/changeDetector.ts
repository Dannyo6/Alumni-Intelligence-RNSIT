import type { Database } from '../../types/supabase';
import type { AlumnusInsert } from '../excelImport';
import { matchRecord } from './duplicateMatcher';
import type { MatchConfidence } from './duplicateMatcher';

type AlumnusRow = Database['public']['Tables']['alumni']['Row'];

export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface SyncAction {
  action: 'insert' | 'update' | 'review' | 'unchanged' | 'error';
  confidence: MatchConfidence;
  factors: string[];
  record: Partial<AlumnusInsert>;
  existingId?: string;
  changes: FieldChange[];
  errorReason?: string;
}

export const detectChanges = (
  normalizedData: Partial<AlumnusInsert>[],
  existingRecords: AlumnusRow[]
): SyncAction[] => {
  const actions: SyncAction[] = [];
  
  // We no longer strictly fail on duplicate alumni_id. Instead, we can flag if multiple rows in excel resolve to the same person.
  // Actually, keeping a simple seen set is fine if alumni_id exists. But since alumni_id is NOT mandatory anymore,
  // we just iterate rows. If multiple excel rows match the same DB record, the 2nd one will technically
  // try to update the same record. We should probably just process them.

  for (const row of normalizedData) {
    if (!row.name) {
      actions.push({ action: 'error', record: row, changes: [], confidence: 'NONE', factors: [], errorReason: 'Missing name' });
      continue;
    }

    const match = matchRecord(row, existingRecords);

    if (!match.matchFound || !match.matchedRecord) {
      actions.push({ action: 'insert', record: row, changes: [], confidence: 'NONE', factors: [] });
    } else {
      const existing = match.matchedRecord;
      const changes: FieldChange[] = [];
      const updatedRecord: Partial<AlumnusInsert> = {};

      const keysToCheck = Object.keys(row) as Array<keyof typeof row>;
      
      for (const key of keysToCheck) {
        const excelVal = row[key];
        const dbVal = existing[key as keyof AlumnusRow];
        
        if (excelVal !== null && excelVal !== undefined && excelVal !== dbVal) {
          changes.push({
            field: key,
            oldValue: dbVal,
            newValue: excelVal
          });
          (updatedRecord as any)[key] = excelVal;
        }
      }

      // Important: preserve id for updates
      const actionRecord = { ...updatedRecord, id: existing.id };

      if (changes.length > 0) {
        if (match.confidence === 'HIGH') {
          actions.push({
            action: 'update',
            confidence: match.confidence,
            factors: match.factors,
            record: actionRecord,
            existingId: existing.id,
            changes
          });
        } else {
          actions.push({
            action: 'review',
            confidence: match.confidence,
            factors: match.factors,
            record: actionRecord,
            existingId: existing.id,
            changes
          });
        }
      } else {
        actions.push({
          action: 'unchanged',
          confidence: match.confidence,
          factors: match.factors,
          record: row,
          existingId: existing.id,
          changes: []
        });
      }
    }
  }

  return actions;
};
