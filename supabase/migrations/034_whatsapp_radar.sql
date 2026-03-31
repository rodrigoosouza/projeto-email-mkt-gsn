-- WhatsApp connections per org
CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone_number TEXT,
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connecting', 'connected', 'qr_pending')),
  qr_code TEXT,
  session_data JSONB DEFAULT '{}',
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id)
);

-- Monitored groups
CREATE TABLE IF NOT EXISTS whatsapp_monitored_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  group_jid TEXT NOT NULL,
  group_name TEXT NOT NULL,
  group_picture_url TEXT,
  participant_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, group_jid)
);

-- Keywords to monitor
CREATE TABLE IF NOT EXISTS whatsapp_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  category TEXT DEFAULT 'geral',
  is_active BOOLEAN DEFAULT true,
  matches_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, keyword)
);

-- Detected opportunities (NOT leads table)
CREATE TABLE IF NOT EXISTS whatsapp_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  push_name TEXT,
  group_jid TEXT NOT NULL,
  group_name TEXT NOT NULL,
  message_text TEXT NOT NULL,
  keyword_matched TEXT NOT NULL,
  keyword_category TEXT DEFAULT 'geral',
  status TEXT DEFAULT 'novo' CHECK (status IN ('novo', 'abordado', 'respondeu', 'converteu', 'ignorado')),
  notes TEXT,
  detected_at TIMESTAMPTZ DEFAULT now(),
  last_approach_at TIMESTAMPTZ,
  converted_to_lead_id UUID REFERENCES leads(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Message history
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  group_jid TEXT,
  chat_jid TEXT,
  sender_phone TEXT,
  sender_name TEXT,
  message_text TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document', 'sticker')),
  is_from_me BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_wpp_opportunities_org ON whatsapp_opportunities(org_id, detected_at DESC);
CREATE INDEX idx_wpp_opportunities_status ON whatsapp_opportunities(org_id, status);
CREATE INDEX idx_wpp_messages_group ON whatsapp_messages(org_id, group_jid, timestamp DESC);
CREATE INDEX idx_wpp_messages_chat ON whatsapp_messages(org_id, chat_jid, timestamp DESC);
CREATE INDEX idx_wpp_keywords_org ON whatsapp_keywords(org_id);

-- RLS
ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_monitored_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wpp_connections_access" ON whatsapp_connections FOR ALL USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "wpp_groups_access" ON whatsapp_monitored_groups FOR ALL USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "wpp_keywords_access" ON whatsapp_keywords FOR ALL USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "wpp_opportunities_access" ON whatsapp_opportunities FOR ALL USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "wpp_messages_access" ON whatsapp_messages FOR ALL USING (org_id IN (SELECT get_user_org_ids()));
