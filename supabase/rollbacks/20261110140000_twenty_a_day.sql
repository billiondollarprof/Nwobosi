-- Undo 20261110140000_twenty_a_day.sql. Staff limits cleared by it are not restored.
alter table public.companies alter column default_daily_limit set default 5;
update public.companies set default_daily_limit = 5 where default_daily_limit = 20;
