-- ==============================================================================
-- Migration: Institutional / Admin Operations (Schema v1 — Phase 8)
-- Description: Adds secure server-side administrative RPCs for user access
-- management, import history review, duplicate resolution, verification queue,
-- and operational audit reporting aligned strictly with LIVE Schema v1.
-- All functions are SECURITY DEFINER with SET search_path = '' and fully-qualified names.
-- All functions verify caller has active admin role before executing.
-- ==============================================================================

-- ============================================================
-- 1. Admin Users List RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS TABLE (
    id UUID,
    role TEXT,
    is_active BOOLEAN,
    full_name TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Authorization Guard
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin authorization required';
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        p.role,
        p.is_active,
        p.full_name,
        p.email,
        p.created_at,
        p.updated_at
    FROM public.profiles p
    ORDER BY p.created_at DESC;
END;
$$;

-- ============================================================
-- 2. Admin User Profile Mutation RPC (With Last Admin Safeguard)
-- ============================================================
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

    -- Strict role enum validation
    IF p_role NOT IN ('admin', 'viewer') THEN
        RAISE EXCEPTION 'Invalid role: must be admin or viewer';
    END IF;

    -- Fetch target profile
    SELECT * INTO v_target
    FROM public.profiles
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;

    -- Last Admin Safeguard with Concurrency Lock:
    -- If target is currently an active admin, and new state removes active-admin status
    IF v_target.role = 'admin' AND v_target.is_active = TRUE AND (p_role != 'admin' OR p_is_active = FALSE) THEN
        -- Acquire transaction-scoped advisory lock for admin role governance
        PERFORM pg_catalog.pg_advisory_xact_lock(84729185721901);

        SELECT COUNT(*) INTO v_admin_count
        FROM public.profiles
        WHERE role = 'admin' AND is_active = TRUE;

        IF v_admin_count <= 1 THEN
            RAISE EXCEPTION 'Cannot remove or deactivate the last active administrator';
        END IF;
    END IF;

    UPDATE public.profiles
    SET 
        role = p_role,
        is_active = COALESCE(p_is_active, FALSE),
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING * INTO v_updated;

    RETURN row_to_json(v_updated);
END;
$$;

-- ============================================================
-- 3. Admin Import Jobs List RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_import_jobs(
    p_status TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    filename TEXT,
    mode TEXT,
    status TEXT,
    total_rows INTEGER,
    valid_rows INTEGER,
    invalid_rows INTEGER,
    new_records INTEGER,
    updated_records INTEGER,
    duplicate_rows INTEGER,
    possible_duplicate_rows INTEGER,
    error_rows INTEGER,
    uploaded_by UUID,
    uploaded_by_email TEXT,
    uploaded_by_name TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    full_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_limit INTEGER;
    v_offset INTEGER;
BEGIN
    -- Authorization Guard
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin authorization required';
    END IF;

    v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 50), 100));
    v_offset := GREATEST(0, COALESCE(p_offset, 0));

    RETURN QUERY
    WITH filtered_jobs AS (
        SELECT 
            j.id,
            j.filename,
            j.mode,
            j.status,
            j.total_rows,
            j.valid_rows,
            j.invalid_rows,
            j.new_records,
            j.updated_records,
            j.duplicate_rows,
            j.possible_duplicate_rows,
            j.error_rows,
            j.uploaded_by,
            p.email AS uploaded_by_email,
            p.full_name AS uploaded_by_name,
            j.started_at,
            j.completed_at,
            j.created_at,
            j.updated_at,
            COUNT(*) OVER() AS full_count
        FROM public.import_jobs j
        LEFT JOIN public.profiles p ON p.id = j.uploaded_by
        WHERE (p_status IS NULL OR TRIM(p_status) = '' OR j.status = p_status)
    )
    SELECT *
    FROM filtered_jobs
    ORDER BY created_at DESC
    LIMIT v_limit
    OFFSET v_offset;
END;
$$;

