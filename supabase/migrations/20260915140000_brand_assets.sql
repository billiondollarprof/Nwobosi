-- WHERE A COMPANY'S LOGOS AND BRAND IMAGES LIVE.
--
-- APPLIED TO THE LIVE PROJECT ON 2026-09-15, in two parts. This file is
-- the record of what ran, not something waiting to run.
--
-- PART ONE went on its own, because Postgres will not let a new enum value
-- be added and then used inside the same transaction:
--
--   alter type source_kind add value if not exists 'image';
--
-- PART TWO is everything below.
--
-- WHY A BUCKET AT ALL
-- A document becomes rows of text and the file itself is thrown away. An
-- image cannot: the whole point of a logo is the picture, so the file has
-- to survive. This is the first storage bucket on the project, which is
-- why the policies are written out in full rather than copied.
--
-- PRIVATE, NOT PUBLIC. A public bucket hands out a URL that works for
-- anybody who has it, forever, with no sign in. Brand assets are not
-- secret the way a contract is, and "not secret" is still not a reason to
-- publish them.
--
-- THE FIRST FOLDER IS THE COMPANY ID, and every policy is built on that.
-- An object at 'e99c.../logo.webp' belongs to that company and nobody
-- else. Written this way rather than as a join, because storage.objects
-- has no company column of its own and adding one would mean keeping two
-- truths in step.

alter table public.knowledge_sources
  add column if not exists asset_path text,
  add column if not exists asset_mime text;

comment on column public.knowledge_sources.asset_path is
  'Object path in the brand-assets bucket, shaped <company_id>/<uuid>.<ext>. Null for every kind except image.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand-assets', 'brand-assets', false, 10485760,
        array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

-- READ: anybody on the company. Staff need the logo to appear in the work
-- they ask for, so this is not admin only.
drop policy if exists "brand assets readable by the company" on storage.objects;
create policy "brand assets readable by the company"
  on storage.objects for select to authenticated
  using (bucket_id = 'brand-assets'
     and (storage.foldername(name))[1] = private.current_company_id()::text);

-- WRITE, REPLACE AND REMOVE: an admin of that company and nobody else.
-- Same two helpers every table policy on this project uses, so there is
-- one definition of "admin here" rather than two.
drop policy if exists "brand assets written by a company admin" on storage.objects;
create policy "brand assets written by a company admin"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'brand-assets' and private.is_admin()
          and (storage.foldername(name))[1] = private.current_company_id()::text);

drop policy if exists "brand assets replaced by a company admin" on storage.objects;
create policy "brand assets replaced by a company admin"
  on storage.objects for update to authenticated
  using (bucket_id = 'brand-assets' and private.is_admin()
     and (storage.foldername(name))[1] = private.current_company_id()::text);

drop policy if exists "brand assets removed by a company admin" on storage.objects;
create policy "brand assets removed by a company admin"
  on storage.objects for delete to authenticated
  using (bucket_id = 'brand-assets' and private.is_admin()
     and (storage.foldername(name))[1] = private.current_company_id()::text);
