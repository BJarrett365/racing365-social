-- Fix "permission denied for table rss_feeds" when using the service_role key with PostgREST.
-- Ensures schema usage + explicit table privileges for service_role (and postgres owner).
-- Safe to run even if 20260209140000_rss_builder_privileges.sql already ran.

grant usage on schema public to service_role;

alter table if exists public.rss_feeds owner to postgres;
alter table if exists public.rss_feed_items owner to postgres;
alter table if exists public.rss_feed_blocked_domains owner to postgres;
alter table if exists public.rss_feed_filters owner to postgres;
alter table if exists public.rss_feed_translation_settings owner to postgres;
alter table if exists public.rss_bundles owner to postgres;
alter table if exists public.rss_bundle_feeds owner to postgres;
alter table if exists public.rss_feed_crawl_logs owner to postgres;

grant select, insert, update, delete, truncate, references, trigger on table public.rss_feeds to service_role;
grant select, insert, update, delete, truncate, references, trigger on table public.rss_feed_items to service_role;
grant select, insert, update, delete, truncate, references, trigger on table public.rss_feed_blocked_domains to service_role;
grant select, insert, update, delete, truncate, references, trigger on table public.rss_feed_filters to service_role;
grant select, insert, update, delete, truncate, references, trigger on table public.rss_feed_translation_settings to service_role;
grant select, insert, update, delete, truncate, references, trigger on table public.rss_bundles to service_role;
grant select, insert, update, delete, truncate, references, trigger on table public.rss_bundle_feeds to service_role;
grant select, insert, update, delete, truncate, references, trigger on table public.rss_feed_crawl_logs to service_role;
