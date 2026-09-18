-- ==============================================================================
-- ARCHIVED PROTOTYPE SQL - DO NOT RUN AGAINST PRODUCTION
-- ==============================================================================
-- This file contains legacy prototype schema definitions and is preserved for
-- reference only. Production uses Supabase Schema v1 (public.profiles, public.alumni,
-- public.import_jobs, etc.).
-- ==============================================================================

-- Enable the "pgcrypto" extension for UUID generation if not available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create the primary 'alumni' table
CREATE TABLE IF NOT EXISTS public.alumni (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Personal Information
    name TEXT NOT NULL,
    email TEXT,
    mobile TEXT,
    
    -- Professional Information
    current_company TEXT,
    current_designation TEXT,
    company_sector TEXT,
    
    -- Location
    city TEXT,
    country TEXT,
    
    -- Academic Information
    joining_year INTEGER,
    leaving_year INTEGER,
    branch TEXT,
    
    -- Social & Links
    profile_link TEXT,
    linkedin_url TEXT,
    
    -- Classification
    category TEXT,
    value_score INTEGER DEFAULT 0,
    status TEXT,
    source TEXT,
    
    -- Flags/Categories
    is_high_value BOOLEAN DEFAULT false,
    is_global BOOLEAN DEFAULT false,
    is_top_employer BOOLEAN DEFAULT false,
    needs_verification BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_verified_at TIMESTAMP WITH TIME ZONE,
    data_confidence TEXT,
    notes TEXT
);

-- Ensure updated_at updates automatically via a trigger
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.alumni;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.alumni
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Row Level Security (RLS)
ALTER TABLE public.alumni ENABLE ROW LEVEL SECURITY;

-- Policies for alumni table
-- 1. Anyone authenticated can READ (SELECT)
CREATE POLICY "Authenticated users can view alumni" 
ON public.alumni FOR SELECT 
TO authenticated 
USING (true);

CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'VIEWER', -- 'ADMIN' or 'VIEWER'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Admin users can read their own role
CREATE POLICY "Users can read own role" 
ON public.admin_users FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for CUD based on is_admin()
CREATE POLICY "Admins can insert alumni" 
ON public.alumni FOR INSERT 
TO authenticated 
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update alumni" 
ON public.alumni FOR UPDATE 
TO authenticated 
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete alumni" 
ON public.alumni FOR DELETE 
TO authenticated 
USING (public.is_admin());

-- Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_alumni_name ON public.alumni(name);
CREATE INDEX IF NOT EXISTS idx_alumni_company ON public.alumni(current_company);
CREATE INDEX IF NOT EXISTS idx_alumni_designation ON public.alumni(current_designation);
CREATE INDEX IF NOT EXISTS idx_alumni_joining_year ON public.alumni(joining_year);
CREATE INDEX IF NOT EXISTS idx_alumni_leaving_year ON public.alumni(leaving_year);
CREATE INDEX IF NOT EXISTS idx_alumni_branch ON public.alumni(branch);
CREATE INDEX IF NOT EXISTS idx_alumni_country ON public.alumni(country);
CREATE INDEX IF NOT EXISTS idx_alumni_category ON public.alumni(category);

-- Text search index (using gin) on name and company
CREATE INDEX IF NOT EXISTS idx_alumni_text_search 
ON public.alumni 
USING GIN (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(current_company, '') || ' ' || coalesce(current_designation, '')));
