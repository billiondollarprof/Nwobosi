-- ADMIN CONTROL. Anthony, 2026-11-10: a weekly limit as well as daily, pause
-- and resume a person, and signed in, signed out, active now on the People
-- screen. No notice to staff about it (his decision).
--
-- What each piece is for:
--   weekly_limit   documents a person may make in seven days. Null means no
--                  weekly limit, only the daily one. Checked by the assistant
--                  function where a build starts.
--   paused_at      set by an admin to pause a person; every assistant turn is
--                  refused while it is set. Cleared to resume.
--   last_seen_at   written by the assistant function on every turn, with the
--                  service key. Drives "Active now".
--   signed_out_at  written by mark_signed_out() when the person signs out.
--
-- Admins already update staff rows through staff_admin_update, so the two
-- admin controls need no new policy. Staff cannot update their own row, so
-- signing out goes through a function that touches only signed_out_at.

alter table public.staff
  add column if not exists weekly_limit integer check (weekly_limit is null or weekly_limit > 0),
  add column if not exists paused_at timestamptz,
  add column if not exists last_seen_at timestamptz,
  add column if not exists signed_out_at timestamptz;

-- Signing out, recorded by the person themselves. Touches one column of
-- their own row and nothing else.
create or replace function public.mark_signed_out()
returns void
language sql
security definer
set search_path = public
as $$
  update public.staff set signed_out_at = now() where id = auth.uid();
$$;
revoke all on function public.mark_signed_out() from public, anon;
grant execute on function public.mark_signed_out() to authenticated;

-- Who signed in when, for an admin of the same company only. The sign in
-- time lives in auth.users, which the browser cannot read, so this hands
-- back that one column and nothing else from it.
create or replace function public.staff_activity()
returns table (staff_id uuid, last_sign_in_at timestamptz, last_seen_at timestamptz, signed_out_at timestamptz)
language sql
stable
security definer
set search_path = public, auth
as $$
  select s.id, u.last_sign_in_at, s.last_seen_at, s.signed_out_at
  from public.staff s
  join auth.users u on u.id = s.id
  where s.company_id = private.current_company_id()
    and private.is_admin()
$$;
revoke all on function public.staff_activity() from public, anon;
grant execute on function public.staff_activity() to authenticated;
