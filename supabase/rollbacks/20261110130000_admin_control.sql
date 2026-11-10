-- Undo 20261110130000_admin_control.sql. Limits, pauses and activity times go.
drop function if exists public.staff_activity();
drop function if exists public.mark_signed_out();
alter table public.staff
  drop column if exists signed_out_at,
  drop column if exists last_seen_at,
  drop column if exists paused_at,
  drop column if exists weekly_limit;
