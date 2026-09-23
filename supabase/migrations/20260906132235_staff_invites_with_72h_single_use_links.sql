-- An invitation is a link, not a password an admin has to read out.
--
-- Two rules it has to keep, and they are the reason this is a table rather
-- than a signed token in a URL:
--
--   Single use. Once someone clicks it, it is spent. A link that still
--   works after it has been used is a standing key sitting in an inbox.
--   Time limited. 72 hours. Long enough to survive a weekend, short enough
--   that a forwarded email or a compromised mailbox stops being a way in.
--
-- The raw token is never stored. Only its SHA-256 is, the same way a
-- password would be, so a copy of this table hands nobody a session. The
-- raw token exists in the link and nowhere else.

create table if not exists public.staff_invites (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  staff_id    uuid not null references public.staff(id) on delete cascade,
  email       text not null,
  token_hash  text not null unique,
  created_by  uuid not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  used_at     timestamptz
);

create index if not exists staff_invites_company_idx on public.staff_invites (company_id);

-- RLS on with no policies at all, exactly like access_codes. Only the
-- service role reaches this, and that only happens inside an edge function.
-- A browser cannot read the token hashes or enumerate pending invitations.
alter table public.staff_invites enable row level security;

-- How long an invitation lives. Named rather than inlined so the number is
-- in one place when it changes.
create or replace function public.staff_invite_lifetime()
returns interval
language sql
immutable
as $function$ select interval '72 hours' $function$;

-- Redeeming is one statement so two clicks on the same link cannot both
-- win. The update is the guard: it only matches a row that is unused and
-- unexpired, so the second click finds nothing and gets told why.
create or replace function public.redeem_staff_invite(p_token_hash text)
returns table (outcome text, email text, staff_id uuid, slug text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
  v_used timestamptz;
  v_expires timestamptz;
begin
  select si.id, si.used_at, si.expires_at
    into v_id, v_used, v_expires
    from public.staff_invites si
   where si.token_hash = p_token_hash;

  if not found then
    return query select 'not_found'::text, null::text, null::uuid, null::text;
    return;
  end if;

  -- Said apart from expiry on purpose. "You already used this" and "this
  -- ran out" need different things from the person reading them: one asks
  -- their admin to resend, the other just signs in.
  if v_used is not null then
    return query select 'already_used'::text, null::text, null::uuid, null::text;
    return;
  end if;

  if v_expires <= now() then
    return query select 'expired'::text, null::text, null::uuid, null::text;
    return;
  end if;

  return query
    update public.staff_invites si
       set used_at = now()
     where si.id = v_id
       and si.used_at is null
       and si.expires_at > now()
    returning 'ok'::text,
              si.email,
              si.staff_id,
              (select c.slug from public.companies c where c.id = si.company_id);

  -- Lost the race to another click between the read and the write.
  if not found then
    return query select 'already_used'::text, null::text, null::uuid, null::text;
  end if;
end;
$function$;

revoke all on function public.redeem_staff_invite(text) from public, anon, authenticated;
revoke all on function public.staff_invite_lifetime() from public, anon, authenticated;
