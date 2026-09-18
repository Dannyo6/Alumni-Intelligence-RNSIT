/**
 * Legacy Sync Service - Disabled
 * Direct browser sync writes to public.alumni or legacy sync_history are blocked.
 */

export interface SyncExecutionResult {
  success: boolean;
  message: string;
  insertedCount: number;
  updatedCount: number;
  failedCount: number;
}

export const executeSync = async (): Promise<SyncExecutionResult> => {
  throw new Error('Legacy sync workflow is disabled in Schema v1. Use the new staging pipeline.');
};
