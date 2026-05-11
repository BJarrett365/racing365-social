-- RSS bundles: one display name per trimmed, case-insensitive value.
-- Rename duplicate legacy rows so a unique expression index can be created.

with ranked as (
  select
    id,
    row_number() over (partition by lower(trim(name)) order by created_at asc) as rn
  from public.rss_bundles
)
update public.rss_bundles b
set name = trim(b.name) || ' (' || (r.rn - 1)::text || ')'
from ranked r
where b.id = r.id
  and r.rn > 1;

update public.rss_bundles
set name = trim(name)
where name <> trim(name);

create unique index if not exists rss_bundles_lower_trim_name_key
  on public.rss_bundles ((lower(trim(name))));
