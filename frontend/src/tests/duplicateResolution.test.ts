import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveDuplicateCandidate } from '../services/adminService';
import { supabase } from '../utils/supabase';

// Mock supabase client
vi.mock('../utils/supabase', () => {
  return {
    supabase: {
      rpc: vi.fn(),
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(),
            })),
          })),
        })),
      })),
    },
  };
});

describe('Phase 10E.1 - Governed Duplicate Mutation Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. duplicate resolution invokes admin_resolve_duplicate_candidate', async () => {
    (supabase.rpc as any).mockResolvedValue({ data: { success: true }, error: null });

    await resolveDuplicateCandidate('dup-123', 'same_person');

    expect(supabase.rpc).toHaveBeenCalledWith('admin_resolve_duplicate_candidate', {
      p_candidate_id: 'dup-123',
      p_resolution: 'same_person',
    });
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('2. RPC failure does NOT call direct duplicate_candidates update and 3. RPC failure propagates as failure', async () => {
    const mockError = new Error('RPC Failed');
    (supabase.rpc as any).mockResolvedValue({ data: null, error: mockError });

    await expect(resolveDuplicateCandidate('dup-123', 'different_people')).rejects.toThrow('RPC Failed');
    
    expect(supabase.rpc).toHaveBeenCalledWith('admin_resolve_duplicate_candidate', {
      p_candidate_id: 'dup-123',
      p_resolution: 'different_people',
    });
    // Ensure fallback is NOT called
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('4. successful RPC behavior remains unchanged', async () => {
    const mockData = { id: 'dup-123', status: 'ignored' };
    (supabase.rpc as any).mockResolvedValue({ data: mockData, error: null });

    const result = await resolveDuplicateCandidate('dup-123', 'ignored');
    
    expect(result).toEqual(mockData);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('5. reset-to-pending still uses the RPC', async () => {
    (supabase.rpc as any).mockResolvedValue({ data: { success: true }, error: null });

    await resolveDuplicateCandidate('dup-123', 'pending');

    expect(supabase.rpc).toHaveBeenCalledWith('admin_resolve_duplicate_candidate', {
      p_candidate_id: 'dup-123',
      p_resolution: 'pending',
    });
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('6. no false success/cache mutation occurs after RPC failure', async () => {
    // If the function throws on RPC failure, it cannot return a false success
    // This is implicitly tested by test #2 and #3, but let's confirm the promise rejects
    const mockError = { message: 'Database error', code: '500' };
    (supabase.rpc as any).mockResolvedValue({ data: { status: 'success' }, error: mockError });

    try {
      await resolveDuplicateCandidate('dup-123', 'same_person');
      expect.fail('Should have thrown an error');
    } catch (e) {
      expect(e).toEqual(mockError);
    }
    
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
