-- Language Studio isolated schema.
-- Run manually in Supabase when moving Language Studio off local JSON storage.
-- This file creates new tables only and does not modify existing Plexa tables.

create table if not exists language_imports (
  id text primary key,
  source_brand text not null,
  source_language text not null,
  source_url text,
  title text not null,
  article_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists language_articles (
  id text primary key,
  import_id text references language_imports(id) on delete cascade,
  source_brand text not null,
  source_language text not null,
  source_url text,
  canonical_url text,
  source_article_id text,
  author text,
  publish_date text,
  modified_date text,
  category text,
  tags jsonb not null default '[]'::jsonb,
  image_url text,
  image_library_rel text,
  title text not null,
  standfirst text,
  body text,
  social_embeds jsonb not null default '[]'::jsonb,
  seo_title text,
  meta_description text,
  slug text,
  status text not null default 'imported',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists language_translations (
  id text primary key,
  article_id text references language_articles(id) on delete cascade,
  target_language text not null,
  provider_mode text not null default 'openai',
  translation_mode text not null default 'translate-localise',
  title text,
  standfirst text,
  body text,
  social_embeds jsonb not null default '[]'::jsonb,
  seo_title text,
  meta_description text,
  tags jsonb not null default '[]'::jsonb,
  slug text,
  status text not null default 'draft',
  editor_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz
);

create table if not exists language_reviews (
  id text primary key,
  translation_id text references language_translations(id) on delete cascade,
  reviewer text,
  status text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists language_glossary (
  id text primary key,
  brand text not null default 'Global',
  source_term text not null,
  target_language text,
  target_term text,
  protected boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists language_rules (
  id text primary key,
  brand text not null default 'Global',
  target_language text,
  market text,
  field_type text,
  title text not null,
  rule text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists language_knowledge_files (
  id text primary key,
  title text not null,
  kind text not null,
  language text,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists language_exports (
  id text primary key,
  translation_id text references language_translations(id) on delete cascade,
  article_id text references language_articles(id) on delete cascade,
  target_language text not null,
  format text not null,
  payload text not null,
  created_at timestamptz not null default now()
);

create table if not exists language_audit_logs (
  id text primary key,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);

create table if not exists language_clients (
  id text primary key,
  name text not null,
  contact_email text,
  active boolean not null default true,
  allowed_brands jsonb not null default '[]'::jsonb,
  allowed_languages jsonb not null default '[]'::jsonb,
  allowed_formats jsonb not null default '["xml","json"]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists language_client_api_keys (
  id text primary key,
  client_id text references language_clients(id) on delete cascade,
  label text not null,
  key_hash text not null unique,
  key_prefix text not null,
  active boolean not null default true,
  allowed_brands jsonb not null default '[]'::jsonb,
  allowed_languages jsonb not null default '[]'::jsonb,
  allowed_formats jsonb not null default '["xml","json"]'::jsonb,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create table if not exists language_client_access_logs (
  id text primary key,
  client_id text references language_clients(id) on delete cascade,
  api_key_id text references language_client_api_keys(id) on delete cascade,
  format text not null,
  path text not null,
  status int not null,
  detail text,
  created_at timestamptz not null default now()
);
