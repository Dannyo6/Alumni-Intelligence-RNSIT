-- Phase 10A.6: Admin-Only Authorization Architecture (Corrected)

-- 1. Migrate Existing Viewers
UPDATE public.profiles 
SET is_active = false, role = 'admin' 
WHERE role = 'viewer';

-- 2. New User Creation (Default to Inactive)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $$
BEGIN
  INSERT INTO public.profiles(id, email, full_name, role, is_active)
  VALUES(
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    'admin',
    false
  )
  ON CONFLICT(id)
  DO UPDATE SET
    email=EXCLUDED.email,
    updated_at=NOW();

  RETURN NEW;
END;
$$;

-- 3. Remove Direct Profile Mutation Bypass
-- Drop the "Allow admin full manage access to profiles" policy or any broad modification policy
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow admin full manage access to profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Allow users to view own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Allow admins to view all profiles" ON public.profiles;
END $$;

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND role = 'admin' 
      AND is_active = TRUE
  );
$$;

CREATE POLICY "Allow users to read their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Allow admins to view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (private.is_admin());

-- 4. Unified RLS on Alumni
DROP POLICY IF EXISTS "Allow authenticated active users to view alumni" ON public.alumni;

CREATE POLICY "Allow admins to view alumni"
ON public.alumni
FOR SELECT
TO authenticated
USING (private.is_admin());

-- 5. Hardened Admin RPCs

-- 5A. admin_update_user_profile (3 args)
CREATE OR REPLACE FUNCTION public.admin_update_user_profile(
    p_user_id UUID,
    p_role TEXT,
    p_is_active BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_target public.profiles%ROWTYPE;
    v_updated public.profiles%ROWTYPE;
    v_admin_count INTEGER;
BEGIN
    -- Authorization Guard
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin authorization required';
    END IF;

    -- Strict role enum validation (viewer removed)
    IF p_role != 'admin' THEN
        RAISE EXCEPTION 'Invalid role: must be admin';
    END IF;

    -- Fetch target profile
    SELECT * INTO v_target
    FROM public.profiles
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;

    -- Final Active Admin Guard
    IF v_target.role = 'admin' AND v_target.is_active = TRUE AND (p_role != 'admin' OR p_is_active = FALSE) THEN
        -- Advisory Lock to prevent concurrent deactivations
        PERFORM pg_catalog.pg_advisory_xact_lock(84729185721901);
        
        SELECT count(*) INTO v_admin_count
        FROM public.profiles
        WHERE role = 'admin' AND is_active = TRUE;

        IF v_admin_count <= 1 THEN
            RAISE EXCEPTION 'Cannot deactivate or change role of the last active administrator';
        END IF;
    END IF;

    -- Update profile
    UPDATE public.profiles
    SET role = p_role,
        is_active = p_is_active,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING * INTO v_updated;

    RETURN row_to_json(v_updated);
END;
$$;

-- 5B. admin_update_user_name
CREATE OR REPLACE FUNCTION public.admin_update_user_name(
    p_user_id UUID,
    p_full_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_target public.profiles%ROWTYPE;
    v_updated public.profiles%ROWTYPE;
    v_cleaned_name TEXT;
BEGIN
    -- Authorization Guard
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin authorization required';
    END IF;

    v_cleaned_name := TRIM(p_full_name);
    IF v_cleaned_name IS NULL OR v_cleaned_name = '' THEN
        RAISE EXCEPTION 'Invalid full name: cannot be empty';
    END IF;

    -- Fetch target profile
    SELECT * INTO v_target
    FROM public.profiles
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;

    -- Update profile name
    UPDATE public.profiles
    SET full_name = v_cleaned_name,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING * INTO v_updated;

    RETURN row_to_json(v_updated);
END;
$$;

-- 5C. admin_get_audit_summary (Retain exact keys)
CREATE OR REPLACE FUNCTION public.admin_get_audit_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_total_users INTEGER;
    v_admin_users INTEGER;
    v_viewer_users INTEGER;
    v_active_users INTEGER;
    v_total_import_jobs INTEGER;
    v_completed_import_jobs INTEGER;
    v_total_duplicates INTEGER;
    v_pending_duplicates INTEGER;
    v_resolved_duplicates INTEGER;
    v_verified_alumni INTEGER;
    v_unverified_alumni INTEGER;
    v_recent_verifications JSON;
BEGIN
    -- Authorization Guard
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin authorization required';
    END IF;

    SELECT COUNT(*), 
           COUNT(*) FILTER (WHERE role = 'admin'), 
           COUNT(*) FILTER (WHERE role = 'viewer'),
           COUNT(*) FILTER (WHERE is_active = TRUE)
    INTO v_total_users, v_admin_users, v_viewer_users, v_active_users
    FROM public.profiles;

    SELECT COUNT(*), 
           COUNT(*) FILTER (WHERE status = 'completed')
    INTO v_total_import_jobs, v_completed_import_jobs
    FROM public.import_jobs;

    SELECT COUNT(*), 
           COUNT(*) FILTER (WHERE status IS NULL OR status = 'pending'),
           COUNT(*) FILTER (WHERE status IN ('same_person', 'different_people', 'ignored'))
    INTO v_total_duplicates, v_pending_duplicates, v_resolved_duplicates
    FROM public.duplicate_candidates;

    SELECT COUNT(*) FILTER (WHERE needs_verification = FALSE AND last_verified_at IS NOT NULL),
           COUNT(*) FILTER (WHERE needs_verification = TRUE)
    INTO v_verified_alumni, v_unverified_alumni
    FROM public.alumni;

    SELECT json_agg(row_to_json(v)) INTO v_recent_verifications
    FROM (
        SELECT id, name, current_company, current_designation, academic_branch, leaving_year, last_verified_at, data_confidence
        FROM public.alumni
        WHERE last_verified_at IS NOT NULL
        ORDER BY last_verified_at DESC
        LIMIT 10
    ) v;

    RETURN json_build_object(
        'total_users', v_total_users,
        'admin_users', v_admin_users,
        'viewer_users', v_viewer_users,
        'active_users', v_active_users,
        'total_import_jobs', v_total_import_jobs,
        'completed_import_jobs', v_completed_import_jobs,
        'total_duplicates', v_total_duplicates,
        'pending_duplicates', v_pending_duplicates,
        'resolved_duplicates', v_resolved_duplicates,
        'verified_alumni', v_verified_alumni,
        'unverified_alumni', v_unverified_alumni,
        'recent_verifications', COALESCE(v_recent_verifications, '[]'::JSON)
    );
END;
$$;


-- 6. Stale Legacy Function Cleanup
-- explicitly avoid cascade
DROP FUNCTION IF EXISTS private.is_authenticated_user();
DROP FUNCTION IF EXISTS public.is_admin();
-- Drop the overloaded 4-arg function if it exists from previous attempts
DROP FUNCTION IF EXISTS public.admin_update_user_profile(UUID, TEXT, BOOLEAN, TEXT);


-- 7. Role Constraint Replacement
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role = 'admin');

-- 8. Explicit Security Grants and Revocations
REVOKE ALL ON FUNCTION public.admin_update_user_profile(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_profile(UUID, TEXT, BOOLEAN) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_update_user_name(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_name(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_get_audit_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_audit_summary() TO authenticated;
