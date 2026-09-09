-- =========================================================================
-- AN EMAIL ADDRESS FOR THE PERSON ON THE OTHER END
--
-- WHY THIS EXISTS
-- A support conversation happens on WhatsApp. Some answers do not belong on
-- WhatsApp: anything with money, an account, or a document in it. The person
-- has no way to say "not here" unless we offer them one.
--
-- So the assistant offers, once, on the first message of a new conversation.
-- If they give an address it is kept here, and every escalation from then on
-- carries it, so the colleague answering can choose the channel to suit the
-- answer rather than digging through a chat for a line the customer typed
-- twenty messages ago.
--
-- WHY IT IS ON THE THREAD AND NOT ON A MESSAGE
-- It is a fact about the person, not about one thing they said. Storing it on
-- the thread means it is still there in six months, because a thread has no
-- expiry.
--
-- WHAT THIS IS NOT
-- It is not a condition for anything. A question is escalated on its own
-- merits and never on whether an address was given. Somebody who ignores the
-- offer gets exactly the same service.
-- =========================================================================

alter table public.support_threads
  add column if not exists customer_email text;

comment on column public.support_threads.customer_email is
  'Optional. Offered once on a new thread, never required. Carried into every '
  'escalation so a colleague can answer by email when the answer is sensitive.';

-- =========================================================================
-- THE DOOR THAT WRITES IT
--
-- support-ask runs as the service role, which bypasses row level security, so
-- it must never touch this table directly. Everything it writes goes through a
-- function like this one, where the rules are in the function body and cannot
-- be forgotten at a call site.
--
-- Three rules live here:
--   1. The address is trimmed and lowercased, so the same person typing
--      "Me@Example.COM " twice does not look like two different addresses.
--   2. Anything that is not shaped like an address is ignored rather than
--      stored. The model is asked to report an address, not to validate one,
--      and a customer can type anything at all.
--   3. A later address replaces an earlier one. Somebody correcting a typo is
--      far more likely than somebody trying to overwrite a good address, and
--      the conversation is the audit trail either way.
-- =========================================================================

create or replace function public.support_thread_email_set(
  p_thread_id uuid,
  p_email     text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean text;
begin
  v_clean := lower(trim(coalesce(p_email, '')));

  -- Deliberately loose. This rejects obvious rubbish, not unusual but valid
  -- addresses, because refusing a real address is the worse failure.
  if v_clean !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    return null;
  end if;

  update public.support_threads
  set customer_email = v_clean
  where id = p_thread_id;

  return v_clean;
end;
$$;

comment on function public.support_thread_email_set is
  'Saves an optional email address on a support thread. Returns the stored '
  'address, or null when what was given is not shaped like one.';

revoke all on function public.support_thread_email_set(uuid, text) from public;
