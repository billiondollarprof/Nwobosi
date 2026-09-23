-- ============================================================
-- ENUMS
-- ============================================================

-- Job title is free text on staff. This is the permission level.
create type access_level as enum ('admin', 'staff');

-- The ladder an admin raises a staff member up. Order matters.
create type model_tier as enum ('haiku-4-5', 'sonnet-5', 'opus-5', 'fable-5');

create type source_kind as enum ('file', 'link');
create type source_status as enum ('pending', 'ready', 'failed');
create type request_status as enum ('pending', 'approved', 'declined');
create type connector_scope as enum ('company', 'staff');

-- ============================================================
-- COMPANIES
-- The tenant. Every other table hangs off this, and row level
-- security scopes every query to one of them.
-- ============================================================

create table public.companies (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  default_model_ceiling   model_tier not null default 'sonnet-5',
  default_daily_limit     integer not null default 5,
  default_storage         text,
  created_at              timestamptz not null default now()
);

-- ============================================================
-- STAFF
-- One row per invited person, keyed to their auth user.
-- model_ceiling and daily_limit are null when the person falls
-- back to the company default, so no manual step is needed on
-- invite.
-- ============================================================

create table public.staff (
  id              uuid primary key references auth.users(id) on delete cascade,
  company_id      uuid not null references public.companies(id) on delete cascade,
  name            text not null,
  role            text not null default 'Not set',
  access_level    access_level not null default 'staff',
  model_ceiling   model_tier,
  daily_limit     integer,
  created_at      timestamptz not null default now()
);

create index staff_company_idx on public.staff (company_id);

-- ============================================================
-- ACCESS REQUESTS
-- Raised from the login screen by someone with no account.
-- Approving turns one into a normal invited account.
-- ============================================================

create table public.access_requests (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  name          text not null,
  email         text not null,
  status        request_status not null default 'pending',
  created_at    timestamptz not null default now(),
  decided_at    timestamptz,
  decided_by    uuid references public.staff(id) on delete set null
);

create index access_requests_company_idx on public.access_requests (company_id, status);

-- ============================================================
-- KNOWLEDGE SOURCES
-- The assistant's entire world. Name and description are not
-- decoration: they are what lets retrieval pull only what a
-- task needs instead of sweeping the whole index.
-- ============================================================

create table public.knowledge_sources (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  name          text not null,
  description   text not null,
  kind          source_kind not null,
  location      text,
  status        source_status not null default 'pending',
  added_by      uuid references public.staff(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index knowledge_sources_company_idx on public.knowledge_sources (company_id, status);

-- ============================================================
-- KNOWLEDGE CHUNKS
-- company_id is carried here on purpose rather than joined
-- through the source. It keeps the security policy a single
-- comparison and the vector search fast.
--
-- 1536 matches OpenAI text-embedding-3-small. If the embedding
-- model changes, this dimension changes with it.
-- ============================================================

create table public.knowledge_chunks (
  id            uuid primary key default gen_random_uuid(),
  source_id     uuid not null references public.knowledge_sources(id) on delete cascade,
  company_id    uuid not null references public.companies(id) on delete cascade,
  content       text not null,
  embedding     extensions.vector(1536),
  created_at    timestamptz not null default now()
);

create index knowledge_chunks_company_idx on public.knowledge_chunks (company_id);
create index knowledge_chunks_embedding_idx
  on public.knowledge_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

-- ============================================================
-- WORK HISTORY
-- The memory. One row per finished output. This is what lets
-- the assistant shorten the interview next time instead of
-- asking everything again.
--
-- The file itself lives in the staff member's own storage. This
-- row is a short record plus a pointer, so memory costs bytes
-- per job rather than megabytes.
-- ============================================================

create table public.work_history (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  staff_id            uuid not null references public.staff(id) on delete cascade,
  title               text not null,
  skill               text,
  summary             text not null,
  brief               jsonb,
  sources_used        uuid[],
  storage_provider    text,
  storage_location    text,
  credits             integer not null default 0,
  embedding           extensions.vector(1536),
  created_at          timestamptz not null default now()
);

create index work_history_staff_idx on public.work_history (company_id, staff_id, created_at desc);
create index work_history_embedding_idx
  on public.work_history
  using hnsw (embedding extensions.vector_cosine_ops);

-- ============================================================
-- CONNECTORS
-- Called workflow tools in the interface. Company scope serves
-- everyone. Staff scope belongs to one person, so nobody ever
-- shares an account.
--
-- The token columns are placeholders. Real tokens must go into
-- Supabase Vault before any live OAuth flow is wired up.
-- ============================================================

create table public.connectors (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  staff_id        uuid references public.staff(id) on delete cascade,
  scope           connector_scope not null,
  provider        text not null,
  status          text not null default 'disconnected',
  access_token    text,
  refresh_token   text,
  expires_at      timestamptz,
  created_at      timestamptz not null default now(),

  -- A company connector has no owner. A staff connector must have one.
  constraint connector_scope_owner check (
    (scope = 'company' and staff_id is null) or
    (scope = 'staff' and staff_id is not null)
  )
);

create unique index connectors_company_provider_idx
  on public.connectors (company_id, provider)
  where scope = 'company';

create unique index connectors_staff_provider_idx
  on public.connectors (staff_id, provider)
  where scope = 'staff';
