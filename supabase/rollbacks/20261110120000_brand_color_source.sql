-- Undo 20261110120000_brand_color_source.sql. The brand colour itself stays.
alter table public.companies drop column if exists brand_color_source;