-- ============================================================
-- 4. Admin Import Job Details RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_import_job_details(p_job_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_job JSON;
    v_errors JSON;
    v_duplicates JSON;
BEGIN
    -- Authorization Guard
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin authorization required';
    END IF;

    SELECT json_build_object(
        'id', j.id,
        'filename', j.filename,
        'mode', j.mode,
        'status', j.status,
        'total_rows', j.total_rows,
        'valid_rows', j.valid_rows,
        'invalid_rows', j.invalid_rows,
        'new_records', j.new_records,
        'updated_records', j.updated_records,
        'duplicate_rows', j.duplicate_rows,
        'possible_duplicate_rows', j.possible_duplicate_rows,
        'error_rows', j.error_rows,
        'uploaded_by', j.uploaded_by,
        'uploaded_by_email', p.email,
        'uploaded_by_name', p.full_name,
        'started_at', j.started_at,
        'completed_at', j.completed_at,
        'created_at', j.created_at,
        'updated_at', j.updated_at
    ) INTO v_job
    FROM public.import_jobs j
    LEFT JOIN public.profiles p ON p.id = j.uploaded_by
    WHERE j.id = p_job_id;

    IF v_job IS NULL THEN
        RAISE EXCEPTION 'Import job not found';
    END IF;

    SELECT json_agg(row_to_json(e)) INTO v_errors
    FROM (
        SELECT 
            ie.id, 
            ie.import_job_id, 
            ie.sheet_name,
            ie.row_number, 
            ie.field_name, 
            ie.error_code,
            ie.message, 
            ie.created_at
        FROM public.import_errors ie
        WHERE ie.import_job_id = p_job_id
        ORDER BY ie.row_number ASC NULLS LAST, ie.created_at ASC
        LIMIT 100
    ) e;

    SELECT json_agg(row_to_json(d)) INTO v_duplicates
    FROM (
        SELECT 
            dc.id,
            dc.import_job_id,
            dc.existing_alumni_id,
            dc.candidate_staging_row_id,
            dc.candidate_alumni_id,
            dc.match_reason,
            dc.match_score::NUMERIC(5,2) AS match_score,
            dc.status,
            dc.reviewed_by,
            dc.reviewed_at,
            dc.created_at,
            a.name AS existing_alumni_name,
            a.current_company AS existing_alumni_company,
            a.email AS existing_alumni_email,
            COALESCE(ca.name, isr.staged_alumni->>'name') AS candidate_name,
            COALESCE(ca.current_company, isr.staged_alumni->>'current_company') AS candidate_company,
            COALESCE(ca.email, isr.staged_alumni->>'email') AS candidate_email
        FROM public.duplicate_candidates dc
        LEFT JOIN public.alumni a ON a.id = dc.existing_alumni_id
        LEFT JOIN public.alumni ca ON ca.id = dc.candidate_alumni_id
        LEFT JOIN public.import_staging_rows isr ON isr.id = dc.candidate_staging_row_id
        WHERE dc.import_job_id = p_job_id
        ORDER BY dc.created_at DESC
        LIMIT 100
    ) d;

    RETURN json_build_object(
        'job', v_job,
        'errors', COALESCE(v_errors, '[]'::JSON),
        'duplicates', COALESCE(v_duplicates, '[]'::JSON)
    );
END;
$$;

-- ============================================================
-- 5. Admin Duplicate Candidates List RPC (With Candidate Preview & Numeric Score)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_duplicate_candidates(
    p_status TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    import_job_id UUID,
    existing_alumni_id UUID,
    candidate_staging_row_id UUID,
    candidate_alumni_id UUID,
    match_reason TEXT,
    match_score NUMERIC(5,2),
    status TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    existing_alumni_name TEXT,
    existing_alumni_company TEXT,
    existing_alumni_designation TEXT,
    existing_alumni_email TEXT,
    existing_alumni_mobile TEXT,
    existing_alumni_branch TEXT,
    existing_alumni_leaving_year INTEGER,
    candidate_name TEXT,
    candidate_company TEXT,
    candidate_designation TEXT,
    candidate_email TEXT,
    candidate_mobile TEXT,
    candidate_academic_branch TEXT,
    candidate_joining_year INTEGER,
    candidate_leaving_year INTEGER,
    full_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_limit INTEGER;
    v_offset INTEGER;
BEGIN
    -- Authorization Guard
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin authorization required';
    END IF;

    v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 50), 100));
    v_offset := GREATEST(0, COALESCE(p_offset, 0));

    RETURN QUERY
    WITH ranked AS (
        SELECT 
            dc.id,
            dc.import_job_id,
            dc.existing_alumni_id,
            dc.candidate_staging_row_id,
            dc.candidate_alumni_id,
            dc.match_reason,
            dc.match_score::NUMERIC(5,2) AS match_score,
            COALESCE(dc.status, 'pending') AS status,
            dc.reviewed_by,
            dc.reviewed_at,
            dc.created_at,
            dc.updated_at,
            a.name AS existing_alumni_name,
            a.current_company AS existing_alumni_company,
            a.current_designation AS existing_alumni_designation,
            a.email AS existing_alumni_email,
            a.mobile AS existing_alumni_mobile,
            a.academic_branch AS existing_alumni_branch,
            a.leaving_year AS existing_alumni_leaving_year,
            COALESCE(ca.name, isr.staged_alumni->>'name') AS candidate_name,
            COALESCE(ca.current_company, isr.staged_alumni->>'current_company') AS candidate_company,
            COALESCE(ca.current_designation, isr.staged_alumni->>'current_designation') AS candidate_designation,
            COALESCE(ca.email, isr.staged_alumni->>'email') AS candidate_email,
            COALESCE(ca.mobile, isr.staged_alumni->>'mobile') AS candidate_mobile,
            COALESCE(ca.academic_branch, isr.staged_alumni->>'academic_branch') AS candidate_academic_branch,
            COALESCE(
                ca.joining_year, 
                CASE 
                    WHEN (isr.staged_alumni->>'joining_year') ~ '^[0-9]{4}$' 
                    THEN (isr.staged_alumni->>'joining_year')::INTEGER 
                    ELSE NULL 
                END
            ) AS candidate_joining_year,
            COALESCE(
                ca.leaving_year, 
                CASE 
                    WHEN (isr.staged_alumni->>'leaving_year') ~ '^[0-9]{4}$' 
                    THEN (isr.staged_alumni->>'leaving_year')::INTEGER 
                    ELSE NULL 
                END
            ) AS candidate_leaving_year,
            COUNT(*) OVER() AS full_count
        FROM public.duplicate_candidates dc
        LEFT JOIN public.alumni a ON a.id = dc.existing_alumni_id
        LEFT JOIN public.alumni ca ON ca.id = dc.candidate_alumni_id
        LEFT JOIN public.import_staging_rows isr ON isr.id = dc.candidate_staging_row_id
        WHERE (p_status IS NULL OR TRIM(p_status) = '' OR dc.status = p_status OR (p_status = 'pending' AND (dc.status IS NULL OR dc.status = 'pending')))
    )
    SELECT *
    FROM ranked
    ORDER BY created_at DESC
    LIMIT v_limit
    OFFSET v_offset;
