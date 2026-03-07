-- Integration configurations per organization
create table integrations (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  provider text not null check (provider in ('google_analytics', 'meta_ads', 'google_ads')),
  config jsonb not null default '{}'::jsonb,
  is_active boolean default false,
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(org_id, provider)
);

create index integrations_org_id_idx on integrations(org_id);

alter table integrations enable row level security;

create policy "Users can access integrations from their org"
  on integrations for all
  using (
    exists(
      select 1 from organization_members
      where org_id = integrations.org_id and user_id = auth.uid()
    )
  );

create trigger integrations_updated_at before update on integrations
  for each row execute function update_updated_at();

-- Cached analytics data
create table analytics_data (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  integration_id uuid not null references integrations(id) on delete cascade,
  metric_type text not null check (metric_type in (
    'page_views', 'sessions', 'users', 'bounce_rate',
    'top_pages', 'traffic_sources', 'conversions',
    'ad_spend', 'ad_impressions', 'ad_clicks', 'ad_ctr', 'ad_cpc',
    'ad_campaigns', 'lead_ads'
  )),
  data jsonb not null default '{}'::jsonb,
  period_start date not null,
  period_end date not null,
  fetched_at timestamp with time zone default now()
);

create index analytics_data_org_id_idx on analytics_data(org_id);
create index analytics_data_integration_idx on analytics_data(integration_id, metric_type);
create index analytics_data_period_idx on analytics_data(org_id, period_start, period_end);

alter table analytics_data enable row level security;

create policy "Users can access analytics from their org"
  on analytics_data for all
  using (
    exists(
      select 1 from organization_members
      where org_id = analytics_data.org_id and user_id = auth.uid()
    )
  );
