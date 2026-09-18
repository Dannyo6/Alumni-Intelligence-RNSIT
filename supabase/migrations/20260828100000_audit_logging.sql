-- Phase 10B.1: Institutional Audit / Change Logging & Governance

-- ============================================================
-- 1. Create audit_log Table (Historical Actor Identity Preservation)
-- ============================================================
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_name TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN (
        'INSERT', 'UPDATE', 'DELETE',
        'ADMIN_ACTIVATED', 'ADMIN_DEACTIVATED', 'ADMIN_NAME_UPDATED',
        'DUPLICATE_RESOLVED', 'DUPLICATE_RESET',
        'IMPORT_STARTED', 'IMPORT_COMPLETED', 'IMPORT_FAILED'
    )),
    actor_user_id UUID NULL,
    actor_email TEXT NULL,
    changed_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. Indexes for Audit Ingestion & Querying
-- ============================================================
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_actor_user_id ON public.audit_log(actor_user_id);
CREATE INDEX idx_audit_log_entity ON public.audit_log(entity_name, entity_id);
CREATE INDEX idx_audit_log_action ON public.audit_log(action);

-- ============================================================
-- 3. Row Level Security & Defense-in-Depth Table Privileges
-- ============================================================
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admins to view audit log"
ON public.audit_log
FOR SELECT
TO authenticated
USING (private.is_admin());

-- No direct client mutation (INSERT/UPDATE/DELETE) policies exist.
-- Explicit defense-in-depth table-level grants & revokes:
REVOKE ALL ON TABLE public.audit_log FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.audit_log TO authenticated;

