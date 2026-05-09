-- RSS Import Builder — tighten privileges and disable RLS on server-only tables.
-- Resolves "new row violates row-level security policy for table rss_feeds" when the
-- anon key was used by mistake, or when RLS was enabled on these tables without policies.
--
-- Run in Supabase SQL Editor after 20260207120000_rss_import_builder.sql
-- If you see "permission denied for table rss_*" with the service_role key, also run
-- 20260210120000_rss_builder_fix_service_role_grants.sql (schema USAGE + explicit GRANTs).

alter table if exists public.rss_feeds disable row level security;
alter table if exists public.rss_feed_items disable row level security;
alter table if exists public.rss_feed_blocked_domains disable row level security;
alter table if exists public.rss_feed_filters disable row level security;
alter table if exists public.rss_feed_translation_settings disable row level security;
alter table if exists public.rss_bundles disable row level security;
alter table if exists public.rss_bundle_feeds disable row level security;
alter table if exists public.rss_feed_crawl_logs disable row level security;

revoke all on table public.rss_feeds from anon, authenticated;
revoke all on table public.rss_feed_items from anon, authenticated;
revoke all on table public.rss_feed_blocked_domains from anon, authenticated;
revoke all on table public.rss_feed_filters from anon, authenticated;
revoke all on table public.rss_feed_translation_settings from anon, authenticated;
revoke all on table public.rss_bundles from anon, authenticated;
revoke all on table public.rss_bundle_feeds from anon, authenticated;
revoke all on table public.rss_feed_crawl_logs from anon, authenticated;

revoke all on table public.rss_feeds FROM PUBLIC;
revoke all on table public.rss_feed_items FROM PUBLIC;
revoke all on table public.rss_feed_blocked_domains FROM PUBLIC;
revoke all on table public.rss_feed_filters FROM PUBLIC;
revoke all on table public.rss_feed_translation_settings FROM PUBLIC;
revoke all on table public.rss_bundles FROM PUBLIC;
revoke all on table public.rss_bundle_feeds FROM PUBLIC;
revoke all on table public.rss_feed_crawl_logs FROM PUBLIC;

grant all on table public.rss_feeds to service_role, postgres;
grant all on table public.rss_feed_items to service_role, postgres;
grant all on table public.rss_feed_blocked_domains to service_role, postgres;
grant all on table public.rss_feed_filters to service_role, postgres;
grant all on table public.rss_feed_translation_settings to service_role, postgres;
grant all on table public.rss_bundles to service_role, postgres;
grant all on table public.rss_bundle_feeds to service_role, postgres;
grant all on table public.rss_feed_crawl_logs to service_role, postgres;
