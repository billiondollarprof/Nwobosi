-- ============================================================
-- The two helpers must stay security definer, otherwise a policy
-- on staff that reads staff recurses. But anything sitting in the
-- public schema is also published as a REST endpoint, which meant
-- /rest/v1/rpc/is_admin was callable from outside.
--
-- Fix: move them into a private schema. PostgREST does not expose
-- it, so they stop being endpoints, while policies can still call
-- them normally.
-- ============================================================

create schema if not exists private;

-- Policies depend on the functions, so they come down first.
drop policy if exists companies_read                  on public.companies;
drop policy if exists companies_admin_update          on public.companies;
drop policy if exists staff_read                      on public.staff;
drop policy if exists staff_admin_insert              on public.staff;
drop policy if exists staff_admin_update              on public.staff;
drop policy if exists staff_admin_delete              on public.staff;
drop policy if exists access_requests_admin_read      on public.access_requests;
drop policy if exists access_requests_admin_update    on public.access_requests;
drop policy if exists access_requests_admin_delete    on public.access_requests;
drop policy if exists knowledge_sources_read          on public.knowledge_sources;
drop policy if exists knowledge_sources_admin_write   on public.knowledge_sources;
drop policy if exists knowledge_chunks_read           on public.knowledge_chunks;
drop policy if exists knowledge_chunks_admin_write    on public.knowledge_chunks;
drop policy if exists work_history_read               on public.work_history;
drop policy if exists work_history_insert_own         on public.work_history;
drop policy if exists work_history_update_own         on public.work_history;
drop policy if exists work_history_delete             on public.work_history;
drop policy if exists connectors_read                 on public.connectors;
drop policy if exists connectors_staff_write          on public.connectors;
drop policy if exists connectors_admin_write          on public.connectors;

drop function if exists public.current_company_id();
drop function if exists public.is_admin();

-- ============================================================
-- HELPERS, now out of reach of the API
-- ============================================================

create or replace function private.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.staff where id = auth.uid()
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select access_level = 'admin' from public.staff where id = auth.uid()),
    false
  )
$$;

-- Policies are evaluated as the querying role, so it still needs
-- to be able to call these. It just cannot reach them over HTTP.
grant usage on schema private to authenticated;
grant execute on function private.current_company_id() to authenticated;
grant execute on function private.is_admin() to authenticated;

revoke all on schema private from anon;

-- ============================================================
-- POLICIES, rebuilt against the private helpers
-- ============================================================

-- Companies
create policy companies_read on public.companies
  for select to authenticated
  using (id = private.current_company_id());

create policy companies_admin_update on public.companies
  for update to authenticated
  using (id = private.current_company_id() and private.is_admin())
  with check (id = private.current_company_id() and private.is_admin());

-- Staff
create policy staff_read on public.staff
  for select to authenticated
  using (company_id = private.current_company_id());

create policy staff_admin_insert on public.staff
  for insert to authenticated
  with check (company_id = private.current_company_id() and private.is_admin());

create policy staff_admin_update on public.staff
  for update to authenticated
  using (company_id = private.current_company_id() and private.is_admin())
  with check (company_id = private.current_company_id() and private.is_admin());

create policy staff_admin_delete on public.staff
  for delete to authenticated
  using (company_id = private.current_company_id() and private.is_admin());

-- Access requests
create policy access_requests_admin_read on public.access_requests
  for select to authenticated
  using (company_id = private.current_company_id() and private.is_admin());

create policy access_requests_admin_update on public.access_requests
  for update to authenticated
  using (company_id = private.current_company_id() and private.is_admin())
  with check (company_id = private.current_company_id() and private.is_admin());

create policy access_requests_admin_delete on public.access_requests
  for delete to authenticated
  using (company_id = private.current_company_id() and private.is_admin());

-- Knowledge sources
create policy knowledge_sources_read on public.knowledge_sources
  for select to authenticated
  using (company_id = private.current_company_id());

create policy knowledge_sources_admin_write on public.knowledge_sources
  for all to authenticated
  using (company_id = private.current_company_id() and private.is_admin())
  with check (company_id = private.current_company_id() and private.is_admin());

-- Knowledge chunks
create policy knowledge_chunks_read on public.knowledge_chunks
  for select to authenticated
  using (company_id = private.current_company_id());

create policy knowledge_chunks_admin_write on public.knowledge_chunks
  for all to authenticated
  using (company_id = private.current_company_id() and private.is_admin())
  with check (company_id = private.current_company_id() and private.is_admin());

-- Work history
create policy work_history_read on public.work_history
  for select to authenticated
  using (
    company_id = private.current_company_id()
    and (staff_id = auth.uid() or private.is_admin())
  );

create policy work_history_insert_own on public.work_history
  for insert to authenticated
  with check (
    company_id = private.current_company_id()
    and staff_id = auth.uid()
  );

create policy work_history_update_own on public.work_history
  for update to authenticated
  using (company_id = private.current_company_id() and staff_id = auth.uid())
  with check (company_id = private.current_company_id() and staff_id = auth.uid());

create policy work_history_delete on public.work_history
  for delete to authenticated
  using (
    company_id = private.current_company_id()
    and (staff_id = auth.uid() or private.is_admin())
  );

-- Connectors
create policy connectors_read on public.connectors
  for select to authenticated
  using (
    (scope = 'company' and company_id = private.current_company_id())
    or (scope = 'staff' and staff_id = auth.uid())
  );

create policy connectors_staff_write on public.connectors
  for all to authenticated
  using (scope = 'staff' and staff_id = auth.uid())
  with check (
    scope = 'staff'
    and staff_id = auth.uid()
    and company_id = private.current_company_id()
  );

create policy connectors_admin_write on public.connectors
  for all to authenticated
  using (
    scope = 'company'
    and company_id = private.current_company_id()
    and private.is_admin()
  )
  with check (
    scope = 'company'
    and company_id = private.current_company_id()
    and private.is_admin()
  );
