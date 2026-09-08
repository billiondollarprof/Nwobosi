-- WHAT A STRANGER IS ALLOWED TO BE TOLD
--
-- The assistant reads every ready source in a workspace. That is correct for
-- staff, who work for the company. It is wrong the moment the same workspace
-- starts answering customers on WhatsApp, because "admin material" and
-- "material a stranger may see" are not the same set.
--
-- The Amara workspace already proves it: PaymentReceipt26-08-2026 is a ready
-- source. Nobody would type "show me your payments", but a question about
-- cost could pull it into an answer, and nothing would report that it had.
--
-- DEFAULT DENY. Existing rows and every future upload are staff only until
-- somebody deliberately publishes them. A migration that defaulted to true
-- would expose the receipt the moment the customer path shipped.

alter table public.knowledge_sources
  add column if not exists customer_visible boolean not null default false;

comment on column public.knowledge_sources.customer_visible is
  'May a customer of this company be told what is in this source? Default false. Staff read everything; the customer path reads only these.';

-- ONE DOOR, AND THE FILTER LIVES INSIDE IT
--
-- The customer path runs as the service role, which bypasses row level
-- security, so an RLS policy would give false comfort here. Instead this is
-- the only sanctioned way to read knowledge for a customer, and the filter is
-- inside the function rather than at the call site. A future edge function
-- cannot forget it, because there is nothing to remember: the filter is not
-- a parameter and cannot be passed around.
--
-- Returns the source's name too, so an answer can say where it came from.

create or replace function public.customer_knowledge(p_company_id uuid)
returns table (source_name text, source_description text, content text)
language sql
stable
security definer
set search_path = public
as $$
  select k.name, k.description, ch.content
  from public.knowledge_chunks ch
  join public.knowledge_sources k on k.id = ch.source_id
  where ch.company_id = p_company_id
    and k.company_id = p_company_id
    and k.status = 'ready'
    and k.customer_visible = true
  order by k.created_at, ch.created_at
$$;

comment on function public.customer_knowledge(uuid) is
  'The only read path for the customer environment. Hard codes customer_visible = true so no call site can widen it.';

revoke all on function public.customer_knowledge(uuid) from public, anon, authenticated;
grant execute on function public.customer_knowledge(uuid) to service_role;
