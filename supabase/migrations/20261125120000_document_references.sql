/* ==========================================================================
   REFERENCES BEHIND A QR CODE

   What this does: keeps a document's reference list on its own, under a long
   random code, so a one pager can carry a QR code and a short link
   (stellaxafe.com/r/<code>) instead of a block of references that pushes it
   onto a second page.

   Why. Anthony, 2026-11-22: a one pager should stay one page; the references
   go to a separate place, and a QR code on the page leads to them. His
   choice: a private link on stellaxafe.com for now. His yes on this batch:
   2026-11-25.

   WHAT IT ADDS, ALL ADDITIVE
   1. public.document_references: one row per reference list, with its code.
   2. Row level security: staff can add a list for their own company only,
      and read their own company's lists. Nobody else can read the table.
   3. public.references_by_code(code): returns the one list with exactly
      that code, and nothing else. No listing, no searching.
   4. Anyone holding the link (signed in or not) may call that function.

   WHAT IT MUST NEVER DO
   - Let anyone list or browse lists. The table is never readable by anon.
   - Return a list for a partial or guessed code. The code is 32 random hex
     characters (128 bits), matched exactly.

   SAFE TO RUN TWICE: "if not exists", "drop policy if exists" and
   "create or replace" mean a second run changes nothing.

   UNDO: supabase/rollbacks/20261125120000_document_references.sql
   ========================================================================== */

-- 1. The lists.
create table if not exists public.document_references (
  code        text primary key default encode(extensions.gen_random_bytes(16), 'hex'),
  company_id  uuid not null references public.companies(id) on delete cascade,
  created_by  uuid not null default auth.uid() references public.staff(id) on delete cascade,
  title       text not null default '',
  items       jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  constraint document_references_items_is_array check (jsonb_typeof(items) = 'array'),
  constraint document_references_code_shape check (code ~ '^[0-9a-f]{32}$')
);

-- 2. Nobody gets anything by default; then only what is needed.
revoke all on public.document_references from public, anon, authenticated;
grant select, insert on public.document_references to authenticated;
alter table public.document_references enable row level security;

drop policy if exists document_references_own_insert on public.document_references;
create policy document_references_own_insert on public.document_references
  for insert to authenticated
  with check (company_id = private.current_company_id() and created_by = auth.uid());

drop policy if exists document_references_own_read on public.document_references;
create policy document_references_own_read on public.document_references
  for select to authenticated
  using (company_id = private.current_company_id());

-- 3. One list, by its exact code.
create or replace function public.references_by_code(p_code text)
returns table (title text, items jsonb, company text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select r.title, r.items, c.name, r.created_at
  from public.document_references r
  join public.companies c on c.id = r.company_id
  where p_code ~ '^[0-9a-f]{32}$'
    and r.code = p_code
  limit 1;
$$;

-- 4. Anyone with the link may call it; nothing else is granted.
revoke all on function public.references_by_code(text) from public;
grant execute on function public.references_by_code(text) to anon, authenticated;
