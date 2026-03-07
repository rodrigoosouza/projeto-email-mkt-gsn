-- Lead events table for timeline tracking
create table lead_events (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  event_type text not null check (event_type in (
    'created', 'updated', 'tag_added', 'tag_removed',
    'email_sent', 'email_delivered', 'email_opened', 'email_clicked',
    'email_bounced', 'email_complained',
    'segment_added', 'segment_removed',
    'score_changed', 'status_changed',
    'campaign_added', 'note', 'custom'
  )),
  title text not null,
  description text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

create index lead_events_lead_id_idx on lead_events(lead_id, created_at desc);
create index lead_events_org_id_idx on lead_events(org_id);
create index lead_events_type_idx on lead_events(lead_id, event_type);

alter table lead_events enable row level security;

create policy "Users can access events from their org"
  on lead_events for all
  using (
    exists(
      select 1 from organization_members
      where org_id = lead_events.org_id and user_id = auth.uid()
    )
  );
