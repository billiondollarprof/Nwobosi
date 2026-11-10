-- Every new workspace starts on DeepSeek.
--
-- Why: Anthony, 2026-11-10: "set it up so that every new workspace will
-- default to DeepSeek, because it's cheaper to run". Without a company_brain
-- row the edge functions fall back to Anthropic, which has no credit, so a new
-- workspace's first message failed.
--
-- What it must never do: change an existing company's brain. It only inserts
-- for a brand new company, and does nothing if a row is already there.
--
-- Applied to the live project 2026-11-10 with his yes, and checked by
-- inserting a company inside a transaction that was rolled back.
create or replace function private.new_company_starts_on_deepseek()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.company_brain (company_id, vendor)
  values (new.id, 'deepseek')
  on conflict (company_id) do nothing;
  return new;
end
$$;

revoke all on function private.new_company_starts_on_deepseek() from public;

create trigger companies_start_on_deepseek
after insert on public.companies
for each row execute function private.new_company_starts_on_deepseek();
