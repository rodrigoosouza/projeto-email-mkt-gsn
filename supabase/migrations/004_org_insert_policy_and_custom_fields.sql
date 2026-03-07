-- Allow authenticated users to create organizations
create policy "Authenticated users can create organizations"
  on organizations for insert
  with check (auth.uid() = created_by);

-- Custom field definitions per organization
create table custom_field_definitions (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  label text not null,
  field_type text not null check (field_type in ('text', 'number', 'date', 'select', 'boolean', 'url', 'email', 'phone')),
  options jsonb, -- for select type: ["option1", "option2"]
  required boolean default false,
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(org_id, name)
);

create index custom_field_definitions_org_id_idx on custom_field_definitions(org_id);

alter table custom_field_definitions enable row level security;

create policy "Users can access custom fields from their org"
  on custom_field_definitions for all
  using (
    exists(
      select 1 from organization_members
      where org_id = custom_field_definitions.org_id and user_id = auth.uid()
    )
  );

create trigger custom_field_definitions_updated_at before update on custom_field_definitions
  for each row execute function update_updated_at();
