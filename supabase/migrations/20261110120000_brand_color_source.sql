-- Where the company's brand colour came from, so the knowledge map can say
-- "found in Amara brand guide" instead of only "found in their uploads".
-- Anthony, 2026-11-10. Written by the browser in src/shared/brandColour.js,
-- in the same update that sets brand_color, so it inherits that update's
-- row security. Nullable: an existing colour simply has no recorded origin.
alter table public.companies
  add column if not exists brand_color_source text;
