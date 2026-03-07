-- =============================================
-- Migration 003: Invitations
-- Convites para novos membros da organizacao
-- =============================================

create table invitations (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'editor', 'viewer')),
  token text unique not null,
  status text not null check (status in ('pending', 'accepted', 'expired')) default 'pending',
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone default (now() + interval '7 days'),
  created_by uuid not null references users(id) on delete set null,
  unique(org_id, email)
);

create index invitations_org_id_idx on invitations(org_id);
create index invitations_token_idx on invitations(token);

alter table invitations enable row level security;

create policy "Users can view invitations in their org"
  on invitations for select
  using (
    exists(
      select 1 from organization_members
      where org_id = invitations.org_id and user_id = auth.uid()
    )
  );

create policy "Admins can manage invitations in their org"
  on invitations for all
  using (
    exists(
      select 1 from organization_members
      where org_id = invitations.org_id
        and user_id = auth.uid()
        and role = 'admin'
    )
  );
