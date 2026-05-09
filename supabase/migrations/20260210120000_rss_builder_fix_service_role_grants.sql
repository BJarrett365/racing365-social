-- Fix "permission denied for table rss_feeds" when using the service_role key with PostgREST.
-- Grants USAGE on schema public + explicit DML on all rss_* tables for service_role.
-- Safe to run multiple times. Does NOT change table owners (ALTER OWNER can fail and roll back the whole script).
--
-- Run in the SQL Editor of the SAME Supabase project as your app URL (.env.local / Admin), including local Next.js dev.

grant usage on schema public to service_role;

grant select, insert, update, delete, truncate, references, trigger on table public.rss_feeds to service_role;
grant select, insert, update, delete, truncate, references, trigger on table public.rss_feed_items to service_role;
grant select, insert, update, delete, truncate, references, trigger on table public.rss_feed_blocked_domains to service_role;
grant select, insert, update, delete, truncate, references, trigger on table public.rss_feed_filters to service_role;
grant select, insert, update, delete, truncate, references, trigger on table public.rss_feed_translation_settings to service_role;
grant select, insert, update, delete, truncate, references, trigger on table public.rss_bundles to service_role;
grant select, insert, update, delete, truncate, references, trigger on table public.rss_bundle_feeds to service_role;
grant select, insert, update, delete, truncate, references, trigger on table public.rss_feed_crawl_logs to service_role;
