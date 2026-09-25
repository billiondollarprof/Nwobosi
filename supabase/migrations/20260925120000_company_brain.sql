-- ============================================================================
-- WHICH VENDOR RUNS THE BRAIN FOR A COMPANY
--
-- WHY A TABLE OF ITS OWN, AND NOT A COLUMN ON `companies`.
-- src/shared/session.js loads the company with `.select("*")`, so any column
-- added to `companies` lands in the browser payload on every page load. That
-- would put a vendor's name in the client, and the whole reason the capability
-- levels exist is that the brain has to be swappable without the product
-- knowing which brain it is. Anthony: "tomorrow we might be installing the
-- same thing for a company using OpenAI... The name should not be shown."
--
-- A table of its own cannot leak that way. The browser has no policy here at
-- all, so it cannot read this even by accident, and the edge functions reach it
-- with the service role.
--
-- ⚠️ NOTHING DEFAULTS TO A VENDOR THAT IS NOT READY. 'anthropic' is the default
-- because that is what every deployment runs today, so running this changes
-- nothing for anybody until a company is set deliberately.
--
-- ⚠️ 'openai' IS ALLOWED BY THE CHECK BUT NOT USABLE YET. The brain table in
-- `_shared/brain.ts` has an empty OpenAI row on purpose and `vendorReady`
-- refuses it, so choosing it fails loudly rather than sending an empty model
-- name. The value is here so the column does not have to change the day its
-- models are chosen.
-- ============================================================================

create table if not exists public.company_brain (
  company_id uuid primary key references public.companies(id) on delete cascade,
  vendor     text not null default 'anthropic',
  updated_at timestamptz not null default now(),
  constraint company_brain_vendor_check
    check (vendor in ('anthropic', 'deepseek', 'openai'))
);

comment on table public.company_brain is
  'Which vendor runs the brain for this company. Deliberately NOT a column on companies: src/shared/session.js selects companies with select(*), so a column there would put the vendor name into the browser payload, and the brain must be swappable without the product knowing which brain it is.';

comment on column public.company_brain.vendor is
  'anthropic | deepseek | openai. The edge functions read this with the service role and fall back to anthropic on any error, including this table not existing.';

-- Row level security on, and deliberately NO policies. The service role bypasses
-- RLS, so the functions read it and the browser cannot.
alter table public.company_brain enable row level security;

-- Keep updated_at honest without trusting the caller.
create or replace function public.company_brain_touch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists company_brain_touch_trg on public.company_brain;
create trigger company_brain_touch_trg
  before update on public.company_brain
  for each row execute function public.company_brain_touch();
