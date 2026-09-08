-- THE CUSTOMER SIDE OF THE ASSISTANT
--
-- Three tables and no mode column anywhere, which is the whole design.
--
-- WHY THERE IS NO "who is answering" FLAG
-- A flag has to be set by somebody and cleared by somebody, and the person
-- who sets it is exactly the person who will forget to clear it. Then the
-- assistant is mute for a customer and nobody knows why.
--
-- So nothing is stored about who is in charge. It is derived: support spoke
-- recently, or it did not. That expires on its own and needs no caretaker.
--
-- WHY author_role IS STAMPED, NOT GUESSED
-- The writer records who sent a message because it knows which door the
-- message came through: the customer endpoint, or the support endpoint. The
-- assistant never has to work out "was that a human?" from the text.

create type public.support_author as enum ('customer', 'ai', 'support');

-- WhatsApp today. The web app and email are the same logic with a different
-- delivery adapter, so the channel is a column rather than an assumption
-- baked through the code.
create type public.support_channel as enum ('whatsapp', 'web', 'email');

create table public.support_threads (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  channel         public.support_channel not null,
  -- Phone in international form, an email address, or a web user id. Whatever
  -- identifies this person on this channel.
  customer_ref    text not null,
  customer_name   text,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  -- One thread per person per channel per company. The same phone number can
  -- talk to two different companies and those are two conversations.
  unique (company_id, channel, customer_ref)
);

create table public.support_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.support_threads(id) on delete cascade,
  company_id  uuid not null references public.companies(id) on delete cascade,
  author_role public.support_author not null,
  body        text not null,
  -- The provider's own message id. Meta retries a webhook until it gets a
  -- 200, so without this a slow reply becomes three copies of the customer's
  -- question and three answers.
  external_id text,
  created_at  timestamptz not null default now()
);

create unique index support_messages_external_once
  on public.support_messages (company_id, external_id)
  where external_id is not null;

create index support_messages_thread_time
  on public.support_messages (thread_id, created_at desc);

-- ESCALATIONS ARE PER QUESTION, NOT PER CONVERSATION
--
-- This is the part that keeps the assistant useful while somebody waits. A
-- customer whose billing question went to a human can still ask whether you
-- support Airbnb, and get an answer, because only the billing question is
-- with support. A conversation level handover would have silenced both.
--
-- More than one may be open at a time, deliberately. Two questions can both
-- be beyond the assistant.
create table public.escalations (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.support_threads(id) on delete cascade,
  company_id  uuid not null references public.companies(id) on delete cascade,
  -- What the customer actually asked, so the assistant can recognise it when
  -- they come back with "any update on my question?".
  question    text not null,
  raised_at   timestamptz not null default now(),
  -- When support was emailed. Null means the notification has not gone yet.
  notified_at timestamptz,
  -- Nothing depends on this being set. It is for the dashboard, not for the
  -- assistant's behaviour, so a forgotten open row costs nothing.
  closed_at   timestamptz
);

create index escalations_open
  on public.escalations (thread_id, raised_at desc)
  where closed_at is null;

-- ONE PLACE FOR THE QUIET PERIOD
-- Referenced by the state function below rather than repeated at call sites,
-- so changing five minutes to three is one edit and not a hunt.
create or replace function public.support_quiet_window()
returns interval language sql immutable as $$ select interval '5 minutes' $$;

comment on function public.support_quiet_window() is
  'How long after a support message the assistant stays out of a thread.';

alter table public.support_threads  enable row level security;
alter table public.support_messages enable row level security;
alter table public.escalations      enable row level security;

-- Staff read their own company's threads, and nothing else. Writes are the
-- service role's alone: every message is written by an endpoint that knows
-- which door it came through, never by a browser claiming a role for itself.
create policy support_threads_read on public.support_threads
  for select to authenticated
  using (company_id = private.current_company_id());

create policy support_messages_read on public.support_messages
  for select to authenticated
  using (company_id = private.current_company_id());

create policy escalations_read on public.escalations
  for select to authenticated
  using (company_id = private.current_company_id());
