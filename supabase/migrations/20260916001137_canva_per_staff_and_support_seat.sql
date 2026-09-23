-- TWO CHANGES, BOTH OF THEM ANTHONY'S CALL ON 2026-09-16.
--
-- ONE: CANVA BELONGS TO A PERSON, NOT TO A COMPANY.
--
-- His reasoning, and it is right: "admin is not creating any design. And
-- what is even the function of admin connecting Canva in the first place?
-- Admin only connects knowledge bases... But Canva, it's not knowledge
-- base. It's a place for work."
--
-- The hole this closes is the one he found. With one company account, a
-- staff member who wants to nudge the logo themselves clicks Open in
-- Canva, lands in their own Canva, and the design is not there, because
-- the design lives in somebody else's account. Per person, the design is
-- in the account they are already signed into and the button tells the
-- truth.
--
-- company_id stays on the row. It is what scopes the token to a company
-- for anything that has to reason about a company, and it is what the
-- policies would key on if these tables ever get any.
--
-- TWO: SUPPORT IS A FLAG ON A PERSON, NOT A SEPARATE ACCOUNT.
--
-- One door for everybody at /workspace. An admin turns can_support on for
-- somebody, and that person gets a switch between their own work and the
-- support queue. No second sign in, no second address, and taking it away
-- is one toggle rather than a deleted account somewhere else.

alter table public.integration_tokens
  add column if not exists staff_id uuid references public.staff(id) on delete cascade;

alter table public.oauth_pending
  add column if not exists staff_id uuid references public.staff(id) on delete cascade;

-- The one existing row was connected by an admin before this change, so it
-- goes to that admin. If it turns out to be the wrong person, the fix is
-- to disconnect and connect again, which now takes about fifteen seconds.
update public.integration_tokens t
   set staff_id = (
     select s.id from public.staff s
      where s.company_id = t.company_id and s.access_level = 'admin'
      order by s.id limit 1)
 where t.staff_id is null;

alter table public.integration_tokens alter column staff_id set not null;

-- The key moves from (company_id, provider) to (staff_id, provider), so two
-- people at the same company each hold their own Canva rather than one
-- overwriting the other.
alter table public.integration_tokens drop constraint integration_tokens_pkey;

alter table public.integration_tokens
  add constraint integration_tokens_pkey primary key (staff_id, provider);

create index if not exists integration_tokens_company_idx
  on public.integration_tokens (company_id, provider);

create index if not exists oauth_pending_staff_idx
  on public.oauth_pending (staff_id);

-- SUPPORT ACCESS. Off for everybody until an admin turns it on, including
-- for admins, because being able to run the company is not the same job as
-- answering its customers.
alter table public.staff
  add column if not exists can_support boolean not null default false;

comment on column public.staff.can_support is
  'Set by an admin. Gives this person the switch between their own work and the support queue, at the same /workspace address everybody else uses.';
