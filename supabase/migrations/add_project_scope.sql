-- Migration: add project_scope table
-- Run this in Supabase SQL Editor → New query → Run

create table if not exists project_scope (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid references tenants(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  type        text not null check (type in ('ip', 'domain', 'url', 'range', 'other')),
  value       text not null,
  notes       text,
  in_scope    boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index for fast project lookups
create index if not exists project_scope_project_id_idx on project_scope(project_id);
create index if not exists project_scope_tenant_id_idx  on project_scope(tenant_id);

-- RLS
alter table project_scope enable row level security;

-- Policy: users can only access scope entries for their own tenant
create policy "tenant_isolation" on project_scope
  for all
  using (
    tenant_id = (
      select tenant_id from profiles where id = auth.uid()
    )
  );

-- Auto-update updated_at
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists project_scope_updated_at on project_scope;
create trigger project_scope_updated_at
  before update on project_scope
  for each row execute function update_updated_at_column();
