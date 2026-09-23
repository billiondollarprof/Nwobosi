-- ============================================================
-- The lifecycle functions have to be reachable by an edge function,
-- and PostgREST only publishes the public schema. Sitting in private
-- made them unreachable.
--
-- So they move to public, but with every grant stripped from public,
-- anon, and authenticated, and execute given only to the service role.
-- Being published is not the same as being callable: a browser holding
-- the publishable key gets a permission error, every time.
--
-- private.current_company_id and private.is_admin stay where they are.
-- Those are only ever called from inside row level security policies,
-- never over HTTP, so private is the right home for them.
-- ============================================================

drop function if exists private.peek_access_code(text);
drop function if exists private.claim_access_code(text);
drop function if exists private.release_access_code(text);
drop function if exists private.finalise_access_code(text, uuid);
drop function if exists private.create_company_workspace(uuid, text, text, text, text, integer, boolean);

-- Looks, does not touch. Step 1 of setup asks this.
create or replace function public.peek_access_code(p_code text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_status code_status;
begin
  select status into v_status from public.access_codes where code = p_code;

  if not found then return 'not_found'; end if;
  if v_status = 'redeemed' then return 'already_used'; end if;
  if v_status = 'revoked' then return 'revoked'; end if;
  if v_status = 'redeeming' then return 'in_progress'; end if;
  return 'ok';
end;
$$;

-- One atomic update decides the winner. Two people submitting the same
-- code in the same instant cannot both pass. A claim left for five
-- minutes is treated as abandoned, so a crash mid setup does not lock a
-- code forever.
create or replace function public.claim_access_code(p_code text)
returns table (outcome text, budget_cents integer, is_exempt boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.access_codes%rowtype;
begin
  update public.access_codes ac
     set status = 'redeeming',
         claimed_at = now()
   where ac.code = p_code
     and (
       ac.status = 'unused'
       or (ac.status = 'redeeming' and ac.claimed_at < now() - interval '5 minutes')
     )
  returning ac.* into v_row;

  if found then
    return query select 'ok'::text, v_row.budget_cents, v_row.is_exempt;
    return;
  end if;

  select * into v_row from public.access_codes where code = p_code;

  if not found then
    return query select 'not_found'::text, null::integer, null::boolean;
  elsif v_row.status = 'redeemed' then
    return query select 'already_used'::text, null::integer, null::boolean;
  elsif v_row.status = 'revoked' then
    return query select 'revoked'::text, null::integer, null::boolean;
  else
    return query select 'in_progress'::text, null::integer, null::boolean;
  end if;
end;
$$;

create or replace function public.release_access_code(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.access_codes
     set status = 'unused', claimed_at = null
   where code = p_code and status = 'redeeming';
$$;

create or replace function public.finalise_access_code(p_code text, p_company_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.access_codes
     set status = 'redeemed', redeemed_at = now(), company_id = p_company_id
   where code = p_code and status = 'redeeming';
$$;

-- Company and admin staff row in one transaction. If the staff insert
-- fails, the company rolls back with it, so there is never a company
-- that nobody can get into.
create or replace function public.create_company_workspace(
  p_admin_id      uuid,
  p_admin_name    text,
  p_company_name  text,
  p_what_we_do    text,
  p_industry      text,
  p_budget_cents  integer,
  p_is_exempt     boolean
)
returns table (company_id uuid, slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_slug text;
  v_n    integer := 0;
  v_id   uuid;
begin
  v_base := regexp_replace(lower(trim(p_company_name)), '[^a-z0-9]+', '-', 'g');
  v_base := trim(both '-' from v_base);
  v_base := left(v_base, 40);
  if v_base = '' or v_base is null then
    v_base := 'company';
  end if;

  -- Two companies called Acme both get in. The second becomes acme-1.
  v_slug := v_base;
  while exists (select 1 from public.companies c where c.slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into public.companies (
    name, slug, what_we_do, industry, budget_cents_remaining, is_exempt
  )
  values (
    trim(p_company_name), v_slug, p_what_we_do, p_industry, p_budget_cents, p_is_exempt
  )
  returning id into v_id;

  insert into public.staff (id, company_id, name, role, access_level)
  values (p_admin_id, v_id, p_admin_name, 'Admin', 'admin');

  return query select v_id, v_slug;
end;
$$;

-- ============================================================
-- GRANTS
-- This block is the security boundary. Published, but not callable
-- by anyone holding a browser key.
-- ============================================================

revoke all on function public.peek_access_code(text)            from public, anon, authenticated;
revoke all on function public.claim_access_code(text)           from public, anon, authenticated;
revoke all on function public.release_access_code(text)         from public, anon, authenticated;
revoke all on function public.finalise_access_code(text, uuid)  from public, anon, authenticated;
revoke all on function public.create_company_workspace(uuid, text, text, text, text, integer, boolean)
  from public, anon, authenticated;

grant execute on function public.peek_access_code(text)           to service_role;
grant execute on function public.claim_access_code(text)          to service_role;
grant execute on function public.release_access_code(text)        to service_role;
grant execute on function public.finalise_access_code(text, uuid) to service_role;
grant execute on function public.create_company_workspace(uuid, text, text, text, text, integer, boolean)
  to service_role;
