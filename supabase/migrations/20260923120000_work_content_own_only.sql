/* ==========================================================================
   AN ADMIN SEES A SHORT SUMMARY OF STAFF WORK, NEVER THE WORK ITSELF

   Anthony, 2026-09-23: "admin can see, just the short summery not the
   entire work." This replaces "let admin see everything" from earlier the
   same day.

   WHAT WAS WRONG
   work_history.summary held the WHOLE document (saveWork wrote
   `summary: content`), and work_history_read lets an admin read every row
   in their company. So an admin could read everyone's full work. On top of
   that, conversations_read let an admin read every staff member's chats.

   WHAT THIS DOES, IN ORDER
   1. Makes work_content: one row per piece of work, holding the whole
      document. Row level security lets ONLY the person who made it read,
      add, change or remove it. No admin clause, on purpose.
   2. Copies every existing document out of work_history.summary into
      work_content, so nobody loses anything.
   3. Shortens the old summaries to 280 characters. New ones are made by
      src/shared/workSummary.js (what it is for, and its section names).
   4. Makes conversations_read own rows only, so each chat is its owner's
      alone. Admins keep work_history_read, which now only shows titles and
      short summaries.

   SAFE TO RUN TWICE
   "if not exists", "on conflict do nothing" and "drop policy if exists"
   mean a second run changes nothing. Step 3 only touches summaries longer
   than 280 characters, and step 2 runs before it, so the full text is
   already safe in work_content when it is shortened.

   THE APP WORKS BEFORE AND AFTER
   src/shared/session.js falls back to the old way while work_content does
   not exist, so this can run at any time. Walk:
   scripts/__harness/work-summary.cjs.
   ========================================================================== */

-- 1. The whole document, readable only by the person who made it.
create table if not exists public.work_content (
  work_id     uuid primary key references public.work_history(id) on delete cascade,
  company_id  uuid not null references public.companies(id) on delete cascade,
  staff_id    uuid not null references public.staff(id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now()
);

alter table public.work_content enable row level security;

drop policy if exists work_content_own_read on public.work_content;
create policy work_content_own_read on public.work_content
  for select to authenticated
  using (company_id = private.current_company_id() and staff_id = auth.uid());

drop policy if exists work_content_own_insert on public.work_content;
create policy work_content_own_insert on public.work_content
  for insert to authenticated
  with check (
    company_id = private.current_company_id()
    and staff_id = auth.uid()
    and exists (
      select 1 from public.work_history w
      where w.id = work_id and w.staff_id = auth.uid()
    )
  );

drop policy if exists work_content_own_update on public.work_content;
create policy work_content_own_update on public.work_content
  for update to authenticated
  using (company_id = private.current_company_id() and staff_id = auth.uid())
  with check (company_id = private.current_company_id() and staff_id = auth.uid());

drop policy if exists work_content_own_delete on public.work_content;
create policy work_content_own_delete on public.work_content
  for delete to authenticated
  using (company_id = private.current_company_id() and staff_id = auth.uid());

-- 2. Every existing document copied across first, so nothing is lost.
insert into public.work_content (work_id, company_id, staff_id, content, created_at)
select id, company_id, staff_id, summary, created_at
from public.work_history
on conflict (work_id) do nothing;

-- 3. Then the old summaries shortened. Only the long ones are touched.
update public.work_history
set summary = left(summary, 279) || '…'
where length(summary) > 280;

-- 4. Each chat is its owner's alone.
drop policy if exists conversations_read on public.conversations;
create policy conversations_read on public.conversations
  for select to authenticated
  using (staff_id = auth.uid());
