-- ============================================================
-- ACCESS CODES
-- The only thing between a stranger and the API bill.
--
-- A code is single use. The moment it is redeemed it is dead and
-- cannot be passed to a second person. There is a middle state,
-- redeeming, because creating a workspace takes several steps and
-- a crash halfway through must not burn someone's code.
-- ============================================================

create type code_status as enum ('unused', 'redeeming', 'redeemed', 'revoked');

create table public.access_codes (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  label         text,
  status        code_status not null default 'unused',

  -- What this demo company is allowed to spend, in cents. Exempt codes
  -- ignore it entirely, which is how the competition workspace stays
  -- open for judges.
  budget_cents  integer not null default 200,
  is_exempt     boolean not null default false,

  claimed_at    timestamptz,
  redeemed_at   timestamptz,
  company_id    uuid references public.companies(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index access_codes_status_idx on public.access_codes (status);

-- Row level security on, and deliberately NOT ONE POLICY.
--
-- That is the point. With RLS enabled and no policy granting anything,
-- every role except the service role is denied by default. A browser
-- cannot read this table, cannot list it, and cannot probe it. The only
-- thing that ever touches it is an edge function holding the service
-- role key, and that key never leaves the server.
alter table public.access_codes enable row level security;

-- ============================================================
-- COMPANIES
-- Everything the setup flow collects, plus what deployment needs.
-- ============================================================

alter table public.companies
  add column slug                    text unique,
  add column what_we_do              text,
  add column industry                text,
  add column logo_url                text,
  add column brand_color             text,
  add column budget_cents_remaining  integer not null default 200,
  add column is_exempt               boolean not null default false,
  add column deployed_at             timestamptz;

comment on column public.companies.slug is
  'Path the workspace lives at. /acme-logistics for staff, /acme-logistics/admin for the dashboard.';

comment on column public.companies.budget_cents_remaining is
  'Decremented by real reported usage, never by an estimate. Shown to people as outputs remaining, never as tokens or dollars.';
