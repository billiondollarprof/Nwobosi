-- THE DOORS
--
-- Same pattern as customer_knowledge: the edge function calls these and never
-- touches the tables directly, so the rules cannot be forgotten at a call
-- site or quietly widened by a later change.

-- Find this person's thread, or start one. Safe to call on every inbound
-- message, including the retries Meta sends.
create or replace function public.support_thread_upsert(
  p_company_id    uuid,
  p_channel       public.support_channel,
  p_customer_ref  text,
  p_customer_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.support_threads (company_id, channel, customer_ref, customer_name)
  values (p_company_id, p_channel, p_customer_ref, nullif(trim(coalesce(p_customer_name, '')), ''))
  on conflict (company_id, channel, customer_ref) do update
    set last_message_at = now(),
        -- Only fill a name in, never overwrite a known one with a null.
        customer_name = coalesce(
          nullif(trim(coalesce(excluded.customer_name, '')), ''),
          public.support_threads.customer_name
        )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.support_thread_upsert is
  'Gets or creates the thread for one person on one channel. Retry safe.';

-- EVERYTHING THE ASSISTANT NEEDS TO DECIDE WHETHER TO SPEAK
--
-- support_active is the whole handover mechanism. It is a comparison against
-- now(), not a stored state, so a support person who answers once and walks
-- away never leaves a thread stuck: the window simply lapses.
--
-- open_questions is what stops the assistant looking stupid when somebody
-- says "any news on my question?". It knows which question they mean.
create or replace function public.support_state(p_thread_id uuid)
returns table (
  support_active   boolean,
  last_support_at  timestamptz,
  open_questions   text[],
  oldest_raised_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with last_support as (
    select max(created_at) as at
    from public.support_messages
    where thread_id = p_thread_id and author_role = 'support'
  ),
  open_esc as (
    select array_agg(question order by raised_at) as questions,
           min(raised_at) as oldest
    from public.escalations
    where thread_id = p_thread_id and closed_at is null
  )
  select
    coalesce(last_support.at > now() - public.support_quiet_window(), false),
    last_support.at,
    coalesce(open_esc.questions, array[]::text[]),
    open_esc.oldest
  from last_support, open_esc
$$;

comment on function public.support_state(uuid) is
  'Is a support person currently in this thread, and which questions are still with them.';

revoke all on function public.support_thread_upsert(uuid, public.support_channel, text, text) from public, anon, authenticated;
revoke all on function public.support_state(uuid) from public, anon;
grant execute on function public.support_thread_upsert(uuid, public.support_channel, text, text) to service_role;
grant execute on function public.support_state(uuid) to service_role, authenticated;
