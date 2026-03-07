-- =============================================
-- Migration 001: Core Tables
-- Plataforma de Email Marketing
-- =============================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ==================== FUNCTION: update_updated_at ====================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now() at time zone 'utc';
  return new;
end;
$$ language plpgsql;

-- ==================== ORGANIZATIONS ====================
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  logo_url text,
  website text,
  sender_email text,
  sender_name text,
  custom_domain text unique,
  domain_verified boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid not null
);

create index organizations_slug_idx on organizations(slug);

alter table organizations enable row level security;

-- ==================== USERS ====================
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  avatar_url text,
  created_at timestamp with time zone default now()
);

alter table users enable row level security;

create policy "Users can view their own data"
  on users for select
  using (id = auth.uid());

create policy "Users can update their own data"
  on users for update
  using (id = auth.uid());

-- ==================== ORGANIZATION_MEMBERS ====================
create table organization_members (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('admin', 'editor', 'viewer')),
  created_at timestamp with time zone default now(),
  unique(org_id, user_id)
);

create index organization_members_org_id_idx on organization_members(org_id);
create index organization_members_user_id_idx on organization_members(user_id);

alter table organization_members enable row level security;

create policy "Users can view members of their organizations"
  on organization_members for select
  using (
    exists(
      select 1 from organization_members om
      where om.org_id = organization_members.org_id
        and om.user_id = auth.uid()
    )
  );

create policy "Admins can manage members"
  on organization_members for all
  using (
    exists(
      select 1 from organization_members om
      where om.org_id = organization_members.org_id
        and om.user_id = auth.uid()
        and om.role = 'admin'
    )
  );

-- Now add RLS policies for organizations (depends on organization_members)
create policy "Users can view their organizations"
  on organizations for select
  using (
    exists(
      select 1 from organization_members om
      where om.org_id = organizations.id
        and om.user_id = auth.uid()
    )
  );

create policy "Admins can update their organizations"
  on organizations for update
  using (
    exists(
      select 1 from organization_members om
      where om.org_id = organizations.id
        and om.user_id = auth.uid()
        and om.role = 'admin'
    )
  );

-- ==================== LEADS ====================
create table leads (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  phone text,
  company text,
  position text,
  status text not null check (status in ('active', 'unsubscribed', 'bounced', 'complained'))
    default 'active',
  score integer check (score >= 0 and score <= 100) default 0,
  custom_fields jsonb default '{}'::jsonb,
  source text,
  external_id text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  last_contacted_at timestamp with time zone,
  unique(org_id, email)
);

create index leads_org_id_idx on leads(org_id);
create index leads_status_idx on leads(org_id, status);
create index leads_score_idx on leads(org_id, score);
create index leads_email_idx on leads(org_id, email);
create index leads_external_id_idx on leads(external_id);
create index leads_created_at_idx on leads(org_id, created_at desc);

alter table leads enable row level security;

create policy "Users can access leads from their org"
  on leads for all
  using (
    exists(
      select 1 from organization_members
      where org_id = leads.org_id and user_id = auth.uid()
    )
  );

-- ==================== LEAD_TAGS ====================
create table lead_tags (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  color text not null default '#3B82F6',
  created_at timestamp with time zone default now(),
  unique(org_id, name)
);

create index lead_tags_org_id_idx on lead_tags(org_id);

alter table lead_tags enable row level security;

create policy "Users can access tags from their org"
  on lead_tags for all
  using (
    exists(
      select 1 from organization_members
      where org_id = lead_tags.org_id and user_id = auth.uid()
    )
  );

