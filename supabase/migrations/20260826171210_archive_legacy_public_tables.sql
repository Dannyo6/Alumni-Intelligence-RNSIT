CREATE SCHEMA IF NOT EXISTS legacy;
ALTER TABLE public.alumni SET SCHEMA legacy;
ALTER TABLE public.admin_users SET SCHEMA legacy;
ALTER TABLE public.sync_history SET SCHEMA legacy;
REVOKE ALL ON SCHEMA legacy FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA legacy FROM PUBLIC, anon, authenticated;
