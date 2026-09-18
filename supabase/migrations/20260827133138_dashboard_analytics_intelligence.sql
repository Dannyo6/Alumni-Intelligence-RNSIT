-- ==============================================================================
-- Migration: Dashboard Analytics & Institutional Intelligence (Schema v1 — Phase 7)
-- Description: Adds server-side aggregation RPCs for high-speed institutional
-- intelligence, KPI summaries, and bounded distributions.
-- All functions are SECURITY INVOKER and restricted to authenticated users only.
-- ==============================================================================

-- Performance Indexes for fast aggregation
CREATE INDEX IF NOT EXISTS idx_alumni_leaving_year ON public.alumni (leaving_year);
CREATE INDEX IF NOT EXISTS idx_alumni_joining_year ON public.alumni (joining_year);
CREATE INDEX IF NOT EXISTS idx_alumni_country ON public.alumni (country);
CREATE INDEX IF NOT EXISTS idx_alumni_current_company ON public.alumni (current_company);
CREATE INDEX IF NOT EXISTS idx_alumni_company_sector ON public.alumni (company_sector);
CREATE INDEX IF NOT EXISTS idx_alumni_academic_branch ON public.alumni (academic_branch);
CREATE INDEX IF NOT EXISTS idx_alumni_primary_category ON public.alumni (primary_category);

-- ============================================================
-- 1. Dashboard Summary RPC — Single pass aggregation
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'total_alumni',             COUNT(*),
        'high_value_count',         COUNT(*) FILTER (WHERE a.is_high_value = TRUE),
        'top_employer_count',       COUNT(*) FILTER (WHERE a.is_top_employer = TRUE),
        'global_count',             COUNT(*) FILTER (WHERE a.is_global = TRUE),
        'student_rnsit_count',      COUNT(*) FILTER (WHERE a.is_student_or_rnsit = TRUE),
        'needs_verification_count', COUNT(*) FILTER (WHERE a.needs_verification = TRUE),
        'countries_represented',    COUNT(DISTINCT a.country) FILTER (WHERE a.country IS NOT NULL AND TRIM(a.country) != ''),
        'companies_represented',    COUNT(DISTINCT a.current_company) FILTER (WHERE a.current_company IS NOT NULL AND TRIM(a.current_company) != ''),
        'alumni_with_email',        COUNT(*) FILTER (WHERE a.email IS NOT NULL AND TRIM(a.email) != ''),
        'alumni_with_mobile',       COUNT(*) FILTER (WHERE a.mobile IS NOT NULL AND TRIM(a.mobile) != ''),
        'alumni_with_any_contact',  COUNT(*) FILTER (WHERE (a.email IS NOT NULL AND TRIM(a.email) != '') OR (a.mobile IS NOT NULL AND TRIM(a.mobile) != ''))
    ) INTO v_result
    FROM public.alumni a;

    RETURN v_result;
END;
$$;

-- ============================================================
-- 2. Consolidated Distributions RPC — Single round-trip bundle
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_distributions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
    v_leaving_years JSON;
    v_joining_years JSON;
    v_top_companies JSON;
    v_countries JSON;
    v_branches JSON;
    v_sectors JSON;
    v_categories JSON;
