-- SMS messages
create table sms_messages (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  phone_number text not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  body text not null,
  status text check (status in ('queued', 'sent', 'delivered', 'failed', 'received')),
  provider_message_id text,
  error_message text,
  created_at timestamp with time zone default now()
);

create index sms_messages_org_id_idx on sms_messages(org_id, created_at desc);
create index sms_messages_lead_id_idx on sms_messages(lead_id);
alter table sms_messages enable row level security;
create policy "Users can access sms from their org" on sms_messages for all
  using (exists(select 1 from organization_members where org_id = sms_messages.org_id and user_id = auth.uid()));

-- SMS broadcasts
create table sms_broadcasts (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  body text not null,
  segment_id uuid references segments(id) on delete set null,
  status text not null check (status in ('draft', 'sending', 'sent', 'failed')) default 'draft',
  total_recipients integer default 0,
  total_sent integer default 0,
  total_delivered integer default 0,
  total_failed integer default 0,
  sent_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  created_by uuid not null references users(id) on delete cascade
);

create index sms_broadcasts_org_id_idx on sms_broadcasts(org_id);
alter table sms_broadcasts enable row level security;
create policy "Users can access sms broadcasts from their org" on sms_broadcasts for all
  using (exists(select 1 from organization_members where org_id = sms_broadcasts.org_id and user_id = auth.uid()));

-- Embeddable forms
create table lead_forms (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  form_type text not null check (form_type in ('inline', 'popup', 'slide_in', 'floating_button')),
  fields jsonb not null default '[{"name":"email","label":"Email","type":"email","required":true}]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  style jsonb not null default '{}'::jsonb,
  success_message text default 'Obrigado! Recebemos seus dados.',
  redirect_url text,
  tag_ids jsonb default '[]'::jsonb,
  segment_id uuid references segments(id) on delete set null,
  is_active boolean default true,
  submission_count integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid not null references users(id) on delete cascade
);

create index lead_forms_org_id_idx on lead_forms(org_id);
alter table lead_forms enable row level security;
create policy "Users can access forms from their org" on lead_forms for all
  using (exists(select 1 from organization_members where org_id = lead_forms.org_id and user_id = auth.uid()));
create trigger lead_forms_updated_at before update on lead_forms for each row execute function update_updated_at();

-- Form submissions
create table form_submissions (
  id uuid primary key default uuid_generate_v4(),
  form_id uuid not null references lead_forms(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  source_url text,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone default now()
);

create index form_submissions_form_id_idx on form_submissions(form_id, created_at desc);
create index form_submissions_org_id_idx on form_submissions(org_id);
alter table form_submissions enable row level security;
create policy "Users can access submissions from their org" on form_submissions for all
  using (exists(select 1 from organization_members where org_id = form_submissions.org_id and user_id = auth.uid()));
