-- SPENDING WITHOUT A RACE
--
-- The assistant reads budget_cents_remaining, subtracts, and writes the
-- result back. Two calls finishing at the same moment both read the same
-- number and the second write erases the first one's charge.
--
-- On the staff side that is rare: one person, one conversation, turns that
-- take seconds. Support is an open inbox and several people message at once,
-- so the same read then write would leak spend steadily.
--
-- One statement, computed in the database, no read to be stale.

create or replace function public.company_spend(p_company_id uuid, p_cents integer)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.companies
  set budget_cents_remaining = greatest(0, budget_cents_remaining - greatest(0, p_cents))
  where id = p_company_id and is_exempt is not true
  returning budget_cents_remaining
$$;

comment on function public.company_spend(uuid, integer) is
  'Takes cents off a company budget in one statement. Exempt companies are untouched and return no row.';

revoke all on function public.company_spend(uuid, integer) from public, anon, authenticated;
grant execute on function public.company_spend(uuid, integer) to service_role;
