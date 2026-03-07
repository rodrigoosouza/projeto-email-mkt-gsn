-- Lead scoring rules per organization
create table lead_scoring_rules (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  condition_type text not null check (condition_type in (
    'email_opened', 'email_clicked', 'email_bounced', 'email_complained',
    'tag_added', 'tag_removed',
    'field_equals', 'field_contains', 'field_not_empty',
    'page_visited', 'form_submitted',
    'days_since_last_activity'
  )),
  condition_value text, -- e.g. tag name, field name, page URL
  score_change integer not null, -- positive to add, negative to subtract
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index lead_scoring_rules_org_id_idx on lead_scoring_rules(org_id);

alter table lead_scoring_rules enable row level security;

create policy "Users can access scoring rules from their org"
  on lead_scoring_rules for all
  using (
    exists(
      select 1 from organization_members
      where org_id = lead_scoring_rules.org_id and user_id = auth.uid()
    )
  );

create trigger lead_scoring_rules_updated_at before update on lead_scoring_rules
  for each row execute function update_updated_at();
