CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at=NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE public.profiles (
 id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 email TEXT,
 full_name TEXT,
 role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN('admin','viewer')),
 is_active BOOLEAN NOT NULL DEFAULT true,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION private.is_authenticated_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path=''
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id=auth.uid() AND is_active=true
  );
$$;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path=''
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id=auth.uid()
      AND role='admin'
      AND is_active=true
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $$
BEGIN
  INSERT INTO public.profiles(id,email,full_name,role,is_active)
  VALUES(
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    'viewer',
    true
  )
  ON CONFLICT(id)
  DO UPDATE SET
    email=EXCLUDED.email,
    updated_at=NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.import_jobs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 filename TEXT NOT NULL,
 mode TEXT NOT NULL CHECK(mode IN('merge','full_replace')),
 status TEXT NOT NULL DEFAULT 'pending'
   CHECK(status IN(
     'pending','validating','ready','running',
     'completed','failed','cancelled'
   )),
 total_rows INTEGER NOT NULL DEFAULT 0,
 valid_rows INTEGER NOT NULL DEFAULT 0,
 invalid_rows INTEGER NOT NULL DEFAULT 0,
 new_records INTEGER NOT NULL DEFAULT 0,
 updated_records INTEGER NOT NULL DEFAULT 0,
 duplicate_rows INTEGER NOT NULL DEFAULT 0,
 possible_duplicate_rows INTEGER NOT NULL DEFAULT 0,
 error_rows INTEGER NOT NULL DEFAULT 0,
 uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
 started_at TIMESTAMPTZ,
 completed_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_import_jobs_updated_at
BEFORE UPDATE ON public.import_jobs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.alumni (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 name TEXT NOT NULL,
 name_normalized TEXT NOT NULL,
 current_company TEXT,
 current_company_normalized TEXT,
 current_designation TEXT,
 designation_normalized TEXT,
 company_sector TEXT,
 city TEXT,
 city_normalized TEXT,
 country TEXT,
 country_code TEXT,
 email TEXT,
 alternate_emails TEXT[] NOT NULL DEFAULT '{}',
 email_normalized TEXT,
 mobile TEXT,
 mobile_normalized TEXT,
 mobile_valid BOOLEAN NOT NULL DEFAULT false,
 joining_year INTEGER,
 leaving_year INTEGER,
 branch_or_designation_raw TEXT,
 academic_branch TEXT,
 rnsit_role TEXT,
 profile_link TEXT,
 profile_link_normalized TEXT,
 linkedin_url TEXT,
 is_high_value BOOLEAN NOT NULL DEFAULT false,
 is_top_employer BOOLEAN NOT NULL DEFAULT false,
 is_global BOOLEAN NOT NULL DEFAULT false,
 is_student_or_rnsit BOOLEAN NOT NULL DEFAULT false,
 needs_verification BOOLEAN NOT NULL DEFAULT false,
 primary_category TEXT GENERATED ALWAYS AS(
   CASE
     WHEN is_high_value THEN 'high_value'
     WHEN is_top_employer THEN 'top_employer'
     WHEN is_global THEN 'global'
     WHEN is_student_or_rnsit THEN 'student_or_rnsit'
     ELSE 'general'
   END
 ) STORED,
 value_score INTEGER,
 status TEXT,
 data_confidence TEXT DEFAULT 'unverified'
   CHECK(
     data_confidence IS NULL OR
     data_confidence IN('high','medium','low','unverified')
   ),
 notes TEXT,
 source_workbook TEXT,
 source_sheet TEXT,
 last_import_job_id UUID
   REFERENCES public.import_jobs(id)
   ON DELETE SET NULL,
 last_verified_at TIMESTAMPTZ,
 search_vector tsvector,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

 CONSTRAINT chk_joining_year_range
   CHECK(joining_year IS NULL OR joining_year BETWEEN 1900 AND 2100),

 CONSTRAINT chk_leaving_year_range
   CHECK(leaving_year IS NULL OR leaving_year BETWEEN 1900 AND 2100),

 CONSTRAINT chk_year_order
   CHECK(
     joining_year IS NULL OR
     leaving_year IS NULL OR
     leaving_year>=joining_year
   )
);

