-- RSS Import Builder — feeds, items, bundles, filters, translation, crawl logs, blocked domains
-- Run in Supabase SQL editor or via supabase db push

create extension if not exists "pgcrypto";

-- --- Feeds -----------------------------------------------------------------
create table if not exists public.rss_feeds (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  export_token text not null default encode(gen_random_bytes(24), 'hex'),
  name text not null,
  source_type text not null default 'rss_url'
    check (source_type in ('rss_url', 'site_url', 'manual_urls', 'topic', 'sitemap')),
  source_url text,
  manual_urls text,
  status text not null default 'active' check (status in ('active', 'paused', 'failed')),
  crawl_frequency text not null default '1h'
    check (crawl_frequency in ('25m', '30m', '1h', '24h')),
  posts_per_feed int not null default 50 check (posts_per_feed >= 1 and posts_per_feed <= 500),
  include_images boolean not null default true,
  include_media_enclosure boolean not null default true,
  use_fallback_image boolean not null default false,
  limit_title_length boolean not null default false,
  title_max_chars int not null default 100 check (title_max_chars >= 10 and title_max_chars <= 500),
  enable_html_description boolean not null default true,
  include_thumbnail boolean not null default true,
  include_all_images boolean not null default false,
  include_videos boolean not null default false,
  limit_description_length boolean not null default false,
  description_max_chars int not null default 200 check (description_max_chars >= 20 and description_max_chars <= 20000),
  starred boolean not null default false,
  last_crawled_at timestamptz,
  next_crawl_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rss_feeds_next_crawl_idx on public.rss_feeds (next_crawl_at) where status = 'active';

-- --- Items -----------------------------------------------------------------
create table if not exists public.rss_feed_items (
  id uuid primary key default gen_random_uuid(),
  feed_id uuid not null references public.rss_feeds (id) on delete cascade,
  item_key text not null,
  title text not null default '',
  link text not null,
  description_html text not null default '',
  image_url text,
  enclosure_url text,
  published_at timestamptz,
  source_domain text,
  status text not null default 'visible' check (status in ('visible', 'hidden', 'blocked')),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  unique (feed_id, item_key)
);

create index if not exists rss_feed_items_feed_published_idx on public.rss_feed_items (feed_id, published_at desc nulls last);

-- --- Blocked domains -------------------------------------------------------
create table if not exists public.rss_feed_blocked_domains (
  feed_id uuid not null references public.rss_feeds (id) on delete cascade,
  domain text not null,
  created_at timestamptz not null default now(),
  primary key (feed_id, domain)
);

-- --- Filters (one row per feed, JSON config) -------------------------------
create table if not exists public.rss_feed_filters (
  feed_id uuid primary key references public.rss_feeds (id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- --- Translation settings --------------------------------------------------
create table if not exists public.rss_feed_translation_settings (
  feed_id uuid primary key references public.rss_feeds (id) on delete cascade,
  enabled boolean not null default false,
  from_lang text not null default 'auto',
  to_lang text not null default 'en',
  provider text not null default 'deepl' check (provider in ('deepl', 'google', 'openai')),
  updated_at timestamptz not null default now()
);

-- --- Bundles ---------------------------------------------------------------
create table if not exists public.rss_bundles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  export_token text not null default encode(gen_random_bytes(24), 'hex'),
  name text not null,
  starred boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rss_bundle_feeds (
  bundle_id uuid not null references public.rss_bundles (id) on delete cascade,
  feed_id uuid not null references public.rss_feeds (id) on delete cascade,
  primary key (bundle_id, feed_id)
);

-- --- Crawl logs ------------------------------------------------------------
create table if not exists public.rss_feed_crawl_logs (
  id uuid primary key default gen_random_uuid(),
  feed_id uuid not null references public.rss_feeds (id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'ok', 'error')),
  items_seen int not null default 0,
  items_upserted int not null default 0,
  error_message text
);

create index if not exists rss_feed_crawl_logs_feed_idx on public.rss_feed_crawl_logs (feed_id, started_at desc);

comment on table public.rss_feeds is 'RSS Import Builder — source feeds; export via slug + export_token query param.';
comment on table public.rss_feed_items is 'Normalized RSS/Atom items per feed; output only, not full articles.';
