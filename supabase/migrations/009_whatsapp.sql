-- WhatsApp message templates
create table whatsapp_templates (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  language text not null default 'pt_BR',
  category text not null check (category in ('marketing', 'utility', 'authentication')),
  status text not null check (status in ('draft', 'pending', 'approved', 'rejected')) default 'draft',
  components jsonb not null default '[]'::jsonb,
  wa_template_id text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(org_id, name)
);

create index whatsapp_templates_org_id_idx on whatsapp_templates(org_id);
alter table whatsapp_templates enable row level security;
create policy "Users can access wa templates from their org" on whatsapp_templates for all
  using (exists(select 1 from organization_members where org_id = whatsapp_templates.org_id and user_id = auth.uid()));
create trigger whatsapp_templates_updated_at before update on whatsapp_templates for each row execute function update_updated_at();

-- WhatsApp conversations (inbox)
create table whatsapp_conversations (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  phone_number text not null,
  contact_name text,
  status text not null check (status in ('open', 'closed', 'expired')) default 'open',
  last_message_at timestamp with time zone,
  unread_count integer default 0,
  assigned_to uuid references users(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index whatsapp_conversations_org_id_idx on whatsapp_conversations(org_id, status);
create index whatsapp_conversations_phone_idx on whatsapp_conversations(org_id, phone_number);
alter table whatsapp_conversations enable row level security;
create policy "Users can access wa conversations from their org" on whatsapp_conversations for all
  using (exists(select 1 from organization_members where org_id = whatsapp_conversations.org_id and user_id = auth.uid()));
create trigger whatsapp_conversations_updated_at before update on whatsapp_conversations for each row execute function update_updated_at();

-- WhatsApp messages
create table whatsapp_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references whatsapp_conversations(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  message_type text not null check (message_type in ('text', 'image', 'document', 'video', 'audio', 'template', 'interactive', 'reaction')),
  content jsonb not null default '{}'::jsonb,
  wa_message_id text,
  status text check (status in ('sent', 'delivered', 'read', 'failed', 'received')),
  created_at timestamp with time zone default now()
);

create index whatsapp_messages_conversation_idx on whatsapp_messages(conversation_id, created_at);
create index whatsapp_messages_wa_id_idx on whatsapp_messages(wa_message_id);
alter table whatsapp_messages enable row level security;
create policy "Users can access wa messages from their org" on whatsapp_messages for all
  using (exists(select 1 from organization_members where org_id = whatsapp_messages.org_id and user_id = auth.uid()));

-- WhatsApp bulk sends
create table whatsapp_broadcasts (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  template_id uuid not null references whatsapp_templates(id) on delete cascade,
  segment_id uuid references segments(id) on delete set null,
  status text not null check (status in ('draft', 'sending', 'sent', 'failed')) default 'draft',
  total_recipients integer default 0,
  total_sent integer default 0,
  total_delivered integer default 0,
  total_read integer default 0,
  total_failed integer default 0,
  sent_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  created_by uuid not null references users(id) on delete cascade
);

create index whatsapp_broadcasts_org_id_idx on whatsapp_broadcasts(org_id);
alter table whatsapp_broadcasts enable row level security;
create policy "Users can access wa broadcasts from their org" on whatsapp_broadcasts for all
  using (exists(select 1 from organization_members where org_id = whatsapp_broadcasts.org_id and user_id = auth.uid()));
