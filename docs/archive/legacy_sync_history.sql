-- ==============================================================================
-- ARCHIVED PROTOTYPE SQL - DO NOT RUN AGAINST PRODUCTION
-- ==============================================================================
-- This file contains legacy prototype sync history definitions and is preserved for
-- reference only. Production uses Supabase Schema v1 (public.import_jobs, etc.).
-- ==============================================================================

-- Add unique alumni_id to existing alumni table
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS alumni_id TEXT UNIQUE;

-- Create sync_history table for auditing
CREATE TABLE IF NOT EXISTS public.sync_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sync_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    uploaded_by UUID REFERENCES auth.users(id),
    file_name TEXT NOT NULL,
    total_rows INTEGER NOT NULL DEFAULT 0,
    inserted_count INTEGER NOT NULL DEFAULT 0,
    updated_count INTEGER NOT NULL DEFAULT 0,
    unchanged_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL
);

-- Add Row Level Security for sync_history
ALTER TABLE public.sync_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync history" ON public.sync_history 
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can insert sync history" ON public.sync_history 
    FOR INSERT WITH CHECK (public.is_admin());
