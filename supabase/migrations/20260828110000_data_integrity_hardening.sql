-- ==============================================================================
-- Migration: Phase 10C Data Integrity Hardening
-- Description: Adds defensive constraints for strings, timestamps, and relations.
--              Each constraint is added as NOT VALID to avoid lock contention
--              and immediately validated.
-- ==============================================================================

-- 1. Enforce Non-Empty Strings (Optional fields should use NULL, not '')
ALTER TABLE public.alumni 
  ADD CONSTRAINT chk_alumni_name_not_empty 
  CHECK (TRIM(name) <> '') NOT VALID;

ALTER TABLE public.alumni 
  VALIDATE CONSTRAINT chk_alumni_name_not_empty;

ALTER TABLE public.alumni 
  ADD CONSTRAINT chk_alumni_email_not_empty 
  CHECK (email IS NULL OR TRIM(email) <> '') NOT VALID;

ALTER TABLE public.alumni 
  VALIDATE CONSTRAINT chk_alumni_email_not_empty;

ALTER TABLE public.alumni 
  ADD CONSTRAINT chk_alumni_mobile_not_empty 
  CHECK (mobile IS NULL OR TRIM(mobile) <> '') NOT VALID;

ALTER TABLE public.alumni 
  VALIDATE CONSTRAINT chk_alumni_mobile_not_empty;

ALTER TABLE public.alumni 
  ADD CONSTRAINT chk_alumni_company_not_empty 
  CHECK (current_company IS NULL OR TRIM(current_company) <> '') NOT VALID;

ALTER TABLE public.alumni 
  VALIDATE CONSTRAINT chk_alumni_company_not_empty;

-- 2. Timestamp Sanity Checks
-- Prevent logically impossible time travel states.
ALTER TABLE public.alumni
  ADD CONSTRAINT chk_alumni_timestamps 
  CHECK (updated_at >= created_at) NOT VALID;

ALTER TABLE public.alumni
  VALIDATE CONSTRAINT chk_alumni_timestamps;

ALTER TABLE public.import_jobs
  ADD CONSTRAINT chk_import_jobs_timestamps 
  CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at) NOT VALID;

ALTER TABLE public.import_jobs
  VALIDATE CONSTRAINT chk_import_jobs_timestamps;

ALTER TABLE public.profiles
  ADD CONSTRAINT chk_profiles_timestamps 
  CHECK (updated_at >= created_at) NOT VALID;

ALTER TABLE public.profiles
  VALIDATE CONSTRAINT chk_profiles_timestamps;

-- 3. Prevent Self-Referencing Duplicate Candidates
-- A canonical row cannot be a duplicate of itself.
ALTER TABLE public.duplicate_candidates
  ADD CONSTRAINT chk_duplicate_candidate_not_self 
  CHECK (candidate_alumni_id IS NULL OR existing_alumni_id <> candidate_alumni_id) NOT VALID;

ALTER TABLE public.duplicate_candidates
  VALIDATE CONSTRAINT chk_duplicate_candidate_not_self;
