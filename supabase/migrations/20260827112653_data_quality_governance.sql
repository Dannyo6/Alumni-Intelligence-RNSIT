-- ==============================================================================
-- Migration: Data Quality & Governance RPCs (Schema v1 — Phase 2)
-- Description: Adds server-side governance functions for data-quality metrics,
-- paginated quality-record retrieval, and branch normalization auditing.
-- All functions are SECURITY INVOKER and restricted to authenticated users only.
-- ==============================================================================

-- ============================================================
-- 1. Data Quality Metrics RPC — single table scan
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_data_quality_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'total_count',              COUNT(*),

        -- Contact & Identity
        'missing_email',            COUNT(*) FILTER (WHERE a.email IS NULL OR TRIM(a.email) = ''),
        'missing_mobile',           COUNT(*) FILTER (WHERE a.mobile IS NULL OR TRIM(a.mobile) = ''),
        'invalid_mobile',           COUNT(*) FILTER (WHERE a.mobile IS NOT NULL AND TRIM(a.mobile) != '' AND a.mobile_valid = FALSE),
        'multiple_emails',          COUNT(*) FILTER (WHERE a.alternate_emails IS NOT NULL AND array_length(a.alternate_emails, 1) > 0),
        'missing_linkedin',         COUNT(*) FILTER (WHERE (a.linkedin_url IS NULL OR TRIM(a.linkedin_url) = '')
                                                       AND (a.profile_link IS NULL OR TRIM(a.profile_link) = '')),
        'missing_contact',          COUNT(*) FILTER (WHERE (a.email IS NULL OR TRIM(a.email) = '')
                                                       AND (a.mobile IS NULL OR TRIM(a.mobile) = '')),

        -- Professional & Academic
        'missing_company',          COUNT(*) FILTER (WHERE a.current_company IS NULL OR TRIM(a.current_company) = ''),
        'missing_designation',      COUNT(*) FILTER (WHERE a.current_designation IS NULL OR TRIM(a.current_designation) = ''),
        'missing_sector',           COUNT(*) FILTER (WHERE a.company_sector IS NULL OR TRIM(a.company_sector) = ''),
        'missing_country',          COUNT(*) FILTER (WHERE a.country IS NULL OR TRIM(a.country) = ''),
        'missing_city',             COUNT(*) FILTER (WHERE a.city IS NULL OR TRIM(a.city) = ''),
        'missing_joining_year',     COUNT(*) FILTER (WHERE a.joining_year IS NULL),
        'missing_leaving_year',     COUNT(*) FILTER (WHERE a.leaving_year IS NULL),
        'missing_academic_branch',  COUNT(*) FILTER (WHERE a.academic_branch IS NULL OR TRIM(a.academic_branch) = ''),
        'missing_professional',     COUNT(*) FILTER (WHERE (a.current_company IS NULL OR TRIM(a.current_company) = '')
                                                       AND (a.current_designation IS NULL OR TRIM(a.current_designation) = '')),

        -- Governance
        'needs_verification',       COUNT(*) FILTER (WHERE a.needs_verification = TRUE),

        -- Confidence distribution (Schema v1 lowercase values: high, medium, low, unverified)
        'confidence_high',          COUNT(*) FILTER (WHERE a.data_confidence = 'high'),
        'confidence_medium',        COUNT(*) FILTER (WHERE a.data_confidence = 'medium'),
        'confidence_low',           COUNT(*) FILTER (WHERE a.data_confidence = 'low'),
        'confidence_unverified',    COUNT(*) FILTER (WHERE a.data_confidence = 'unverified'
                                                       OR a.data_confidence IS NULL
                                                       OR TRIM(a.data_confidence) = ''),
        'low_data_confidence',      COUNT(*) FILTER (WHERE a.data_confidence IN ('low', 'unverified')
                                                       OR a.data_confidence IS NULL
                                                       OR TRIM(a.data_confidence) = ''),

        -- Branch quality aggregates
        'recognized_branch_records',      COUNT(*) FILTER (WHERE a.academic_branch IS NOT NULL AND TRIM(a.academic_branch) != ''
                                                             AND (
                                                                 a.academic_branch ILIKE '%computer science%'
                                                                 OR a.academic_branch ILIKE '%information science%'
                                                                 OR a.academic_branch ILIKE '%electronics and communication%'
                                                                 OR a.academic_branch ILIKE '%electronics and instrumentation%'
                                                                 OR a.academic_branch ILIKE '%electrical and electronics%'
                                                                 OR a.academic_branch ILIKE '%mechanical engineering%'
                                                                 OR a.academic_branch ILIKE '%civil engineering%'
                                                                 OR a.academic_branch ILIKE '%artificial intelligence%'
                                                                 OR a.academic_branch ILIKE '%machine learning%'
                                                                 OR a.academic_branch ILIKE '%cyber security%'
                                                                 OR a.academic_branch ILIKE '%data science%'
                                                                 OR a.academic_branch ILIKE '%biotechnology%'
                                                                 OR a.academic_branch ILIKE '%instrumentation engineering%'
                                                                 OR a.academic_branch ILIKE '%master of computer%'
                                                                 OR a.academic_branch ILIKE '%master of business%'
                                                                 OR a.academic_branch ILIKE 'b.e%'
                                                                 OR a.academic_branch ILIKE 'b.tech%'
                                                                 OR a.academic_branch ILIKE 'm.tech%'
                                                                 OR a.academic_branch ILIKE 'be in %'
                                                                 OR a.academic_branch ILIKE 'btech in %'
                                                                 OR a.academic_branch ILIKE 'mtech in %'
                                                                 OR UPPER(TRIM(a.academic_branch)) IN (
                                                                     'CSE', 'ISE', 'ECE', 'EEE', 'ME', 'CV', 'AIML', 'MCA', 'MBA',
                                                                     'COMPUTER SCIENCE AND ENGINEERING',
                                                                     'INFORMATION SCIENCE AND ENGINEERING',
                                                                     'ELECTRONICS AND COMMUNICATION ENGINEERING',
                                                                     'ELECTRICAL AND ELECTRONICS ENGINEERING',
                                                                     'MECHANICAL ENGINEERING',
                                                                     'CIVIL ENGINEERING',
                                                                     'ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING',
                                                                     'CYBER SECURITY',
                                                                     'DATA SCIENCE',
                                                                     'ELECTRONICS AND INSTRUMENTATION ENGINEERING',
                                                                     'BIOTECHNOLOGY',
                                                                     'MASTER OF COMPUTER APPLICATIONS',
                                                                     'MASTER OF BUSINESS ADMINISTRATION'
                                                                 )
                                                             )),
        'suspicious_branch_records',      COUNT(*) FILTER (WHERE a.academic_branch IS NOT NULL AND TRIM(a.academic_branch) != ''
                                                             AND NOT (
                                                                 a.academic_branch ILIKE '%computer science%'
                                                                 OR a.academic_branch ILIKE '%information science%'
                                                                 OR a.academic_branch ILIKE '%electronics and communication%'
                                                                 OR a.academic_branch ILIKE '%electronics and instrumentation%'
                                                                 OR a.academic_branch ILIKE '%electrical and electronics%'
                                                                 OR a.academic_branch ILIKE '%mechanical engineering%'
                                                                 OR a.academic_branch ILIKE '%civil engineering%'
                                                                 OR a.academic_branch ILIKE '%artificial intelligence%'
                                                                 OR a.academic_branch ILIKE '%machine learning%'
                                                                 OR a.academic_branch ILIKE '%cyber security%'
                                                                 OR a.academic_branch ILIKE '%data science%'
                                                                 OR a.academic_branch ILIKE '%biotechnology%'
                                                                 OR a.academic_branch ILIKE '%instrumentation engineering%'
                                                                 OR a.academic_branch ILIKE '%master of computer%'
                                                                 OR a.academic_branch ILIKE '%master of business%'
                                                                 OR a.academic_branch ILIKE 'b.e%'
                                                                 OR a.academic_branch ILIKE 'b.tech%'
                                                                 OR a.academic_branch ILIKE 'm.tech%'
                                                                 OR a.academic_branch ILIKE 'be in %'
                                                                 OR a.academic_branch ILIKE 'btech in %'
                                                                 OR a.academic_branch ILIKE 'mtech in %'
                                                                 OR UPPER(TRIM(a.academic_branch)) IN (
                                                                     'CSE', 'ISE', 'ECE', 'EEE', 'ME', 'CV', 'AIML', 'MCA', 'MBA',
                                                                     'COMPUTER SCIENCE AND ENGINEERING',
                                                                     'INFORMATION SCIENCE AND ENGINEERING',
                                                                     'ELECTRONICS AND COMMUNICATION ENGINEERING',
                                                                     'ELECTRICAL AND ELECTRONICS ENGINEERING',
                                                                     'MECHANICAL ENGINEERING',
                                                                     'CIVIL ENGINEERING',
                                                                     'ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING',
                                                                     'CYBER SECURITY',
                                                                     'DATA SCIENCE',
                                                                     'ELECTRONICS AND INSTRUMENTATION ENGINEERING',
                                                                     'BIOTECHNOLOGY',
                                                                     'MASTER OF COMPUTER APPLICATIONS',
                                                                     'MASTER OF BUSINESS ADMINISTRATION'
                                                                 )
                                                             ))
    ) INTO v_result
    FROM public.alumni a;

    RETURN v_result;
