-- =========================================================================
-- A COMPANY CAN NEVER TAKE A SLUG THAT IS ALREADY A PAGE
--
-- WHY THIS EXISTS
-- From 2026-09-09 a company's workspace lives at its own address: Amara is
-- at /amara. The slug is built from the company name, lowercased with the
-- spaces turned to hyphens, so a company called "Services" would be handed
-- the slug `services`.
--
-- That address is already the services page. React Router puts a fixed route
-- ahead of a dynamic one, so the site would not break, but that company
-- could never reach their own workspace. They would type their address and
-- get a marketing page forever, with nothing to tell them why.
--
-- HOW IT IS HANDLED
-- A reserved name is treated exactly like a name somebody else already has.
-- The existing loop already appends -1, -2 and so on for that, so "Services"
-- simply becomes `services-1` and everything downstream is unchanged.
--
-- KEEPING THIS LIST HONEST
-- It has to match the fixed routes in src/App.jsx. If a page is added there
-- and not added here, the next company named after it loses their address.
-- The list is deliberately a little wider than the routes: it also holds the
-- words a person would try by hand, like `login` and `signin`, so those stay
-- available if they are ever wanted.
-- =========================================================================

create or replace function public.create_company_workspace(
  p_admin_id     uuid,
  p_admin_name   text,
  p_company_name text,
  p_what_we_do   text,
  p_industry     text,
  p_budget_cents integer,
  p_is_exempt    boolean
)
returns table(company_id uuid, slug text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_base text;
  v_slug text;
  v_n    integer := 0;
  v_id   uuid;

  -- Every fixed route in src/App.jsx, plus the obvious hand typed guesses.
  v_reserved text[] := array[
    'workspace', 'demo', 'admin', 'chat', 'auth', 'setup', 'join',
    'services', 'contact', 'founder', 'anthony', 'insights',
    'form-builder', 'login', 'signin', 'sign-in', 'signup', 'sign-up',
    'api', 'app', 'www', 'static', 'assets', 'public', 'help', 'support',
    'about', 'pricing', 'terms', 'privacy', 'blog', 'docs'
  ];
begin
  v_base := regexp_replace(lower(trim(p_company_name)), '[^a-z0-9]+', '-', 'g');
  v_base := trim(both '-' from v_base);
  v_base := left(v_base, 40);
  if v_base = '' or v_base is null then
    v_base := 'company';
  end if;

  -- Two companies called Acme both get in. The second becomes acme-1.
  -- A company called Services also gets in, as services-1, because the
  -- reserved check sits in the same loop as the collision check.
  v_slug := v_base;
  while exists (select 1 from public.companies c where c.slug = v_slug)
     or v_slug = any (v_reserved)
  loop
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
$function$;

comment on function public.create_company_workspace is
  'Creates a company and its first admin. The slug is derived from the name '
  'and can never be a reserved word or a slug already taken; either case '
  'falls through to the same numbering, so Services becomes services-1.';
