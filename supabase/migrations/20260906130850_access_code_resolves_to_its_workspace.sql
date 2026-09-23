-- The access code stops being a token that is spent and becomes the key to
-- a demo workspace. Entering it the first time builds one; entering it again
-- opens the one it already built.
--
-- peek_access_code is left exactly as it is. It still answers "already_used"
-- for a redeemed code, and anything still calling it keeps its old meaning.
-- This is additive on purpose: two companies and three staff already exist
-- and none of their sign in path may change.
--
-- admin_id is resolved here rather than in the edge function so the caller
-- makes one round trip instead of three, and so the rule for "who is the
-- admin of this company" lives next to the data.

create or replace function public.resolve_access_code(p_code text)
returns table (outcome text, company_id uuid, slug text, admin_id uuid)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_status code_status;
  v_company uuid;
begin
  select ac.status, ac.company_id
    into v_status, v_company
    from public.access_codes ac
   where ac.code = p_code;

  if not found then
    return query select 'not_found'::text, null::uuid, null::text, null::uuid;
    return;
  end if;

  if v_status = 'revoked' then
    return query select 'revoked'::text, null::uuid, null::text, null::uuid;
    return;
  end if;

  -- Someone is partway through building with this code right now. Not an
  -- error and not a resume: it resolves itself when they finish or when the
  -- half finished attempt is released.
  if v_status = 'redeeming' then
    return query select 'in_progress'::text, null::uuid, null::text, null::uuid;
    return;
  end if;

  if v_status = 'redeemed' then
    -- A redeemed code with no company, or whose company has since been
    -- deleted, has nothing to open. Saying not_found is better than handing
    -- back a resume that cannot work.
    return query
      select 'resume'::text,
             c.id,
             c.slug,
             (select s.id
                from public.staff s
               where s.company_id = c.id
                 and s.access_level = 'admin'
               order by s.created_at
               limit 1)
        from public.companies c
       where c.id = v_company;

    if not found then
      return query select 'not_found'::text, null::uuid, null::text, null::uuid;
    end if;
    return;
  end if;

  return query select 'new'::text, null::uuid, null::text, null::uuid;
end;
$function$;

revoke all on function public.resolve_access_code(text) from public, anon, authenticated;