-- ============================================================
-- 4. Private Helper: write_audit_event (Server Context Identity)
-- ============================================================
CREATE OR REPLACE FUNCTION private.write_audit_event(
    p_entity_name TEXT,
    p_entity_id UUID,
    p_action TEXT,
    p_changed_fields JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_user_id UUID;
    v_actor_email TEXT;
BEGIN
    -- Derive actor identity securely from database/session context
    v_actor_user_id := auth.uid();

    IF v_actor_user_id IS NOT NULL THEN
        SELECT email INTO v_actor_email
        FROM public.profiles
        WHERE id = v_actor_user_id;
    END IF;

    INSERT INTO public.audit_log (
        entity_name,
        entity_id,
        action,
        actor_user_id,
        actor_email,
        changed_fields,
        created_at
    ) VALUES (
        p_entity_name,
        p_entity_id,
        p_action,
        v_actor_user_id,
        v_actor_email,
        COALESCE(p_changed_fields, '{}'::jsonb),
        NOW()
    );
END;
$$;

-- ============================================================
-- 5. Trigger: Alumni PII-Minimized Audit Logging
-- ============================================================
CREATE OR REPLACE FUNCTION private.audit_alumni_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_changed_fields JSONB := '{}'::jsonb;
    v_has_changes BOOLEAN := FALSE;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- 1. Non-sensitive business & governance fields (record old and new values)
        IF OLD.current_company IS DISTINCT FROM NEW.current_company THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{current_company}', jsonb_build_object('old', OLD.current_company, 'new', NEW.current_company));
            v_has_changes := TRUE;
        END IF;

        IF OLD.current_designation IS DISTINCT FROM NEW.current_designation THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{current_designation}', jsonb_build_object('old', OLD.current_designation, 'new', NEW.current_designation));
            v_has_changes := TRUE;
        END IF;

        IF OLD.company_sector IS DISTINCT FROM NEW.company_sector THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{company_sector}', jsonb_build_object('old', OLD.company_sector, 'new', NEW.company_sector));
            v_has_changes := TRUE;
        END IF;

        IF OLD.city IS DISTINCT FROM NEW.city THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{city}', jsonb_build_object('old', OLD.city, 'new', NEW.city));
            v_has_changes := TRUE;
        END IF;

        IF OLD.country IS DISTINCT FROM NEW.country THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{country}', jsonb_build_object('old', OLD.country, 'new', NEW.country));
            v_has_changes := TRUE;
        END IF;

        IF OLD.country_code IS DISTINCT FROM NEW.country_code THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{country_code}', jsonb_build_object('old', OLD.country_code, 'new', NEW.country_code));
            v_has_changes := TRUE;
        END IF;

        IF OLD.joining_year IS DISTINCT FROM NEW.joining_year THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{joining_year}', jsonb_build_object('old', OLD.joining_year, 'new', NEW.joining_year));
            v_has_changes := TRUE;
        END IF;

        IF OLD.leaving_year IS DISTINCT FROM NEW.leaving_year THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{leaving_year}', jsonb_build_object('old', OLD.leaving_year, 'new', NEW.leaving_year));
            v_has_changes := TRUE;
        END IF;

        IF OLD.academic_branch IS DISTINCT FROM NEW.academic_branch THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{academic_branch}', jsonb_build_object('old', OLD.academic_branch, 'new', NEW.academic_branch));
            v_has_changes := TRUE;
        END IF;

        IF OLD.rnsit_role IS DISTINCT FROM NEW.rnsit_role THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{rnsit_role}', jsonb_build_object('old', OLD.rnsit_role, 'new', NEW.rnsit_role));
            v_has_changes := TRUE;
        END IF;

        IF OLD.is_high_value IS DISTINCT FROM NEW.is_high_value THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{is_high_value}', jsonb_build_object('old', OLD.is_high_value, 'new', NEW.is_high_value));
            v_has_changes := TRUE;
        END IF;

        IF OLD.is_top_employer IS DISTINCT FROM NEW.is_top_employer THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{is_top_employer}', jsonb_build_object('old', OLD.is_top_employer, 'new', NEW.is_top_employer));
            v_has_changes := TRUE;
        END IF;

        IF OLD.is_global IS DISTINCT FROM NEW.is_global THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{is_global}', jsonb_build_object('old', OLD.is_global, 'new', NEW.is_global));
            v_has_changes := TRUE;
        END IF;

        IF OLD.is_student_or_rnsit IS DISTINCT FROM NEW.is_student_or_rnsit THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{is_student_or_rnsit}', jsonb_build_object('old', OLD.is_student_or_rnsit, 'new', NEW.is_student_or_rnsit));
            v_has_changes := TRUE;
        END IF;

        IF OLD.needs_verification IS DISTINCT FROM NEW.needs_verification THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{needs_verification}', jsonb_build_object('old', OLD.needs_verification, 'new', NEW.needs_verification));
            v_has_changes := TRUE;
        END IF;

        IF OLD.value_score IS DISTINCT FROM NEW.value_score THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{value_score}', jsonb_build_object('old', OLD.value_score, 'new', NEW.value_score));
            v_has_changes := TRUE;
        END IF;

        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{status}', jsonb_build_object('old', OLD.status, 'new', NEW.status));
            v_has_changes := TRUE;
        END IF;

        IF OLD.data_confidence IS DISTINCT FROM NEW.data_confidence THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{data_confidence}', jsonb_build_object('old', OLD.data_confidence, 'new', NEW.data_confidence));
            v_has_changes := TRUE;
        END IF;

        IF OLD.source_workbook IS DISTINCT FROM NEW.source_workbook THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{source_workbook}', jsonb_build_object('old', OLD.source_workbook, 'new', NEW.source_workbook));
            v_has_changes := TRUE;
        END IF;

        IF OLD.source_sheet IS DISTINCT FROM NEW.source_sheet THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{source_sheet}', jsonb_build_object('old', OLD.source_sheet, 'new', NEW.source_sheet));
            v_has_changes := TRUE;
        END IF;

        IF OLD.last_verified_at IS DISTINCT FROM NEW.last_verified_at THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{last_verified_at}', jsonb_build_object('old', OLD.last_verified_at, 'new', NEW.last_verified_at));
            v_has_changes := TRUE;
        END IF;

        -- 2. Sensitive / PII / Free-form fields (PII redaction policy: log only 'changed': true)
        IF OLD.name IS DISTINCT FROM NEW.name THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{name}', jsonb_build_object('changed', TRUE));
            v_has_changes := TRUE;
        END IF;

        IF OLD.notes IS DISTINCT FROM NEW.notes THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{notes}', jsonb_build_object('changed', TRUE));
            v_has_changes := TRUE;
        END IF;

        IF OLD.email IS DISTINCT FROM NEW.email THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{email}', jsonb_build_object('changed', TRUE));
            v_has_changes := TRUE;
        END IF;

        IF OLD.alternate_emails IS DISTINCT FROM NEW.alternate_emails THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{alternate_emails}', jsonb_build_object('changed', TRUE));
            v_has_changes := TRUE;
        END IF;

        IF OLD.mobile IS DISTINCT FROM NEW.mobile THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{mobile}', jsonb_build_object('changed', TRUE));
            v_has_changes := TRUE;
        END IF;

        IF OLD.profile_link IS DISTINCT FROM NEW.profile_link THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{profile_link}', jsonb_build_object('changed', TRUE));
            v_has_changes := TRUE;
        END IF;

        IF OLD.linkedin_url IS DISTINCT FROM NEW.linkedin_url THEN
            v_changed_fields := jsonb_set(v_changed_fields, '{linkedin_url}', jsonb_build_object('changed', TRUE));
            v_has_changes := TRUE;
        END IF;

        -- Write audit row ONLY if audited fields were modified (ignoring updated_at, search_vector, etc.)
        IF v_has_changes THEN
            PERFORM private.write_audit_event('alumni', NEW.id, 'UPDATE', v_changed_fields);
        END IF;

        RETURN NEW;

    ELSIF TG_OP = 'INSERT' THEN
        -- Non-sensitive professional/governance snapshot (no name or raw contact PII)
        v_changed_fields := jsonb_build_object(
            'current_company', NEW.current_company,
            'current_designation', NEW.current_designation,
            'academic_branch', NEW.academic_branch,
            'leaving_year', NEW.leaving_year,
            'data_confidence', NEW.data_confidence
        );
        PERFORM private.write_audit_event('alumni', NEW.id, 'INSERT', v_changed_fields);
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        -- Non-sensitive professional/governance snapshot (no name or raw contact PII)
        v_changed_fields := jsonb_build_object(
            'current_company', OLD.current_company,
            'current_designation', OLD.current_designation,
            'academic_branch', OLD.academic_branch,
            'leaving_year', OLD.leaving_year
        );
        PERFORM private.write_audit_event('alumni', OLD.id, 'DELETE', v_changed_fields);
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_alumni_changes_trigger ON public.alumni;
CREATE TRIGGER audit_alumni_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.alumni
FOR EACH ROW EXECUTE FUNCTION private.audit_alumni_changes();

-- ============================================================
-- 6. Trigger: Import Job Lifecycle Audit Logging
-- ============================================================
CREATE OR REPLACE FUNCTION private.audit_import_job_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_action TEXT := NULL;
    v_details JSONB := '{}'::jsonb;
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'running' THEN
            v_action := 'IMPORT_STARTED';
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            IF NEW.status = 'running' THEN
                v_action := 'IMPORT_STARTED';
            ELSIF NEW.status = 'completed' THEN
                v_action := 'IMPORT_COMPLETED';
            ELSIF NEW.status IN ('failed', 'cancelled') THEN
                v_action := 'IMPORT_FAILED';
            END IF;
        END IF;
    END IF;

    -- Avoid auditing incremental row progress updates; log only meaningful lifecycle states
    IF v_action IS NOT NULL THEN
        v_details := jsonb_build_object(
            'filename', NEW.filename,
            'mode', NEW.mode,
            'status', NEW.status,
            'total_rows', NEW.total_rows,
            'valid_rows', NEW.valid_rows,
            'error_rows', NEW.error_rows
        );
        PERFORM private.write_audit_event('import_jobs', NEW.id, v_action, v_details);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_import_job_lifecycle_trigger ON public.import_jobs;
CREATE TRIGGER audit_import_job_lifecycle_trigger
AFTER INSERT OR UPDATE ON public.import_jobs
FOR EACH ROW EXECUTE FUNCTION private.audit_import_job_lifecycle();

-- ============================================================
-- 7. Hardened Administrative RPCs with Auditing
-- ============================================================

-- 7A. admin_update_user_profile
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
    v_action TEXT := NULL;
    v_changed_fields JSONB := '{}'::jsonb;
BEGIN
    -- Authorization Guard
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin authorization required';
    END IF;

    -- Strict role validation
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

    -- Final Active Admin Guard with proven advisory lock
    IF v_target.role = 'admin' AND v_target.is_active = TRUE AND (p_role != 'admin' OR p_is_active = FALSE) THEN
        PERFORM pg_catalog.pg_advisory_xact_lock(84729185721901);
        
        SELECT count(*) INTO v_admin_count
        FROM public.profiles
        WHERE role = 'admin' AND is_active = TRUE;

        IF v_admin_count <= 1 THEN
            RAISE EXCEPTION 'Cannot deactivate or change role of the last active administrator';
        END IF;
    END IF;

    -- Determine audit event only if status actually changed
    IF v_target.is_active IS DISTINCT FROM p_is_active THEN
        IF p_is_active = TRUE THEN
            v_action := 'ADMIN_ACTIVATED';
        ELSE
            v_action := 'ADMIN_DEACTIVATED';
        END IF;

        v_changed_fields := jsonb_build_object(
            'is_active', jsonb_build_object('old', v_target.is_active, 'new', p_is_active)
        );
    END IF;

    -- Update profile
    UPDATE public.profiles
    SET role = p_role,
        is_active = p_is_active,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING * INTO v_updated;

    -- Write audit event if meaningful change occurred
    IF v_action IS NOT NULL THEN
        PERFORM private.write_audit_event('profiles', p_user_id, v_action, v_changed_fields);
    END IF;

    RETURN row_to_json(v_updated);
END;
$$;

-- 7B. admin_update_user_name
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
    v_has_change BOOLEAN := FALSE;
    v_changed_fields JSONB := '{}'::jsonb;
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
    
    IF v_target.full_name IS DISTINCT FROM v_cleaned_name THEN
        v_has_change := TRUE;
        v_changed_fields := jsonb_build_object(
            'full_name', jsonb_build_object('old', v_target.full_name, 'new', v_cleaned_name)
        );
    END IF;

    -- Update profile name
    UPDATE public.profiles
    SET full_name = v_cleaned_name,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING * INTO v_updated;

    -- Write audit event only if full_name actually changed
    IF v_has_change THEN
        PERFORM private.write_audit_event('profiles', p_user_id, 'ADMIN_NAME_UPDATED', v_changed_fields);
    END IF;

    RETURN row_to_json(v_updated);
END;
$$;

-- 7C. admin_resolve_duplicate_candidate
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
    v_target public.duplicate_candidates%ROWTYPE;
    v_updated public.duplicate_candidates%ROWTYPE;
    v_action TEXT := NULL;
    v_changed_fields JSONB := '{}'::jsonb;
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
    
    SELECT * INTO v_target FROM public.duplicate_candidates WHERE id = p_candidate_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Candidate duplicate record not found';
    END IF;
    
    IF v_target.status IS DISTINCT FROM p_resolution THEN
        IF p_resolution = 'pending' THEN
            v_action := 'DUPLICATE_RESET';
        ELSE
            v_action := 'DUPLICATE_RESOLVED';
        END IF;

        v_changed_fields := jsonb_build_object(
            'status', jsonb_build_object('old', v_target.status, 'new', p_resolution),
            'match_reason', v_target.match_reason,
            'existing_alumni_id', v_target.existing_alumni_id
        );
    END IF;

    UPDATE public.duplicate_candidates
    SET 
        status = p_resolution,
        reviewed_by = CASE WHEN p_resolution = 'pending' THEN NULL ELSE auth.uid() END,
        reviewed_at = CASE WHEN p_resolution = 'pending' THEN NULL ELSE NOW() END,
        updated_at = NOW()
    WHERE id = p_candidate_id
    RETURNING * INTO v_updated;

    IF v_action IS NOT NULL THEN
        PERFORM private.write_audit_event('duplicate_candidates', p_candidate_id, v_action, v_changed_fields);
    END IF;

    RETURN row_to_json(v_updated);
END;
$$;

-- ============================================================
-- 8. Audit Read RPC (Paginated, Filtered, Admin-Only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_audit_log(
    p_actor_user_id UUID DEFAULT NULL,
    p_entity_name TEXT DEFAULT NULL,
    p_action TEXT DEFAULT NULL,
    p_date_from TIMESTAMPTZ DEFAULT NULL,
    p_date_to TIMESTAMPTZ DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    entity_name TEXT,
    entity_id UUID,
    action TEXT,
    actor_user_id UUID,
    actor_email TEXT,
    changed_fields JSONB,
    created_at TIMESTAMPTZ,
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
    WITH filtered AS (
        SELECT 
            al.id,
            al.entity_name,
            al.entity_id,
            al.action,
            al.actor_user_id,
            al.actor_email,
            al.changed_fields,
            al.created_at,
            COUNT(*) OVER() AS full_count
        FROM public.audit_log al
        WHERE (p_actor_user_id IS NULL OR al.actor_user_id = p_actor_user_id)
          AND (p_entity_name IS NULL OR TRIM(p_entity_name) = '' OR al.entity_name = p_entity_name)
          AND (p_action IS NULL OR TRIM(p_action) = '' OR al.action = p_action)
          AND (p_date_from IS NULL OR al.created_at >= p_date_from)
          AND (p_date_to IS NULL OR al.created_at <= p_date_to)
    )
    SELECT *
    FROM filtered
    ORDER BY filtered.created_at DESC, filtered.id DESC
    LIMIT v_limit
    OFFSET v_offset;
END;
$$;

-- ============================================================
-- 9. Explicit Security Grants & Revocations
-- ============================================================

-- Public RPCs: revoke from anon/public, grant execute to authenticated (admin-guarded)
REVOKE ALL ON FUNCTION public.admin_get_audit_log(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_audit_log(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_update_user_profile(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_profile(UUID, TEXT, BOOLEAN) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_update_user_name(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_name(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_resolve_duplicate_candidate(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_duplicate_candidate(UUID, TEXT) TO authenticated;

-- Private schema functions: strictly revoked from ALL clients (internal DB engine only)
REVOKE ALL ON FUNCTION private.write_audit_event(TEXT, UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.audit_alumni_changes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.audit_import_job_lifecycle() FROM PUBLIC, anon, authenticated;
