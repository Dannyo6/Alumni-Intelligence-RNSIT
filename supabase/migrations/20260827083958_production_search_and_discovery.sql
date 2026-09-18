-- ==============================================================================
-- Migration: Production Search & Discovery RPCs (Schema v1)
-- Description: Adds high-performance server-side search, filtering, and option
-- retrieval functions for public.alumni without altering existing data.
-- ==============================================================================

-- 1. Search Alumni RPC with Whitelist Sorting, Multi-filter AND, and Pagination
CREATE OR REPLACE FUNCTION public.search_alumni(
    p_query TEXT DEFAULT NULL,
    p_year_exact INTEGER DEFAULT NULL,
    p_year_start INTEGER DEFAULT NULL,
    p_year_end INTEGER DEFAULT NULL,
    p_branch_aliases TEXT[] DEFAULT NULL,
    p_country_aliases TEXT[] DEFAULT NULL,
    p_company_aliases TEXT[] DEFAULT NULL,
    p_company TEXT DEFAULT NULL,
    p_designation TEXT DEFAULT NULL,
    p_sector TEXT DEFAULT NULL,
    p_academic_branch TEXT DEFAULT NULL,
    p_country TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_joining_year INTEGER DEFAULT NULL,
    p_leaving_year INTEGER DEFAULT NULL,
    p_primary_category TEXT DEFAULT NULL,
    p_is_high_value BOOLEAN DEFAULT NULL,
    p_is_global BOOLEAN DEFAULT NULL,
    p_is_top_employer BOOLEAN DEFAULT NULL,
    p_is_student_or_rnsit BOOLEAN DEFAULT NULL,
    p_needs_verification BOOLEAN DEFAULT NULL,
    p_has_email BOOLEAN DEFAULT NULL,
    p_has_mobile BOOLEAN DEFAULT NULL,
    p_sort_by TEXT DEFAULT 'value_score',
    p_sort_order TEXT DEFAULT 'desc',
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    name_normalized TEXT,
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
    alternate_emails TEXT[],
    email_normalized TEXT,
    mobile TEXT,
    mobile_normalized TEXT,
    mobile_valid BOOLEAN,
    joining_year INTEGER,
    leaving_year INTEGER,
    branch_or_designation_raw TEXT,
    academic_branch TEXT,
    rnsit_role TEXT,
    profile_link TEXT,
    profile_link_normalized TEXT,
    linkedin_url TEXT,
    primary_category TEXT,
    is_high_value BOOLEAN,
    is_top_employer BOOLEAN,
    is_global BOOLEAN,
    is_student_or_rnsit BOOLEAN,
    needs_verification BOOLEAN,
    value_score INTEGER,
    status TEXT,
    data_confidence TEXT,
    notes TEXT,
    source_workbook TEXT,
    source_sheet TEXT,
    last_import_job_id UUID,
    last_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    total_count BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
    v_offset INTEGER;
    v_limit INTEGER;
    v_clean_query TEXT;
BEGIN
    -- Sanitize pagination
    v_limit := GREATEST(1, LEAST(p_page_size, 100));
    v_offset := (GREATEST(1, p_page) - 1) * v_limit;
    v_clean_query := NULLIF(TRIM(p_query), '');

    RETURN QUERY
    WITH filtered AS (
        SELECT 
            a.*,
            COUNT(*) OVER() AS full_count
        FROM public.alumni a
        WHERE
            -- 1. General Text Search / Search Vector / Aliases
            (
                -- Case A: No text query and no aliases supplied -> No text restriction
                (v_clean_query IS NULL AND p_branch_aliases IS NULL AND p_country_aliases IS NULL AND p_company_aliases IS NULL)
                OR (
                    -- Case B1: Explicit text query matching
                    (v_clean_query IS NOT NULL AND (
                        -- Search vector matching using 'simple' config matching public.alumni.search_vector
                        (a.search_vector IS NOT NULL AND a.search_vector @@ plainto_tsquery('simple', v_clean_query))
                        -- Fallback ILIKE on key fields
                        OR a.name ILIKE '%' || v_clean_query || '%'
                        OR a.current_company ILIKE '%' || v_clean_query || '%'
                        OR a.current_designation ILIKE '%' || v_clean_query || '%'
                        OR a.company_sector ILIKE '%' || v_clean_query || '%'
                        OR a.city ILIKE '%' || v_clean_query || '%'
                        OR a.country ILIKE '%' || v_clean_query || '%'
                        OR a.academic_branch ILIKE '%' || v_clean_query || '%'
                        OR a.branch_or_designation_raw ILIKE '%' || v_clean_query || '%'
                    ))
                    -- Case B2: Branch alias array matching
                    OR (p_branch_aliases IS NOT NULL AND EXISTS (
                        SELECT 1 FROM unnest(p_branch_aliases) b_alias 
                        WHERE a.academic_branch ILIKE '%' || b_alias || '%' 
                           OR a.branch_or_designation_raw ILIKE '%' || b_alias || '%'
                    ))
                    -- Case B3: Country alias array matching
                    OR (p_country_aliases IS NOT NULL AND EXISTS (
                        SELECT 1 FROM unnest(p_country_aliases) c_alias 
                        WHERE a.country ILIKE '%' || c_alias || '%'
                    ))
                    -- Case B4: Company alias array matching
                    OR (p_company_aliases IS NOT NULL AND EXISTS (
                        SELECT 1 FROM unnest(p_company_aliases) comp_alias 
                        WHERE a.current_company ILIKE '%' || comp_alias || '%'
                    ))
                )
            )
            -- 2. Parsed Year exact match (joining_year OR leaving_year)
            AND (
                p_year_exact IS NULL
                OR a.joining_year = p_year_exact
                OR a.leaving_year = p_year_exact
            )
            -- 3. Parsed Year Range overlap (joining_year <= end AND leaving_year >= start)
            AND (
                (p_year_start IS NULL OR p_year_end IS NULL)
                OR (
                    COALESCE(a.joining_year, a.leaving_year) <= p_year_end
                    AND COALESCE(a.leaving_year, a.joining_year) >= p_year_start
                )
            )
            -- 4. Structured Filters
            AND (p_company IS NULL OR a.current_company ILIKE '%' || p_company || '%')
            AND (p_designation IS NULL OR a.current_designation ILIKE '%' || p_designation || '%')
            AND (p_sector IS NULL OR a.company_sector = p_sector)
            AND (p_academic_branch IS NULL OR a.academic_branch ILIKE '%' || p_academic_branch || '%' OR a.branch_or_designation_raw ILIKE '%' || p_academic_branch || '%')
            AND (p_country IS NULL OR a.country = p_country)
            AND (p_city IS NULL OR a.city ILIKE '%' || p_city || '%')
            AND (p_joining_year IS NULL OR a.joining_year = p_joining_year)
            AND (p_leaving_year IS NULL OR a.leaving_year = p_leaving_year)
            AND (p_primary_category IS NULL OR a.primary_category = p_primary_category)
            AND (p_is_high_value IS NULL OR a.is_high_value = p_is_high_value)
            AND (p_is_global IS NULL OR a.is_global = p_is_global)
            AND (p_is_top_employer IS NULL OR a.is_top_employer = p_is_top_employer)
            AND (p_is_student_or_rnsit IS NULL OR a.is_student_or_rnsit = p_is_student_or_rnsit)
            AND (p_needs_verification IS NULL OR a.needs_verification = p_needs_verification)
            AND (
                p_has_email IS NULL 
                OR (p_has_email = TRUE AND a.email IS NOT NULL AND TRIM(a.email) != '')
                OR (p_has_email = FALSE AND (a.email IS NULL OR TRIM(a.email) = ''))
            )
            AND (
                p_has_mobile IS NULL 
                OR (p_has_mobile = TRUE AND a.mobile IS NOT NULL AND TRIM(a.mobile) != '')
                OR (p_has_mobile = FALSE AND (a.mobile IS NULL OR TRIM(a.mobile) = ''))
            )
    )
    SELECT
        f.id,
        f.name,
        f.name_normalized,
        f.current_company,
        f.current_company_normalized,
        f.current_designation,
        f.designation_normalized,
        f.company_sector,
        f.city,
        f.city_normalized,
        f.country,
        f.country_code,
        f.email,
        f.alternate_emails,
        f.email_normalized,
        f.mobile,
        f.mobile_normalized,
        f.mobile_valid,
        f.joining_year,
        f.leaving_year,
        f.branch_or_designation_raw,
        f.academic_branch,
        f.rnsit_role,
        f.profile_link,
        f.profile_link_normalized,
        f.linkedin_url,
        f.primary_category,
        f.is_high_value,
        f.is_top_employer,
        f.is_global,
        f.is_student_or_rnsit,
        f.needs_verification,
        f.value_score,
        f.status,
        f.data_confidence,
        f.notes,
        f.source_workbook,
        f.source_sheet,
        f.last_import_job_id,
        f.last_verified_at,
        f.created_at,
        f.updated_at,
        f.full_count AS total_count
    FROM filtered f
    ORDER BY
        -- Whitelist sorting logic
        CASE WHEN p_sort_by = 'name' AND LOWER(p_sort_order) = 'asc' THEN f.name END ASC NULLS LAST,
        CASE WHEN p_sort_by = 'name' AND LOWER(p_sort_order) = 'desc' THEN f.name END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'current_company' AND LOWER(p_sort_order) = 'asc' THEN f.current_company END ASC NULLS LAST,
        CASE WHEN p_sort_by = 'current_company' AND LOWER(p_sort_order) = 'desc' THEN f.current_company END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'current_designation' AND LOWER(p_sort_order) = 'asc' THEN f.current_designation END ASC NULLS LAST,
        CASE WHEN p_sort_by = 'current_designation' AND LOWER(p_sort_order) = 'desc' THEN f.current_designation END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'joining_year' AND LOWER(p_sort_order) = 'asc' THEN f.joining_year END ASC NULLS LAST,
        CASE WHEN p_sort_by = 'joining_year' AND LOWER(p_sort_order) = 'desc' THEN f.joining_year END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'leaving_year' AND LOWER(p_sort_order) = 'asc' THEN f.leaving_year END ASC NULLS LAST,
        CASE WHEN p_sort_by = 'leaving_year' AND LOWER(p_sort_order) = 'desc' THEN f.leaving_year END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'value_score' AND LOWER(p_sort_order) = 'asc' THEN f.value_score END ASC NULLS LAST,
        CASE WHEN p_sort_by = 'value_score' AND LOWER(p_sort_order) = 'desc' THEN f.value_score END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'updated_at' AND LOWER(p_sort_order) = 'asc' THEN f.updated_at END ASC NULLS LAST,
        CASE WHEN p_sort_by = 'updated_at' AND LOWER(p_sort_order) = 'desc' THEN f.updated_at END DESC NULLS LAST,
        -- Default fallback sort
        f.value_score DESC NULLS LAST,
        f.created_at DESC
    LIMIT v_limit
    OFFSET v_offset;
END;
$$;

-- 2. Fast Filter Options RPC (Returning JSON string arrays)
CREATE OR REPLACE FUNCTION public.get_directory_filter_options()
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
    v_branches JSON;
    v_countries JSON;
    v_categories JSON;
    v_sectors JSON;
BEGIN
    SELECT json_agg(academic_branch) INTO v_branches FROM (
        SELECT DISTINCT academic_branch 
        FROM public.alumni 
        WHERE academic_branch IS NOT NULL AND TRIM(academic_branch) != '' 
        ORDER BY academic_branch ASC 
        LIMIT 100
    ) b;

    SELECT json_agg(country) INTO v_countries FROM (
        SELECT DISTINCT country 
        FROM public.alumni 
        WHERE country IS NOT NULL AND TRIM(country) != '' 
        ORDER BY country ASC 
        LIMIT 150
    ) c;

    SELECT json_agg(primary_category) INTO v_categories FROM (
        SELECT DISTINCT primary_category 
        FROM public.alumni 
        WHERE primary_category IS NOT NULL AND TRIM(primary_category) != '' 
        ORDER BY primary_category ASC
    ) cat;

    SELECT json_agg(company_sector) INTO v_sectors FROM (
        SELECT DISTINCT company_sector 
        FROM public.alumni 
        WHERE company_sector IS NOT NULL AND TRIM(company_sector) != '' 
        ORDER BY company_sector ASC 
        LIMIT 100
    ) s;

    RETURN json_build_object(
        'branches', COALESCE(v_branches, '[]'::JSON),
        'countries', COALESCE(v_countries, '[]'::JSON),
        'categories', COALESCE(v_categories, '[]'::JSON),
        'sectors', COALESCE(v_sectors, '[]'::JSON)
    );
END;
$$;

-- 3. Searchable Option RPC for High-Cardinality Fields (Company, Designation, City)
CREATE OR REPLACE FUNCTION public.search_directory_filter_options(
    p_field TEXT,
    p_query TEXT DEFAULT '',
    p_limit INTEGER DEFAULT 20
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
    v_limit INTEGER;
    v_clean TEXT;
    v_results JSON;
BEGIN
    v_limit := GREATEST(1, LEAST(p_limit, 50));
    v_clean := NULLIF(TRIM(p_query), '');

    IF p_field = 'company' THEN
        SELECT json_agg(current_company) INTO v_results FROM (
            SELECT DISTINCT current_company
            FROM public.alumni
            WHERE current_company IS NOT NULL AND TRIM(current_company) != ''
              AND (v_clean IS NULL OR current_company ILIKE '%' || v_clean || '%')
            ORDER BY current_company ASC
            LIMIT v_limit
        ) sub;
    ELSIF p_field = 'designation' THEN
        SELECT json_agg(current_designation) INTO v_results FROM (
            SELECT DISTINCT current_designation
            FROM public.alumni
            WHERE current_designation IS NOT NULL AND TRIM(current_designation) != ''
              AND (v_clean IS NULL OR current_designation ILIKE '%' || v_clean || '%')
            ORDER BY current_designation ASC
            LIMIT v_limit
        ) sub;
    ELSIF p_field = 'city' THEN
        SELECT json_agg(city) INTO v_results FROM (
            SELECT DISTINCT city
            FROM public.alumni
            WHERE city IS NOT NULL AND TRIM(city) != ''
              AND (v_clean IS NULL OR city ILIKE '%' || v_clean || '%')
            ORDER BY city ASC
            LIMIT v_limit
        ) sub;
    ELSE
        v_results := '[]'::JSON;
    END IF;

    RETURN COALESCE(v_results, '[]'::JSON);
END;
$$;

-- 4. Explicit Security Grants and Revocations with Complete Type Signatures
REVOKE ALL ON FUNCTION public.search_alumni(TEXT, INTEGER, INTEGER, INTEGER, TEXT[], TEXT[], TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_alumni(TEXT, INTEGER, INTEGER, INTEGER, TEXT[], TEXT[], TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.get_directory_filter_options() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_directory_filter_options() TO authenticated;

REVOKE ALL ON FUNCTION public.search_directory_filter_options(TEXT, TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_directory_filter_options(TEXT, TEXT, INTEGER) TO authenticated;