-- ==================== LEAD_TAG_ASSIGNMENTS ====================
create table lead_tag_assignments (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references leads(id) on delete cascade,
  tag_id uuid not null references lead_tags(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(lead_id, tag_id)
);

create index lead_tag_assignments_lead_id_idx on lead_tag_assignments(lead_id);
create index lead_tag_assignments_tag_id_idx on lead_tag_assignments(tag_id);

alter table lead_tag_assignments enable row level security;

create policy "Users can manage tags on their leads"
  on lead_tag_assignments for all
  using (
    exists(
      select 1 from leads l
        join organization_members om on l.org_id = om.org_id
      where l.id = lead_tag_assignments.lead_id
        and om.user_id = auth.uid()
    )
  );

-- ==================== SEGMENTS ====================
create table segments (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  type text not null check (type in ('static', 'dynamic')),
  rules jsonb,
  lead_count integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(org_id, name)
);

create index segments_org_id_idx on segments(org_id);
create index segments_type_idx on segments(org_id, type);

alter table segments enable row level security;

create policy "Users can access segments from their org"
  on segments for all
  using (
    exists(
      select 1 from organization_members
      where org_id = segments.org_id and user_id = auth.uid()
    )
  );

-- ==================== SEGMENT_MEMBERSHIPS ====================
create table segment_memberships (
  id uuid primary key default uuid_generate_v4(),
  segment_id uuid not null references segments(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(segment_id, lead_id)
);

create index segment_memberships_segment_id_idx on segment_memberships(segment_id);
create index segment_memberships_lead_id_idx on segment_memberships(lead_id);

alter table segment_memberships enable row level security;

create policy "Users can manage segment memberships"
  on segment_memberships for all
  using (
    exists(
      select 1 from segments s
        join organization_members om on s.org_id = om.org_id
      where s.id = segment_memberships.segment_id
        and om.user_id = auth.uid()
    )
  );

-- ==================== EMAIL_TEMPLATES ====================
create table email_templates (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  category text default 'other',
  subject text not null,
  html_content text not null default '',
  unlayer_json jsonb,
  preview_text text,
  is_ai_generated boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid not null references users(id) on delete cascade,
  unique(org_id, name)
);

create index email_templates_org_id_idx on email_templates(org_id);
create index email_templates_category_idx on email_templates(org_id, category);

alter table email_templates enable row level security;

create policy "Users can access templates from their org"
  on email_templates for all
  using (
    exists(
      select 1 from organization_members
      where org_id = email_templates.org_id and user_id = auth.uid()
    )
  );

-- ==================== CAMPAIGNS ====================
create table campaigns (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  status text not null check (status in ('draft', 'scheduled', 'sending', 'sent', 'paused', 'failed'))
    default 'draft',
  template_id uuid not null references email_templates(id) on delete cascade,
  segment_id uuid not null references segments(id) on delete cascade,
  total_leads integer default 0,
  sent_at timestamp with time zone,
  scheduled_for timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid not null references users(id) on delete cascade
);

create index campaigns_org_id_idx on campaigns(org_id);
create index campaigns_status_idx on campaigns(org_id, status);
create index campaigns_template_id_idx on campaigns(template_id);
create index campaigns_segment_id_idx on campaigns(segment_id);

alter table campaigns enable row level security;

create policy "Users can access campaigns from their org"
  on campaigns for all
  using (
    exists(
      select 1 from organization_members
      where org_id = campaigns.org_id and user_id = auth.uid()
    )
  );

-- ==================== CAMPAIGN_STATS ====================
create table campaign_stats (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null unique references campaigns(id) on delete cascade,
  total_sent integer default 0,
  total_delivered integer default 0,
  total_opened integer default 0,
  total_clicked integer default 0,
  total_bounced integer default 0,
  total_complained integer default 0,
  updated_at timestamp with time zone default now()
);

alter table campaign_stats enable row level security;

create policy "Users can view stats for their campaigns"
  on campaign_stats for select
  using (
    exists(
      select 1 from campaigns c
        join organization_members om on c.org_id = om.org_id
      where c.id = campaign_stats.campaign_id
        and om.user_id = auth.uid()
    )
  );

-- ==================== CAMPAIGN_SEND_LOGS ====================
create table campaign_send_logs (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  email text not null,
  status text not null check (status in ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained'))
    default 'pending',
  mailersend_message_id text,
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  opened_at timestamp with time zone,
  clicked_at timestamp with time zone,
  bounced_at timestamp with time zone,
  complained_at timestamp with time zone,
  error_message text,
  updated_at timestamp with time zone default now()
);

create index campaign_send_logs_campaign_id_idx on campaign_send_logs(campaign_id);
create index campaign_send_logs_lead_id_idx on campaign_send_logs(lead_id);
create index campaign_send_logs_status_idx on campaign_send_logs(campaign_id, status);
create index campaign_send_logs_message_id_idx on campaign_send_logs(mailersend_message_id);

alter table campaign_send_logs enable row level security;

create policy "Users can view send logs for their campaigns"
  on campaign_send_logs for all
  using (
    exists(
      select 1 from campaigns c
        join organization_members om on c.org_id = om.org_id
      where c.id = campaign_send_logs.campaign_id
        and om.user_id = auth.uid()
    )
  );

-- ==================== TRIGGERS: updated_at ====================
create trigger organizations_updated_at before update on organizations
  for each row execute function update_updated_at();

create trigger leads_updated_at before update on leads
  for each row execute function update_updated_at();

create trigger segments_updated_at before update on segments
  for each row execute function update_updated_at();

create trigger email_templates_updated_at before update on email_templates
  for each row execute function update_updated_at();

create trigger campaigns_updated_at before update on campaigns
  for each row execute function update_updated_at();

create trigger campaign_stats_updated_at before update on campaign_stats
  for each row execute function update_updated_at();

create trigger campaign_send_logs_updated_at before update on campaign_send_logs
  for each row execute function update_updated_at();

-- ==================== FUNCTION: handle_new_user ====================
-- Auto-create user record when someone signs up via Supabase Auth
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
