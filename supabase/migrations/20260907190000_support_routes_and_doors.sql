-- WHERE AN ESCALATION GOES
--
-- A billing question reaching the person who books rooms is the same failure
-- as no answer at all, only slower. So a company names its routes: a label
-- and an address, one of them the default.
--
-- Deliberately small. A label, an email, a default flag. No queues, no
-- assignment, no statuses, no SLAs. That is a ticketing product and this is
-- not one. If a company already runs a helpdesk, the route points at it.

create table if not exists public.support_routes (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  -- What the assistant sees and picks from. Written for a person: Billing,
  -- Bookings, Everything else.
  label      text not null,
  email      text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (company_id, label)
);

-- One default per company, enforced rather than trusted.
create unique index if not exists support_routes_one_default
  on public.support_routes (company_id) where is_default;

alter table public.escalations
  add column if not exists route_id uuid references public.support_routes(id) on delete set null;

comment on column public.escalations.route_id is
  'Which route this went to. Null means the company had no routes set up yet, so nobody was emailed.';

alter table public.support_routes enable row level security;

create policy support_routes_read on public.support_routes
  for select to authenticated
  using (company_id = private.current_company_id());

create policy support_routes_write on public.support_routes
  for all to authenticated
  using (company_id = private.current_company_id() and private.is_admin())
  with check (company_id = private.current_company_id() and private.is_admin());

-- --------------------------------------------------------------------------
-- THE REMAINING DOORS
--
-- Same rule as customer_knowledge and support_state: the edge function calls
-- these and never touches the tables. Every rule that matters lives inside a
-- function, so it cannot be forgotten at a call site or widened by a later
-- change.
-- --------------------------------------------------------------------------

-- RECORDING A MESSAGE, AND SURVIVING A RETRY
--
-- Meta redelivers a webhook until it gets a 200, so the same customer
-- message can arrive three times. The unique index already stops three rows.
-- What the caller needs to know is whether this one was new, because a
-- duplicate must not be answered again.
create or replace function public.support_message_add(
  p_thread_id   uuid,
  p_company_id  uuid,
  p_author_role public.support_author,
  p_body        text,
  p_external_id text default null
)
returns table (message_id uuid, is_new boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id  uuid;
  v_ext text := nullif(trim(coalesce(p_external_id, '')), '');
begin
  insert into public.support_messages (thread_id, company_id, author_role, body, external_id)
  values (p_thread_id, p_company_id, p_author_role, p_body, v_ext)
  on conflict (company_id, external_id) where external_id is not null
    do nothing
  returning id into v_id;

  if v_id is not null then
    update public.support_threads set last_message_at = now() where id = p_thread_id;
    return query select v_id, true;
    return;
  end if;

  -- Only reachable when the insert hit the unique index, which requires an
  -- external id, so this lookup always has one to match on.
  return query
    select m.id, false
    from public.support_messages m
    where m.company_id = p_company_id and m.external_id = v_ext;
end;
$$;

comment on function public.support_message_add is
  'Writes one message and says whether it was new. A repeat delivery returns is_new = false and must not be answered again.';

-- THE LABELS, AND NOTHING ELSE
--
-- The assistant is shown the labels so it can pick one. It is never shown
-- the addresses, because there is no version of this where a model needs to
-- know a company's internal email addresses in order to answer a stranger.
create or replace function public.support_route_labels(p_company_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(label order by is_default desc, label), array[]::text[])
  from public.support_routes
  where company_id = p_company_id
$$;

-- OPENING AN ESCALATION
--
-- Resolving the label to an address happens here, not at the call site. A
-- label that matches nothing falls to the default, and if there is no
-- default the escalation is still recorded with no route. Losing the
-- notification is bad. Losing the record of the question is worse.
create or replace function public.support_escalate(
  p_thread_id   uuid,
  p_company_id  uuid,
  p_question    text,
  p_route_label text default null
)
returns table (escalation_id uuid, route_label text, route_email text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_route public.support_routes%rowtype;
  v_id    uuid;
begin
  select * into v_route
  from public.support_routes r
  where r.company_id = p_company_id
    and lower(r.label) = lower(trim(coalesce(p_route_label, '')))
  limit 1;

  if not found then
    select * into v_route
    from public.support_routes r
    where r.company_id = p_company_id and r.is_default
    limit 1;
  end if;

  insert into public.escalations (thread_id, company_id, question, route_id)
  values (p_thread_id, p_company_id, p_question, v_route.id)
  returning id into v_id;

  return query select v_id, v_route.label, v_route.email;
end;
$$;

comment on function public.support_escalate is
  'Records one unanswered question against a route. Unknown label falls to the default; no default still records the question.';

-- Marks the notification as sent, so a retry does not email twice.
create or replace function public.support_escalation_notified(p_escalation_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.escalations set notified_at = now()
  where id = p_escalation_id and notified_at is null
$$;

revoke all on function public.support_message_add(uuid, uuid, public.support_author, text, text) from public, anon, authenticated;
revoke all on function public.support_route_labels(uuid) from public, anon, authenticated;
revoke all on function public.support_escalate(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.support_escalation_notified(uuid) from public, anon, authenticated;

grant execute on function public.support_message_add(uuid, uuid, public.support_author, text, text) to service_role;
grant execute on function public.support_route_labels(uuid) to service_role;
grant execute on function public.support_escalate(uuid, uuid, text, text) to service_role;
grant execute on function public.support_escalation_notified(uuid) to service_role;
