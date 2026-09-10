-- =========================================================================
-- MONEY STOPS BEING ROUNDED UP
--
-- WHY THIS EXISTS
-- Anthony, 2026-09-10, looking at his own budget draining:
--
--   "Why am I spending more for messages? Why is it rounding up to one cent?
--    Why do you suppose to be rounding up numbers? That's real money."
--
-- He was right, and it was worse than untidy. A support message that truly
-- cost 0.26 of a cent was charged a whole cent. Nearly four times over, on
-- every message, and always in our favour and never the company's.
--
-- THE CAUSE WAS THIS COLUMN, NOT THE ARITHMETIC
-- budget_cents_remaining was an integer. A fraction of a cent had nowhere to
-- go, so both edge functions had a Math.ceil in them to make the number fit.
-- The rounding was a symptom. This is the actual fix.
--
-- WHAT CHANGES
--   the column becomes numeric(14,6), so it holds ten-thousandths of a cent
--   company_spend takes and returns numeric instead of integer
--
-- THE OLD INTEGER VERSION IS DROPPED, NOT LEFT BESIDE THE NEW ONE. Two
-- functions with one name is how a call quietly goes to the wrong one.
--
-- The body is character for character what it was. Same greatest(0, ...) so
-- a budget cannot go negative, same is_exempt check, same security definer,
-- same grants.
--
-- APPLIED AND VERIFIED against the live project 2026-09-10: column reads
-- numeric, exactly one company_spend exists, and spending 0.26 off a balance
-- of 77.000000 left 76.740000 rather than 76. Amara was put straight back to
-- 77.000000 afterwards.
-- =========================================================================

alter table public.companies
  alter column budget_cents_remaining type numeric(14,6);

drop function if exists public.company_spend(uuid, integer);

create or replace function public.company_spend(p_company_id uuid, p_cents numeric)
returns numeric
language sql
security definer
set search_path to 'public'
as $function$
  update public.companies
  set budget_cents_remaining = greatest(0, budget_cents_remaining - greatest(0, p_cents))
  where id = p_company_id and is_exempt is not true
  returning budget_cents_remaining
$function$;

revoke all on function public.company_spend(uuid, numeric) from public, anon, authenticated;
grant execute on function public.company_spend(uuid, numeric) to service_role;

comment on function public.company_spend(uuid, numeric) is
  'Takes real fractional cents off a company budget. Numeric, not integer, because rounding a fraction of a cent up to a whole one overcharged every message by about four times.';