CREATE TRIGGER set_alumni_updated_at
BEFORE UPDATE ON public.alumni
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.alumni_search_vector_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple',COALESCE(NEW.name,'')),'A') ||
    setweight(to_tsvector('simple',COALESCE(NEW.current_company,'')),'A') ||
    setweight(to_tsvector('simple',COALESCE(NEW.current_designation,'')),'B') ||
    setweight(to_tsvector('simple',COALESCE(NEW.academic_branch,'')),'B') ||
    setweight(to_tsvector('simple',COALESCE(NEW.company_sector,'')),'C') ||
    setweight(to_tsvector('simple',COALESCE(NEW.city,'')),'C') ||
    setweight(to_tsvector('simple',COALESCE(NEW.country,'')),'C') ||
    setweight(to_tsvector('simple',COALESCE(NEW.branch_or_designation_raw,'')),'D');

  RETURN NEW;
END;
$$;

CREATE TRIGGER alumni_search_vector_trigger
BEFORE INSERT OR UPDATE ON public.alumni
FOR EACH ROW
EXECUTE FUNCTION public.alumni_search_vector_update();

CREATE TABLE public.import_staging_rows(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 import_job_id UUID NOT NULL
   REFERENCES public.import_jobs(id) ON DELETE CASCADE,
 sheet_name TEXT,
 row_number INTEGER,
 raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
 staged_alumni JSONB NOT NULL DEFAULT '{}'::jsonb,
 identity_fingerprint TEXT,
 matched_alumni_id UUID
   REFERENCES public.alumni(id) ON DELETE SET NULL,
 staging_status TEXT NOT NULL DEFAULT 'pending'
   CHECK(staging_status IN(
     'pending','valid','invalid','duplicate_exact',
     'duplicate_ambiguous','imported','skipped'
   )),
 validation_errors JSONB DEFAULT '[]'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_import_staging_rows_updated_at
BEFORE UPDATE ON public.import_staging_rows
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.import_errors(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 import_job_id UUID NOT NULL
   REFERENCES public.import_jobs(id) ON DELETE CASCADE,
 sheet_name TEXT,
 row_number INTEGER,
 field_name TEXT,
 error_code TEXT,
 message TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.duplicate_candidates(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 import_job_id UUID
   REFERENCES public.import_jobs(id) ON DELETE SET NULL,
 existing_alumni_id UUID NOT NULL
   REFERENCES public.alumni(id) ON DELETE CASCADE,
 candidate_staging_row_id UUID
   REFERENCES public.import_staging_rows(id) ON DELETE CASCADE,
 candidate_alumni_id UUID
   REFERENCES public.alumni(id) ON DELETE SET NULL,
 match_reason TEXT NOT NULL,
 match_score NUMERIC(5,2),
 status TEXT NOT NULL DEFAULT 'pending'
   CHECK(status IN(
     'pending','same_person','different_people','ignored'
   )),
 reviewed_by UUID
   REFERENCES auth.users(id) ON DELETE SET NULL,
 reviewed_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

 CONSTRAINT chk_duplicate_candidate_target
   CHECK(
     candidate_staging_row_id IS NOT NULL
     OR candidate_alumni_id IS NOT NULL
   )
);

CREATE TRIGGER set_duplicate_candidates_updated_at
BEFORE UPDATE ON public.duplicate_candidates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_alumni_name_normalized
ON public.alumni(name_normalized);

CREATE INDEX idx_alumni_company_normalized
ON public.alumni(current_company_normalized);

CREATE INDEX idx_alumni_designation_normalized
ON public.alumni(designation_normalized);

CREATE INDEX idx_alumni_email_normalized
ON public.alumni(email_normalized);

CREATE INDEX idx_alumni_profile_link_normalized
ON public.alumni(profile_link_normalized);

CREATE INDEX idx_alumni_academic
ON public.alumni(academic_branch,leaving_year);

CREATE INDEX idx_alumni_years
ON public.alumni(joining_year,leaving_year);

CREATE INDEX idx_alumni_joining_year
ON public.alumni(joining_year);

CREATE INDEX idx_alumni_leaving_year
ON public.alumni(leaving_year);

CREATE INDEX idx_alumni_location
ON public.alumni(country_code,city_normalized);

CREATE INDEX idx_alumni_primary_category
ON public.alumni(primary_category);

CREATE INDEX idx_alumni_last_import_job_id
ON public.alumni(last_import_job_id);

CREATE INDEX idx_alumni_high_value
ON public.alumni(id)
WHERE is_high_value=true;

CREATE INDEX idx_alumni_top_employer
ON public.alumni(id)
WHERE is_top_employer=true;

CREATE INDEX idx_alumni_global
ON public.alumni(id)
WHERE is_global=true;

CREATE INDEX idx_alumni_student_rnsit
ON public.alumni(id)
WHERE is_student_or_rnsit=true;

CREATE INDEX idx_alumni_needs_verification
ON public.alumni(id)
WHERE needs_verification=true;

CREATE INDEX idx_alumni_name_trgm
ON public.alumni USING gin(name gin_trgm_ops);

CREATE INDEX idx_alumni_company_trgm
ON public.alumni USING gin(current_company gin_trgm_ops);

CREATE INDEX idx_alumni_designation_trgm
ON public.alumni USING gin(current_designation gin_trgm_ops);

CREATE INDEX idx_alumni_city_trgm
ON public.alumni USING gin(city gin_trgm_ops);

CREATE INDEX idx_alumni_search_vector
ON public.alumni USING gin(search_vector);

CREATE INDEX idx_staging_job_status
ON public.import_staging_rows(import_job_id,staging_status);

CREATE INDEX idx_duplicate_candidates_status
ON public.duplicate_candidates(status);

REVOKE ALL ON SCHEMA private FROM PUBLIC,anon;

REVOKE EXECUTE
ON FUNCTION private.is_authenticated_user()
FROM PUBLIC,anon;

REVOKE EXECUTE
ON FUNCTION private.is_admin()
FROM PUBLIC,anon;

GRANT USAGE ON SCHEMA private TO authenticated;

GRANT EXECUTE
ON FUNCTION private.is_authenticated_user()
TO authenticated;

GRANT EXECUTE
ON FUNCTION private.is_admin()
TO authenticated;

REVOKE ALL ON ALL TABLES IN SCHEMA public
FROM anon,PUBLIC;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public
FROM anon,PUBLIC;

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT,INSERT,UPDATE,DELETE
ON public.profiles,
   public.alumni,
   public.import_jobs,
   public.import_staging_rows,
   public.import_errors,
   public.duplicate_candidates
TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_staging_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicate_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read own profile or admin read all"
ON public.profiles
FOR SELECT
TO authenticated
USING(
  id=(SELECT auth.uid())
  OR (SELECT private.is_admin())
);

CREATE POLICY "Allow admin full manage access to profiles"
ON public.profiles
FOR ALL
TO authenticated
USING((SELECT private.is_admin()))
WITH CHECK((SELECT private.is_admin()));

CREATE POLICY "Allow authenticated active users to view alumni"
ON public.alumni
FOR SELECT
TO authenticated
USING((SELECT private.is_authenticated_user()));

CREATE POLICY "Allow admins to insert alumni"
ON public.alumni
FOR INSERT
TO authenticated
WITH CHECK((SELECT private.is_admin()));

CREATE POLICY "Allow admins to update alumni"
ON public.alumni
FOR UPDATE
TO authenticated
USING((SELECT private.is_admin()))
WITH CHECK((SELECT private.is_admin()));

CREATE POLICY "Allow admins to delete alumni"
ON public.alumni
FOR DELETE
TO authenticated
USING((SELECT private.is_admin()));

CREATE POLICY "Allow admins full access to import jobs"
ON public.import_jobs
FOR ALL
TO authenticated
USING((SELECT private.is_admin()))
WITH CHECK((SELECT private.is_admin()));

CREATE POLICY "Allow admins full access to import staging rows"
ON public.import_staging_rows
FOR ALL
TO authenticated
USING((SELECT private.is_admin()))
WITH CHECK((SELECT private.is_admin()));

CREATE POLICY "Allow admins full access to import errors"
ON public.import_errors
FOR ALL
TO authenticated
USING((SELECT private.is_admin()))
WITH CHECK((SELECT private.is_admin()));

CREATE POLICY "Allow admins full access to duplicate candidates"
ON public.duplicate_candidates
FOR ALL
TO authenticated
USING((SELECT private.is_admin()))
WITH CHECK((SELECT private.is_admin()));

CREATE VIEW public.view_high_value_alumni
WITH(security_invoker=true)
AS
SELECT * FROM public.alumni
WHERE is_high_value=true;

CREATE VIEW public.view_top_employer_alumni
WITH(security_invoker=true)
AS
SELECT * FROM public.alumni
WHERE is_top_employer=true;

CREATE VIEW public.view_global_alumni
WITH(security_invoker=true)
AS
SELECT * FROM public.alumni
WHERE is_global=true;

CREATE VIEW public.view_student_alumni
WITH(security_invoker=true)
AS
SELECT * FROM public.alumni
WHERE is_student_or_rnsit=true;

CREATE VIEW public.view_needs_verification_alumni
WITH(security_invoker=true)
AS
SELECT * FROM public.alumni
WHERE needs_verification=true;

GRANT SELECT
ON public.view_high_value_alumni,
   public.view_top_employer_alumni,
   public.view_global_alumni,
   public.view_student_alumni,
   public.view_needs_verification_alumni
TO authenticated;