BEGIN
    -- 1. Leaving Years
    SELECT json_agg(row_to_json(ly)) INTO v_leaving_years FROM (
        SELECT leaving_year AS year, COUNT(*)::INT AS count
        FROM public.alumni
        WHERE leaving_year IS NOT NULL
        GROUP BY leaving_year
        ORDER BY leaving_year ASC
    ) ly;

    -- 2. Joining Years
    SELECT json_agg(row_to_json(jy)) INTO v_joining_years FROM (
        SELECT joining_year AS year, COUNT(*)::INT AS count
        FROM public.alumni
        WHERE joining_year IS NOT NULL
        GROUP BY joining_year
        ORDER BY joining_year ASC
    ) jy;

    -- 3. Top Companies (limit 15)
    SELECT json_agg(row_to_json(tc)) INTO v_top_companies FROM (
        SELECT current_company AS company, COUNT(*)::INT AS count
        FROM public.alumni
        WHERE current_company IS NOT NULL AND TRIM(current_company) != ''
        GROUP BY current_company
        ORDER BY count DESC, current_company ASC
        LIMIT 15
    ) tc;

    -- 4. Countries (limit 20)
    SELECT json_agg(row_to_json(c)) INTO v_countries FROM (
        SELECT country, COUNT(*)::INT AS count
        FROM public.alumni
        WHERE country IS NOT NULL AND TRIM(country) != ''
        GROUP BY country
        ORDER BY count DESC, country ASC
        LIMIT 20
    ) c;

    -- 5. Academic Branches (limit 20)
    SELECT json_agg(row_to_json(b)) INTO v_branches FROM (
        SELECT academic_branch AS branch, COUNT(*)::INT AS count
        FROM public.alumni
        WHERE academic_branch IS NOT NULL 
          AND TRIM(academic_branch) != ''
          AND (
              UPPER(TRIM(academic_branch)) IN (
                  'CSE', 'ISE', 'ECE', 'EEE', 'ME', 'CV',
                  'AIML', 'MCA', 'MBA',
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
              OR academic_branch ILIKE '%computer science%'
              OR academic_branch ILIKE '%information science%'
              OR academic_branch ILIKE '%electronics and communication%'
              OR academic_branch ILIKE '%electronics and instrumentation%'
              OR academic_branch ILIKE '%electrical and electronics%'
              OR academic_branch ILIKE '%mechanical engineering%'
              OR academic_branch ILIKE '%civil engineering%'
              OR academic_branch ILIKE '%artificial intelligence%'
              OR academic_branch ILIKE '%machine learning%'
              OR academic_branch ILIKE '%cyber security%'
              OR academic_branch ILIKE '%data science%'
              OR academic_branch ILIKE '%biotechnology%'
              OR academic_branch ILIKE '%instrumentation engineering%'
              OR academic_branch ILIKE '%master of computer%'
              OR academic_branch ILIKE '%master of business%'
          )
        GROUP BY academic_branch
        ORDER BY count DESC, academic_branch ASC
        LIMIT 20
    ) b;

    -- 6. Sectors (limit 15)
    SELECT json_agg(row_to_json(s)) INTO v_sectors FROM (
        SELECT company_sector AS sector, COUNT(*)::INT AS count
        FROM public.alumni
        WHERE company_sector IS NOT NULL AND TRIM(company_sector) != ''
        GROUP BY company_sector
        ORDER BY count DESC, company_sector ASC
        LIMIT 15
    ) s;

    -- 7. Primary Categories
    SELECT json_agg(row_to_json(cat)) INTO v_categories FROM (
        SELECT primary_category AS category, COUNT(*)::INT AS count
        FROM public.alumni
        WHERE primary_category IS NOT NULL AND TRIM(primary_category) != ''
        GROUP BY primary_category
        ORDER BY count DESC, primary_category ASC
    ) cat;

    RETURN json_build_object(
        'leaving_years', COALESCE(v_leaving_years, '[]'::JSON),
        'joining_years', COALESCE(v_joining_years, '[]'::JSON),
        'top_companies', COALESCE(v_top_companies, '[]'::JSON),
        'countries', COALESCE(v_countries, '[]'::JSON),
        'branches', COALESCE(v_branches, '[]'::JSON),
        'sectors', COALESCE(v_sectors, '[]'::JSON),
        'categories', COALESCE(v_categories, '[]'::JSON)
    );
END;
$$;

-- ============================================================
-- 3. Individual Granular Distribution RPCs
-- ============================================================

-- Leaving Year Distribution
CREATE OR REPLACE FUNCTION public.get_alumni_by_leaving_year()
RETURNS TABLE (
    year INTEGER,
    count BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT a.leaving_year AS year, COUNT(*) AS count
    FROM public.alumni a
    WHERE a.leaving_year IS NOT NULL
    GROUP BY a.leaving_year
    ORDER BY a.leaving_year ASC;
END;
$$;

-- Joining Year Distribution
CREATE OR REPLACE FUNCTION public.get_alumni_by_joining_year()
RETURNS TABLE (
    year INTEGER,
    count BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT a.joining_year AS year, COUNT(*) AS count
    FROM public.alumni a
    WHERE a.joining_year IS NOT NULL
    GROUP BY a.joining_year
    ORDER BY a.joining_year ASC;
END;
$$;

-- Top Companies Distribution (limit 15)
CREATE OR REPLACE FUNCTION public.get_top_companies(p_limit INTEGER DEFAULT 15)
RETURNS TABLE (
    company TEXT,
    count BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
    v_limit INTEGER;
BEGIN
    v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 15), 50));
    RETURN QUERY
    SELECT a.current_company AS company, COUNT(*) AS count
    FROM public.alumni a
    WHERE a.current_company IS NOT NULL AND TRIM(a.current_company) != ''
    GROUP BY a.current_company
    ORDER BY count DESC, a.current_company ASC
    LIMIT v_limit;
END;
$$;

-- Alumni by Country Distribution (limit 20)
CREATE OR REPLACE FUNCTION public.get_alumni_by_country(p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
    country TEXT,
    count BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
    v_limit INTEGER;
BEGIN
    v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 20), 100));
    RETURN QUERY
    SELECT a.country, COUNT(*) AS count
    FROM public.alumni a
    WHERE a.country IS NOT NULL AND TRIM(a.country) != ''
    GROUP BY a.country
    ORDER BY count DESC, a.country ASC
    LIMIT v_limit;
