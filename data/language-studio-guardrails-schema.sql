-- Language Studio guardrails and governance schema.
-- Creates new tables only. Does not alter existing Plexa or Language Studio tables.

create table if not exists language_guardrails (
  id text primary key,
  category text not null,
  title text not null,
  rule text not null,
  severity text not null default 'amber',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists language_knowledge_files (
  id text primary key,
  type text not null,
  brand text,
  language text,
  market text,
  title text not null,
  content jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists language_glossary (
  id text primary key,
  term text not null,
  language text,
  approved_translation text,
  forbidden_translation text,
  notes text,
  priority int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists language_protected_terms (
  id text primary key,
  term text not null,
  type text not null,
  do_not_translate boolean not null default true,
  approved_variants jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists language_market_rules (
  id text primary key,
  market text not null,
  language text not null,
  locale text not null,
  direction text not null default 'ltr',
  seo_keyword_rules text,
  tone_rules text,
  spelling_rules text,
  headline_style_notes text,
  seo_notes text,
  date_format text,
  time_format text,
  currency_format text,
  compliance_notes text,
  fallback_provider text not null default 'openai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists language_sport_rules (
  id text primary key,
  sport text not null,
  key_terms jsonb not null default '[]'::jsonb,
  data_rules text,
  protected_stats jsonb not null default '[]'::jsonb,
  naming_conventions text,
  examples text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists language_prompt_rules (
  id text primary key,
  language text,
  content_type text not null,
  prompt_instruction text not null,
  priority int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists language_compliance_notes (
  id text primary key,
  market text not null,
  risk_type text not null,
  rule text not null,
  action text,
  escalation_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists language_translation_memory (
  id text primary key,
  source_text text not null,
  approved_translation text not null,
  language text not null,
  brand text not null,
  market text,
  editor text,
  date_approved timestamptz not null,
  usage_count int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists language_quality_checks (
  id text primary key,
  translation_id text not null,
  article_id text not null,
  score text not null,
  issues jsonb not null default '[]'::jsonb,
  override_by text,
  override_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
