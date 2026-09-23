-- ============================================================
-- RETRIEVAL
-- These are security invoker on purpose. That means row level
-- security still applies inside them, so company isolation is
-- enforced by the database itself rather than by remembering to
-- add a where clause. A caller physically cannot reach another
-- company's rows through these.
-- ============================================================

-- Pull the company material a specific task needs. This is the
-- retrieval step: it returns the source name and description
-- alongside the text, so the written prompt can carry each fact
-- with where it came from.
create or replace function public.match_knowledge(
  query_embedding extensions.vector(1536),
  match_count integer default 8
)
returns table (
  chunk_id            uuid,
  source_id           uuid,
  source_name         text,
  source_description  text,
  content             text,
  similarity          double precision
)
language sql
stable
set search_path = public, extensions
as $$
  select
    c.id,
    c.source_id,
    s.name,
    s.description,
    c.content,
    1 - (c.embedding <=> query_embedding)
  from public.knowledge_chunks c
  join public.knowledge_sources s on s.id = c.source_id
  where c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count
$$;

-- Find past work that resembles what is being asked for now.
-- This is what lets the interview say "same setup as last time?"
-- instead of asking everything again.
create or replace function public.match_work_history(
  query_embedding extensions.vector(1536),
  match_count integer default 5
)
returns table (
  id                  uuid,
  title               text,
  summary             text,
  skill               text,
  storage_location    text,
  created_at          timestamptz,
  similarity          double precision
)
language sql
stable
set search_path = public, extensions
as $$
  select
    w.id,
    w.title,
    w.summary,
    w.skill,
    w.storage_location,
    w.created_at,
    1 - (w.embedding <=> query_embedding)
  from public.work_history w
  where w.embedding is not null
  order by w.embedding <=> query_embedding
  limit match_count
$$;

-- ============================================================
-- EFFECTIVE LIMITS
-- A staff member with no custom setting falls back to the
-- company default. Reading through this view means nothing in
-- the app has to remember that rule.
-- ============================================================

create or replace view public.staff_effective_limits
with (security_invoker = true)
as
select
  s.id,
  s.company_id,
  s.name,
  s.role,
  s.access_level,
  coalesce(s.model_ceiling, c.default_model_ceiling) as model_ceiling,
  coalesce(s.daily_limit,  c.default_daily_limit)    as daily_limit,
  (s.model_ceiling is null) as ceiling_is_default,
  (s.daily_limit  is null) as limit_is_default
from public.staff s
join public.companies c on c.id = s.company_id;
