-- TWENTY DOCUMENTS A DAY BY DEFAULT. Anthony, 2026-11-10: "put the cap for
-- everybody to be 20 a day. Then admin does not have cap... admin can still
-- reduce it." Admins are not limited at all (the assistant skips the check
-- for them); the money meter is their cap. Changes to a finished document
-- do not count here, they have their own cap of 20 a day in the assistant.

-- 1. New workspaces start at 20.
alter table public.companies alter column default_daily_limit set default 20;

-- 2. Every existing workspace still on the old default of 5 moves to 20.
update public.companies set default_daily_limit = 20 where default_daily_limit = 5;

-- 3. Staff who were given 5 only because 5 was the default follow the new
--    default instead. A number an admin chose on purpose (anything but 5)
--    is left alone.
update public.staff set daily_limit = null where daily_limit = 5 and access_level <> 'admin';
