-- ============================================================
-- HELPERS
-- Both are security definer so they bypass row level security
-- themselves. Without that, a policy on staff that reads staff
-- would recurse forever.
-- ============================================================

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.staff where id = auth.uid()
$$;

create or replace function public.is_admin()
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

-- ============================================================
-- TURN IT ON EVERYWHERE
-- Nothing is readable until a policy below says so.
-- ============================================================

alter table public.companies         enable row level security;
alter table public.staff             enable row level security;
alter table public.access_requests   enable row level security;
alter table public.knowledge_sources enable row level security;
alter table public.knowledge_chunks  enable row level security;
alter table public.work_history      enable row level security;
alter table public.connectors        enable row level security;

-- ============================================================
-- COMPANIES
-- ============================================================

create policy companies_read on public.companies
  for select to authenticated
  using (id = public.current_company_id());

create policy companies_admin_update on public.companies
  for update to authenticated
  using (id = public.current_company_id() and public.is_admin())
  with check (id = public.current_company_id() and public.is_admin());

-- ============================================================
-- STAFF
-- Colleagues are visible inside a company. Only an admin can
-- invite, change a ceiling, or revoke.
-- ============================================================

create policy staff_read on public.staff
  for select to authenticated
  using (company_id = public.current_company_id());

create policy staff_admin_insert on public.staff
  for insert to authenticated
  with check (company_id = public.current_company_id() and public.is_admin());

create policy staff_admin_update on public.staff
  for update to authenticated
  using (company_id = public.current_company_id() and public.is_admin())
  with check (company_id = public.current_company_id() and public.is_admin());

create policy staff_admin_delete on public.staff
  for delete to authenticated
  using (company_id = public.current_company_id() and public.is_admin());

-- ============================================================
-- ACCESS REQUESTS
-- Admins only. There is deliberately no insert policy: a request
-- comes from someone with no account, so it is created server
-- side through an edge function. That keeps the table from
-- being open to anonymous spam.
-- ============================================================

create policy access_requests_admin_read on public.access_requests
  for select to authenticated
  using (company_id = public.current_company_id() and public.is_admin());

create policy access_requests_admin_update on public.access_requests
  for update to authenticated
  using (company_id = public.current_company_id() and public.is_admin())
  with check (company_id = public.current_company_id() and public.is_admin());

create policy access_requests_admin_delete on public.access_requests
  for delete to authenticated
  using (company_id = public.current_company_id() and public.is_admin());

-- ============================================================
-- KNOWLEDGE SOURCES
-- Every staff member can see what the assistant is allowed to
-- read. That is deliberate: showing the source list is one of
-- the two things that earns trust. Only admins can change it.
-- ============================================================

create policy knowledge_sources_read on public.knowledge_sources
  for select to authenticated
  using (company_id = public.current_company_id());

create policy knowledge_sources_admin_write on public.knowledge_sources
  for all to authenticated
  using (company_id = public.current_company_id() and public.is_admin())
  with check (company_id = public.current_company_id() and public.is_admin());

-- ============================================================
-- KNOWLEDGE CHUNKS
-- Readable inside the company, written by ingestion running as
-- the service role.
-- ============================================================

create policy knowledge_chunks_read on public.knowledge_chunks
  for select to authenticated
  using (company_id = public.current_company_id());

create policy knowledge_chunks_admin_write on public.knowledge_chunks
  for all to authenticated
  using (company_id = public.current_company_id() and public.is_admin())
  with check (company_id = public.current_company_id() and public.is_admin());

-- ============================================================
-- WORK HISTORY
-- A staff member sees their own work. An admin sees the whole
-- company, which is what the usage history screen needs.
-- ============================================================

create policy work_history_read on public.work_history
  for select to authenticated
  using (
    company_id = public.current_company_id()
    and (staff_id = auth.uid() or public.is_admin())
  );

create policy work_history_insert_own on public.work_history
  for insert to authenticated
  with check (
    company_id = public.current_company_id()
    and staff_id = auth.uid()
  );

create policy work_history_update_own on public.work_history
  for update to authenticated
  using (company_id = public.current_company_id() and staff_id = auth.uid())
  with check (company_id = public.current_company_id() and staff_id = auth.uid());

create policy work_history_delete on public.work_history
  for delete to authenticated
  using (
    company_id = public.current_company_id()
    and (staff_id = auth.uid() or public.is_admin())
  );

-- ============================================================
-- CONNECTORS
-- A staff member's own connector is theirs alone. An admin can
-- see and manage company wide ones, and cannot read anyone's
-- personal tokens.
-- ============================================================

create policy connectors_read on public.connectors
  for select to authenticated
  using (
    (scope = 'company' and company_id = public.current_company_id())
    or (scope = 'staff' and staff_id = auth.uid())
  );

create policy connectors_staff_write on public.connectors
  for all to authenticated
  using (scope = 'staff' and staff_id = auth.uid())
  with check (
    scope = 'staff'
    and staff_id = auth.uid()
    and company_id = public.current_company_id()
  );

create policy connectors_admin_write on public.connectors
  for all to authenticated
  using (
    scope = 'company'
    and company_id = public.current_company_id()
    and public.is_admin()
  )
  with check (
    scope = 'company'
    and company_id = public.current_company_id()
    and public.is_admin()
  );