END;
$$;

-- Alumni by Academic Branch Distribution (limit 20)
CREATE OR REPLACE FUNCTION public.get_alumni_by_branch(p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
    branch TEXT,
    count BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
    v_limit INTEGER;
BEGIN
    v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 20), 100));
    RETURN QUERY
    SELECT a.academic_branch AS branch, COUNT(*) AS count
    FROM public.alumni a
    WHERE a.academic_branch IS NOT NULL 
      AND TRIM(a.academic_branch) != ''
      AND (
          UPPER(TRIM(a.academic_branch)) IN (
              'CSE', 'ISE', 'ECE', 'EEE', 'ME', 'CV',
              'AIML', 'MCA', 'MBA',
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
          OR a.academic_branch ILIKE '%computer science%'
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
      )
    GROUP BY a.academic_branch
    ORDER BY count DESC, a.academic_branch ASC
    LIMIT v_limit;
END;
$$;

-- Alumni by Sector Distribution (limit 15)
CREATE OR REPLACE FUNCTION public.get_alumni_by_sector(p_limit INTEGER DEFAULT 15)
RETURNS TABLE (
    sector TEXT,
    count BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
    v_limit INTEGER;
BEGIN
    v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 15), 50));
    RETURN QUERY
    SELECT a.company_sector AS sector, COUNT(*) AS count
    FROM public.alumni a
    WHERE a.company_sector IS NOT NULL AND TRIM(a.company_sector) != ''
    GROUP BY a.company_sector
    ORDER BY count DESC, a.company_sector ASC
    LIMIT v_limit;
END;
$$;

-- Alumni by Primary Category Distribution
CREATE OR REPLACE FUNCTION public.get_alumni_by_category()
RETURNS TABLE (
    category TEXT,
    count BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT a.primary_category AS category, COUNT(*) AS count
    FROM public.alumni a
    WHERE a.primary_category IS NOT NULL AND TRIM(primary_category) != ''
    GROUP BY a.primary_category
    ORDER BY count DESC, a.primary_category ASC;
END;
$$;

-- ============================================================
-- 4. Explicit Security Grants and Revocations
-- ============================================================
REVOKE ALL ON FUNCTION public.get_dashboard_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary() TO authenticated;

REVOKE ALL ON FUNCTION public.get_dashboard_distributions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_distributions() TO authenticated;

REVOKE ALL ON FUNCTION public.get_alumni_by_leaving_year() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_alumni_by_leaving_year() TO authenticated;

REVOKE ALL ON FUNCTION public.get_alumni_by_joining_year() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_alumni_by_joining_year() TO authenticated;

REVOKE ALL ON FUNCTION public.get_top_companies(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_top_companies(INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.get_alumni_by_country(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_alumni_by_country(INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.get_alumni_by_branch(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_alumni_by_branch(INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.get_alumni_by_sector(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_alumni_by_sector(INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.get_alumni_by_category() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_alumni_by_category() TO authenticated;
