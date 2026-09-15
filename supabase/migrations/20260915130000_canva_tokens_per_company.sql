-- ONE CONNECTION PER COMPANY, NOT ONE FOR THE WHOLE DEPLOYMENT.
--
-- APPLIED TO THE LIVE PROJECT ON 2026-09-15. This file is the record of
-- what ran, not a thing waiting to be run.
--
-- WHAT WAS WRONG
-- integration_tokens was keyed on provider alone, so the table could only
-- ever hold one Canva row. The second company to connect would have
-- overwritten the first company's row, and the first company would have
-- lost their connection without anybody being told. Two companies already
-- exist on this deployment, Amara and Buildfest, so this was live rather
-- than theoretical.
--
-- WHY oauth_pending GETS THE COLUMN TOO
-- The callback has no session to read. Canva sends the person back with a
-- GET carrying nothing of ours, so there is no staff row at that end to
-- work the company out from. It has to be decided at the start, by the
-- function that checked who was asking, and written down. Reading it off
-- the query string instead would let anybody who can reach the callback
-- drop a token into any company they liked.

alter table public.integration_tokens
  add column if not exists company_id uuid references public.companies(id) on delete cascade;

alter table public.oauth_pending
  add column if not exists company_id uuid references public.companies(id) on delete cascade;

-- The one existing row predates the column, so it has no company of its
-- own. It went to Amara. The account it pointed at was the wrong one
-- anyway, so if that guess is wrong the fix is to disconnect and connect
-- again on the right company.
update public.integration_tokens
   set company_id = (select id from public.companies where slug = 'amara')
 where company_id is null;

alter table public.integration_tokens alter column company_id set not null;
alter table public.oauth_pending      alter column company_id set not null;

alter table public.integration_tokens drop constraint integration_tokens_pkey;

alter table public.integration_tokens
  add constraint integration_tokens_pkey primary key (company_id, provider);

create index if not exists oauth_pending_company_idx
  on public.oauth_pending (company_id);