END;
$$;

-- ============================================================
-- 6. Admin Duplicate Candidate Resolution RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_resolve_duplicate_candidate(
    p_candidate_id UUID,
    p_resolution TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_updated public.duplicate_candidates%ROWTYPE;
BEGIN
    -- Authorization Guard
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin authorization required';
    END IF;

    IF p_resolution NOT IN ('same_person', 'different_people', 'ignored', 'pending') THEN
        RAISE EXCEPTION 'Invalid resolution: must be same_person, different_people, ignored, or pending';
    END IF;

    UPDATE public.duplicate_candidates
    SET 
        status = p_resolution,
        reviewed_by = CASE WHEN p_resolution = 'pending' THEN NULL ELSE auth.uid() END,
        reviewed_at = CASE WHEN p_resolution = 'pending' THEN NULL ELSE NOW() END,
        updated_at = NOW()
    WHERE id = p_candidate_id
    RETURNING * INTO v_updated;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Candidate duplicate record not found';
    END IF;

    RETURN row_to_json(v_updated);
END;
$$;

-- ============================================================
-- 7. Admin Audit & Operational Summary RPC
-- ============================================================
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

-- ============================================================
-- 8. Explicit Security Grants and Revocations
-- ============================================================
REVOKE ALL ON FUNCTION public.admin_get_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_users() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_update_user_profile(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_profile(UUID, TEXT, BOOLEAN) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_get_import_jobs(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_import_jobs(TEXT, INTEGER, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_get_import_job_details(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_import_job_details(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_get_duplicate_candidates(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_duplicate_candidates(TEXT, INTEGER, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_resolve_duplicate_candidate(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_duplicate_candidate(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_get_audit_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_audit_summary() TO authenticated;
