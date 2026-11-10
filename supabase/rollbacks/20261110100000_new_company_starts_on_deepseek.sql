-- Undo: new workspaces go back to the code default (Anthropic).
drop trigger if exists companies_start_on_deepseek on public.companies;
drop function if exists private.new_company_starts_on_deepseek();