END;
$$;

-- ============================================================
-- 2. Paginated Quality Records RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_quality_records(
    p_filter  TEXT,
    p_limit   INTEGER DEFAULT 100,
    p_offset  INTEGER DEFAULT 0
)
RETURNS TABLE (
    id                      UUID,
    name                    TEXT,
    email                   TEXT,
    mobile                  TEXT,
    mobile_valid            BOOLEAN,
    alternate_emails        TEXT[],
    current_company         TEXT,
    current_designation     TEXT,
    company_sector          TEXT,
    city                    TEXT,
    country                 TEXT,
    joining_year            INTEGER,
    leaving_year            INTEGER,
    academic_branch         TEXT,
    branch_or_designation_raw TEXT,
    rnsit_role              TEXT,
    profile_link            TEXT,
    linkedin_url            TEXT,
    primary_category        TEXT,
    is_high_value           BOOLEAN,
    is_global               BOOLEAN,
    is_top_employer         BOOLEAN,
    is_student_or_rnsit     BOOLEAN,
    needs_verification      BOOLEAN,
    value_score             INTEGER,
    status                  TEXT,
    data_confidence         TEXT,
    notes                   TEXT,
    last_verified_at        TIMESTAMP WITH TIME ZONE,
    updated_at              TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE,
    total_count             BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
    v_limit  INTEGER;
    v_offset INTEGER;
    v_valid_filters TEXT[] := ARRAY[
        'missing_company', 'missing_designation', 'missing_sector',
        'missing_country', 'missing_city',
        'missing_email', 'missing_mobile',
        'missing_joining_year', 'missing_leaving_year', 'missing_academic_branch',
        'needs_verification',
        'invalid_mobile', 'multiple_emails', 'missing_linkedin',
        'missing_contact', 'missing_professional',
        'confidence_high', 'confidence_medium', 'confidence_low',
        'confidence_unverified', 'low_data_confidence'
    ];
BEGIN
    -- Validate p_filter against whitelist
    IF p_filter IS NULL OR NOT (p_filter = ANY(v_valid_filters)) THEN
        RAISE EXCEPTION 'Unsupported quality filter: %. Supported filters: %',
            COALESCE(p_filter, 'NULL'), array_to_string(v_valid_filters, ', ')
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    v_limit  := GREATEST(1, LEAST(p_limit, 200));
    v_offset := GREATEST(0, p_offset);

    RETURN QUERY
    WITH filtered AS (
        SELECT
            a.*,
            COUNT(*) OVER() AS full_count
        FROM public.alumni a
        WHERE
            CASE p_filter
                WHEN 'missing_company'         THEN a.current_company IS NULL OR TRIM(a.current_company) = ''
                WHEN 'missing_designation'     THEN a.current_designation IS NULL OR TRIM(a.current_designation) = ''
                WHEN 'missing_sector'          THEN a.company_sector IS NULL OR TRIM(a.company_sector) = ''
                WHEN 'missing_country'         THEN a.country IS NULL OR TRIM(a.country) = ''
                WHEN 'missing_city'            THEN a.city IS NULL OR TRIM(a.city) = ''
                WHEN 'missing_email'           THEN a.email IS NULL OR TRIM(a.email) = ''
                WHEN 'missing_mobile'          THEN a.mobile IS NULL OR TRIM(a.mobile) = ''
                WHEN 'missing_joining_year'    THEN a.joining_year IS NULL
                WHEN 'missing_leaving_year'    THEN a.leaving_year IS NULL
                WHEN 'missing_academic_branch' THEN a.academic_branch IS NULL OR TRIM(a.academic_branch) = ''
                WHEN 'needs_verification'      THEN a.needs_verification = TRUE
                WHEN 'invalid_mobile'          THEN a.mobile IS NOT NULL AND TRIM(a.mobile) != '' AND a.mobile_valid = FALSE
                WHEN 'multiple_emails'         THEN a.alternate_emails IS NOT NULL AND array_length(a.alternate_emails, 1) > 0
                WHEN 'missing_linkedin'        THEN (a.linkedin_url IS NULL OR TRIM(a.linkedin_url) = '')
                                                 AND (a.profile_link IS NULL OR TRIM(a.profile_link) = '')
                WHEN 'missing_contact'         THEN (a.email IS NULL OR TRIM(a.email) = '')
                                                 AND (a.mobile IS NULL OR TRIM(a.mobile) = '')
                WHEN 'missing_professional'    THEN (a.current_company IS NULL OR TRIM(a.current_company) = '')
                                                 AND (a.current_designation IS NULL OR TRIM(a.current_designation) = '')
                WHEN 'confidence_high'         THEN a.data_confidence = 'high'
                WHEN 'confidence_medium'       THEN a.data_confidence = 'medium'
                WHEN 'confidence_low'          THEN a.data_confidence = 'low'
                WHEN 'confidence_unverified'   THEN a.data_confidence = 'unverified'
                                                 OR a.data_confidence IS NULL
                                                 OR TRIM(a.data_confidence) = ''
                WHEN 'low_data_confidence'     THEN a.data_confidence IN ('low', 'unverified')
                                                 OR a.data_confidence IS NULL
                                                 OR TRIM(a.data_confidence) = ''
                ELSE FALSE
            END
    )
    SELECT
        f.id,
        f.name,
        f.email,
        f.mobile,
        f.mobile_valid,
        f.alternate_emails,
        f.current_company,
        f.current_designation,
        f.company_sector,
        f.city,
        f.country,
        f.joining_year,
        f.leaving_year,
        f.academic_branch,
        f.branch_or_designation_raw,
        f.rnsit_role,
        f.profile_link,
        f.linkedin_url,
        f.primary_category,
        f.is_high_value,
        f.is_global,
        f.is_top_employer,
        f.is_student_or_rnsit,
        f.needs_verification,
        f.value_score,
        f.status,
        f.data_confidence,
        f.notes,
        f.last_verified_at,
        f.updated_at,
        f.created_at,
        f.full_count AS total_count
    FROM filtered f
    ORDER BY f.value_score DESC NULLS LAST, f.name ASC
    LIMIT v_limit
    OFFSET v_offset;
END;
$$;

-- ============================================================
-- 3. Branch Normalization Report RPC with Classification
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_branch_normalization_report()
RETURNS TABLE (
    academic_branch TEXT,
    record_count    BIGINT,
    classification  TEXT,
    is_recognized   BOOLEAN
)
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
    WITH branch_counts AS (
        SELECT
            a.academic_branch,
            COUNT(*) AS record_count
        FROM public.alumni a
        WHERE a.academic_branch IS NOT NULL AND TRIM(a.academic_branch) != ''
        GROUP BY a.academic_branch
    ),
    classified AS (
        SELECT
            bc.academic_branch,
            bc.record_count,
            -- Classification logic: deterministic, conservative, order matters
            CASE
                -- 1. Recognized academic branch (canonical programs, explicit aliases, known degree patterns)
                WHEN (
                    bc.academic_branch ILIKE '%computer science%'
                    OR bc.academic_branch ILIKE '%information science%'
                    OR bc.academic_branch ILIKE '%electronics and communication%'
                    OR bc.academic_branch ILIKE '%electronics and instrumentation%'
                    OR bc.academic_branch ILIKE '%electrical and electronics%'
                    OR bc.academic_branch ILIKE '%mechanical engineering%'
                    OR bc.academic_branch ILIKE '%civil engineering%'
                    OR bc.academic_branch ILIKE '%artificial intelligence%'
                    OR bc.academic_branch ILIKE '%machine learning%'
                    OR bc.academic_branch ILIKE '%cyber security%'
                    OR bc.academic_branch ILIKE '%data science%'
                    OR bc.academic_branch ILIKE '%biotechnology%'
                    OR bc.academic_branch ILIKE '%instrumentation engineering%'
                    OR bc.academic_branch ILIKE '%master of computer%'
                    OR bc.academic_branch ILIKE '%master of business%'
                    OR bc.academic_branch ILIKE 'b.e%'
                    OR bc.academic_branch ILIKE 'b.tech%'
                    OR bc.academic_branch ILIKE 'm.tech%'
                    OR bc.academic_branch ILIKE 'be in %'
                    OR bc.academic_branch ILIKE 'btech in %'
                    OR bc.academic_branch ILIKE 'mtech in %'
                    OR UPPER(TRIM(bc.academic_branch)) IN (
                        'CSE', 'ISE', 'ECE', 'EEE', 'ME', 'CV', 'AIML', 'MCA', 'MBA',
                        'COMPUTER SCIENCE AND ENGINEERING',
                        'INFORMATION SCIENCE AND ENGINEERING',
                        'ELECTRONICS AND COMMUNICATION ENGINEERING',
                        'ELECTRICAL AND ELECTRONICS ENGINEERING',
                        'MECHANICAL ENGINEERING',
                        'CIVIL ENGINEERING',
                        'ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING',
                        'CYBER SECURITY',
                        'DATA SCIENCE',
                        'ELECTRONICS AND INSTRUMENTATION ENGINEERING',
                        'BIOTECHNOLOGY',
                        'MASTER OF COMPUTER APPLICATIONS',
                        'MASTER OF BUSINESS ADMINISTRATION'
                    )
                ) THEN 'recognized_academic_branch'

                -- 2. Role-like value (job title / academic role stored in branch field)
                --    Evaluated after recognized academic programs
                WHEN (
                    LOWER(TRIM(bc.academic_branch)) ~ '\y(professor|assistant professor|associate professor|lecturer|instructor)\y'
                    OR LOWER(TRIM(bc.academic_branch)) ~ '\y(manager|administrator|system admin|lab assistant|supervisor)\y'
                    OR LOWER(TRIM(bc.academic_branch)) ~ '\y(placement coordinator|placement officer|coordinator)\y'
                    OR LOWER(TRIM(bc.academic_branch)) ~ '\y(student|intern|trainee)\y'
                    OR LOWER(TRIM(bc.academic_branch)) ~ '\y(director|head of|dean|principal|registrar)\y'
                    OR LOWER(TRIM(bc.academic_branch)) ~ '\y(analyst|consultant|architect|developer|executive|officer)\y'
                    OR LOWER(TRIM(bc.academic_branch)) ~ '\y(founder|vp|president|lead)\y'
                ) THEN 'role_like_value'

                -- 3. Organization-like value (company or institution name)
                WHEN (
                    LOWER(TRIM(bc.academic_branch)) ~ '\y(pvt|ltd|llp|inc|corp|limited|private)\y'
                    OR LOWER(TRIM(bc.academic_branch)) ~ '\y(technologies|solutions|services|systems|software|consulting)\y'
                    OR LOWER(TRIM(bc.academic_branch)) ~ '\y(institute|university|college|school|academy)\y'
                    OR LOWER(TRIM(bc.academic_branch)) ~ '\y(google|amazon|microsoft|infosys|wipro|tcs|cognizant)\y'
                ) THEN 'organization_like_value'

                -- 4. Unrecognized branch value (has content but not matched above)
                WHEN LENGTH(TRIM(bc.academic_branch)) >= 2 THEN 'unrecognized_branch_value'

                -- 5. Unknown (very short or pathological)
                ELSE 'unknown'
            END AS classification
        FROM branch_counts bc
    )
    SELECT
        c.academic_branch,
        c.record_count,
        c.classification,
        (c.classification = 'recognized_academic_branch') AS is_recognized
    FROM classified c
    ORDER BY c.record_count DESC, c.academic_branch ASC;
$$;

-- ============================================================
-- 4. Security Grants
-- ============================================================
REVOKE ALL ON FUNCTION public.get_data_quality_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_data_quality_metrics() TO authenticated;

REVOKE ALL ON FUNCTION public.get_quality_records(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_quality_records(TEXT, INTEGER, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.get_branch_normalization_report() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_branch_normalization_report() TO authenticated;
