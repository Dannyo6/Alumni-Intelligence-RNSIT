# Archived Prototype SQL Scripts

> [!CAUTION]
> **DO NOT RUN THESE SCRIPTS AGAINST PRODUCTION.**
>
> The live production Supabase instance runs on **Schema v1** and contains:
> - `public.profiles`
> - `public.alumni`
> - `public.import_jobs`
> - `public.import_staging_rows`
> - `public.import_errors`
> - `public.duplicate_candidates`
>
> Legacy prototype structures have been migrated to the `legacy` schema (`legacy.alumni`, `legacy.admin_users`, `legacy.sync_history`).
>
> Do NOT create or recreate:
> - `public.admin_users`
> - `public.sync_history`
> - Prototype `public.alumni`
> - `public.is_admin()` function

## Archived Files

- `legacy_prototype_schema.sql`: Initial prototype tables with `admin_users` and old `alumni` fields.
- `legacy_sync_history.sql`: Prototype sync auditing table and `alumni_id` unique constraint.
- `legacy_source_order_patch.sql`: Prototype patch adding `source_sheet` and `source_row`.
