-- =========================================================================
-- A RECORD OF THE TIMES SOMEBODY PUBLISHED ANYWAY
--
-- WHY THIS EXISTS
-- Turning a knowledge file on for customers is the only action in the admin
-- that can send a company's own material to somebody outside the company.
-- Since 2026-09-09 a model reads the file first and says what it found, and
-- the dialog turns amber when it found something.
--
-- The admin can still go ahead, and they should be able to. The model is
-- often wrong, and an admin who knows their own document is the authority,
-- not it. But going ahead over a warning is worth having written down. Not
-- to catch anybody: so that when a customer is told something they should
-- not have been, somebody can find out how it got there in a minute rather
-- than a week.
--
-- WHAT IS AND IS NOT LOGGED
-- Only the overrides. Turning a file on when the reader said nothing writes
-- nothing at all, and neither does turning one off. A log that records
-- everything records nothing, because nobody reads it.
--
-- WHY THE NAME AND THE NOTE ARE COPIED IN RATHER THAN LOOKED UP
-- source_name and reader_note are stored here, not joined from elsewhere.
-- If the file is deleted afterwards, the record of the decision has to
-- survive it. A log that empties itself when the evidence is removed is not
-- a log.
--
-- WHY THERE IS NO INSERT POLICY
-- Deliberate, and not an oversight. Nothing can write to this table from a
-- browser, an admin included, so nobody can plant an entry or write a
-- flattering one. The only way in is a SECURITY DEFINER function that fills
-- in who did it from the session rather than taking the caller's word.
--
-- There is no update policy and no delete policy either. Once written it
-- stands.
--
-- APPLIED to the live project 2026-09-09, verified: RLS on, one policy, and
-- that policy is SELECT only.
-- =========================================================================

create table if not exists public.publish_overrides (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  source_id     uuid not null references public.knowledge_sources(id) on delete cascade,
  source_name   text not null,
  reader_note   text not null,
  overridden_by uuid not null references public.staff(id),
  created_at    timestamptz not null default now()
);

alter table public.publish_overrides enable row level security;

-- An admin reads their own company's records and nothing else. The company
-- comes from private.current_company_id(), which the rest of the schema
-- already uses, and the admin check reads the caller's own staff row, which
-- they are already allowed to read.
--
-- An earlier draft of this called public.is_admin(). That function does not
-- exist on this project, the statement failed, and the name had been taken
-- from a code comment rather than from the database. Recorded here so the
-- next person does not reach for it either.
drop policy if exists "an admin reads their own company's overrides"
  on public.publish_overrides;

create policy "an admin reads their own company's overrides"
  on public.publish_overrides for select
  using (
    company_id = private.current_company_id()
    and exists (
      select 1 from public.staff s
      where s.id = auth.uid() and s.access_level = 'admin'
    )
  );

create index if not exists publish_overrides_company_idx
  on public.publish_overrides (company_id, created_at desc);

comment on table public.publish_overrides is
  'Written only when the reader warned about a file and an admin turned it on for customers anyway. No insert policy: the only way in is a SECURITY DEFINER function.';
