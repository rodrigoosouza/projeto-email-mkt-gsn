-- Automations table
create table automations (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  trigger_type text not null check (trigger_type in (
    'lead_created', 'tag_added', 'tag_removed',
    'score_threshold', 'email_opened', 'email_clicked',
    'status_changed', 'custom_event', 'scheduled'
  )),
  trigger_config jsonb default '{}'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  is_active boolean default false,
  n8n_workflow_id text,
  execution_count integer default 0,
  last_executed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid not null references users(id) on delete cascade
);

create index automations_org_id_idx on automations(org_id);
create index automations_trigger_idx on automations(org_id, trigger_type);

alter table automations enable row level security;

create policy "Users can access automations from their org"
  on automations for all
  using (
    exists(
      select 1 from organization_members
      where org_id = automations.org_id and user_id = auth.uid()
    )
  );

create trigger automations_updated_at before update on automations
  for each row execute function update_updated_at();

-- Automation execution logs
create table automation_logs (
  id uuid primary key default uuid_generate_v4(),
  automation_id uuid not null references automations(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  status text not null check (status in ('success', 'error', 'skipped')),
  trigger_data jsonb default '{}'::jsonb,
  actions_executed jsonb default '[]'::jsonb,
  error_message text,
  duration_ms integer,
  created_at timestamp with time zone default now()
);

create index automation_logs_automation_id_idx on automation_logs(automation_id, created_at desc);
create index automation_logs_org_id_idx on automation_logs(org_id, created_at desc);
create index automation_logs_lead_id_idx on automation_logs(lead_id);

alter table automation_logs enable row level security;

create policy "Users can access automation logs from their org"
  on automation_logs for all
  using (
    exists(
      select 1 from organization_members
      where org_id = automation_logs.org_id and user_id = auth.uid()
    )
  );
