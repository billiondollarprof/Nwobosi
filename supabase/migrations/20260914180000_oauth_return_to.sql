-- =========================================================================
-- WHERE TO SEND SOMEBODY BACK TO AFTER THEY APPROVE
--
-- WHY THIS EXISTS
-- Anthony, 2026-09-14: "it doesn't open a different tab, but rather
-- preserves the page. When the person clicks to connect, as it connects, it
-- returns back, like a callback. It returns back to where the person was,
-- exactly."
--
-- Connecting used to open a new tab, and the person was left there with a
-- page saying "you can close this now". Now the page itself goes to Canva
-- and comes back. For the callback to bring them back, it has to know where
-- they started, and that has to survive the trip out to Canva and back.
--
-- WHY IT IS A COLUMN AND NOT SOMETHING IN THE URL
-- Anything in the URL comes back from Canva through the person's browser,
-- so it can be changed on the way. This is written down before they leave,
-- read after they return, and never taken from the query string. The state
-- value is what ties the two together, and it already has to match a stored
-- row exactly.
--
-- IT IS CHECKED TWICE, AND NOT BECAUSE OF THIS COLUMN
-- The address is checked against a list of places this product is served
-- from before it is stored, AND again before the redirect happens. A check
-- that only runs on the way in trusts every path that could ever write to
-- this row later. See supabase/functions/_shared/returnTo.ts.
--
-- NULLABLE ON PURPOSE. A handshake with no return address is valid: the
-- callback then shows its own page instead of redirecting. Requiring one
-- would mean a missing value breaks the connection rather than degrading
-- it.
--
-- THIS ONLY ADDS. One nullable column on a table created today, which holds
-- nothing but handshakes that are minutes old. No existing value is read,
-- changed or dropped.
-- =========================================================================

alter table public.oauth_pending
  add column if not exists return_to text;

comment on column public.oauth_pending.return_to is
  'Where to send the person after they approve. Checked against an allowlist of this product own addresses before it is stored and again before the redirect. Null is valid and means the callback shows its own page instead.';
