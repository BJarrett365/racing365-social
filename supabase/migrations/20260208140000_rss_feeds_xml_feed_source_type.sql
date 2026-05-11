-- Allow XML-only feed source type (RSS 2.0 / Atom URLs; no HTML listing fallback)
alter table public.rss_feeds drop constraint if exists rss_feeds_source_type_check;

alter table public.rss_feeds add constraint rss_feeds_source_type_check
  check (source_type in ('rss_url', 'xml_feed', 'site_url', 'manual_urls', 'topic', 'sitemap'));
