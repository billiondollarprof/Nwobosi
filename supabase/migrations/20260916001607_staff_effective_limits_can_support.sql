-- can_support has to come through the view, because loadMe reads this view
-- and not the staff table. A column added to staff that never reaches the
-- view is a column the app cannot see, which looks like the feature was
-- never built.
--
-- IT GOES LAST, and that is not a style choice. "create or replace view"
-- matches the existing columns by position, so inserting a new one in the
-- middle tries to rename every column after it and Postgres refuses. A new
-- column on a replaced view is always appended.
create or replace view public.staff_effective_limits as
  select s.id,
         s.company_id,
         s.name,
         s.role,
         s.access_level,
         coalesce(s.model_ceiling, c.default_model_ceiling) as model_ceiling,
         coalesce(s.daily_limit, c.default_daily_limit) as daily_limit,
         s.model_ceiling is null as ceiling_is_default,
         s.daily_limit is null as limit_is_default,
         s.can_support
    from staff s
    join companies c on c.id = s.company_id;
