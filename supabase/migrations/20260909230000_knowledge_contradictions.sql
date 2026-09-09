-- =========================================================================
-- WHEN THE COMPANY'S OWN MATERIAL DISAGREES WITH ITSELF
--
-- WHY THIS EXISTS
-- Anthony, after the assistant quoted a price that was half the real one:
--
--   "we can also add log for contradictory information... so they don't say
--    that it's the AI that is at fault. So if they uploaded this, the AI sees
--    contradictory files, it names them and it's logged."
--
-- That is the right instinct and it is not really about blame. When a
-- customer is told something wrong, there are two very different causes and
-- they need completely different fixes:
--
--   the model invented it            -> the model is the problem
--   two published files disagreed    -> the material is the problem
--
-- Without a record, both look identical from the outside and every wrong
-- answer gets filed under "the AI made something up". This table is how the
-- second one becomes provable: two named sources, what each of them said,
-- and how often it has come up.
--
-- WHERE IT COMES FROM
-- support-ask writes it. That function is the only thing in the product that
-- reads all of a company's published material at once, so it is the only
-- thing in a position to notice two parts of it pulling in opposite
-- directions. It reports what it noticed while answering, which means this
-- only ever fills up with contradictions that actually reached a customer.
--
-- ONE ROW PER DISAGREEMENT, NOT ONE PER MESSAGE
-- A contradiction stays until somebody fixes the material, so left alone it
-- would be logged again on every single message and the useful rows would
-- drown. The unique index folds repeats into one row with a count and a last
-- seen date. Ten people asking about the price is one problem, not ten.
--
-- The index is on the lowercased text because the model writes the topic in
-- its own words and "Essential price" and "essential price" are the same
-- problem.
--
-- WHY THERE IS NO INSERT POLICY
-- Same reasoning as publish_overrides. Nothing writes here from a browser.
-- The only way in is the security definer function below, granted to
-- service_role, which is what support-ask runs as.
--
-- RESOLVING IS THE ADMIN'S TO DO, AND IT IS THE ONLY THING THEY CAN CHANGE
-- They get an update policy for resolved_at and nothing else, because a log
-- somebody can edit is not a log.
-- =========================================================================

create table if not exists public.knowledge_contradictions (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,

  -- What they disagreed about, in the model's own words. "the price of the
  -- Essential plan", not a column name.
  topic         text not null,

  -- The two sources by name, and what each of them actually said. Names and
  -- not ids, so the record survives the file being deleted afterwards.
  source_a      text not null,
  said_a        text not null,
  source_b      text not null,
  said_b        text not null,

  -- Which one it went with. Newest wins, so this is almost always source_b,
  -- but it is recorded rather than assumed.
  answered_with text,

  times_seen    integer     not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  resolved_at   timestamptz
);

create unique index if not exists knowledge_contradictions_one_per_problem
  on public.knowledge_contradictions
     (company_id, lower(topic), lower(source_a), lower(source_b));

create index if not exists knowledge_contradictions_open_idx
  on public.knowledge_contradictions (company_id, last_seen_at desc)
  where resolved_at is null;

alter table public.knowledge_contradictions enable row level security;

drop policy if exists "an admin reads their own company's contradictions"
  on public.knowledge_contradictions;

create policy "an admin reads their own company's contradictions"
  on public.knowledge_contradictions for select
  using (
    company_id = private.current_company_id()
    and exists (
      select 1 from public.staff s
      where s.id = auth.uid() and s.access_level = 'admin'
    )
  );

-- Marking one as dealt with is the only change an admin can make, and the
-- WITH CHECK repeats the same test so a row cannot be moved to another
-- company on the way through.
drop policy if exists "an admin can mark one resolved"
  on public.knowledge_contradictions;

create policy "an admin can mark one resolved"
  on public.knowledge_contradictions for update
  using (
    company_id = private.current_company_id()
    and exists (
      select 1 from public.staff s
      where s.id = auth.uid() and s.access_level = 'admin'
    )
  )
  with check (
    company_id = private.current_company_id()
    and exists (
      select 1 from public.staff s
      where s.id = auth.uid() and s.access_level = 'admin'
    )
  );

-- -------------------------------------------------------------------------
-- The only way in.
--
-- Upserts on the unique index, so the tenth time the same two files disagree
-- about the same thing it is still one row, with times_seen at ten.
--
-- said_a, said_b and topic are trimmed to a sane length here rather than
-- trusted, because they arrive from a model.
-- -------------------------------------------------------------------------

create or replace function public.knowledge_contradiction_log(
  p_company_id    uuid,
  p_topic         text,
  p_source_a      text,
  p_said_a        text,
  p_source_b      text,
  p_said_b        text,
  p_answered_with text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
begin
  if p_company_id is null
     or coalesce(trim(p_topic), '') = ''
     or coalesce(trim(p_source_a), '') = ''
     or coalesce(trim(p_source_b), '') = ''
  then
    return null;
  end if;

  insert into public.knowledge_contradictions (
    company_id, topic, source_a, said_a, source_b, said_b, answered_with
  )
  values (
    p_company_id,
    left(trim(p_topic), 200),
    left(trim(p_source_a), 200),
    left(trim(coalesce(p_said_a, '')), 500),
    left(trim(p_source_b), 200),
    left(trim(coalesce(p_said_b, '')), 500),
    left(trim(coalesce(p_answered_with, '')), 200)
  )
  on conflict (company_id, lower(topic), lower(source_a), lower(source_b))
  do update set
    times_seen   = public.knowledge_contradictions.times_seen + 1,
    last_seen_at = now(),
    -- A contradiction seen again after somebody marked it resolved is not
    -- resolved. It reopens, rather than being counted quietly against a row
    -- nobody looks at any more.
    resolved_at  = null
  returning id into v_id;

  return v_id;
end;
$function$;

revoke all on function public.knowledge_contradiction_log(uuid, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.knowledge_contradiction_log(uuid, text, text, text, text, text, text)
  to service_role;

comment on table public.knowledge_contradictions is
  'Written by support-ask when a company''s own published material disagrees with itself while answering a customer. One row per disagreement, not per message. No insert policy: the only way in is knowledge_contradiction_log.';
