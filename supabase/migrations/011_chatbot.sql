-- Migration 011: Chatbot tables
-- Chatbot configs, rules, conversations, and messages

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE chatbot_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  welcome_message text,
  ai_enabled boolean DEFAULT false,
  ai_model text DEFAULT 'claude-haiku-4-5-20251001',
  ai_system_prompt text,
  widget_color text DEFAULT '#3B82F6',
  widget_position text DEFAULT 'bottom-right',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE chatbot_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  chatbot_id uuid NOT NULL REFERENCES chatbot_configs(id),
  trigger_pattern text NOT NULL,
  response_text text NOT NULL,
  priority int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE chatbot_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  chatbot_id uuid NOT NULL REFERENCES chatbot_configs(id),
  lead_id uuid REFERENCES leads(id),
  visitor_id text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE chatbot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES chatbot_conversations(id),
  org_id uuid NOT NULL REFERENCES organizations(id),
  role text NOT NULL CHECK (role IN ('visitor', 'bot', 'agent')),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- INDICES
-- ============================================

CREATE INDEX idx_chatbot_configs_org_id ON chatbot_configs(org_id);
CREATE INDEX idx_chatbot_rules_org_id ON chatbot_rules(org_id);
CREATE INDEX idx_chatbot_rules_chatbot_id ON chatbot_rules(chatbot_id);
CREATE INDEX idx_chatbot_conversations_org_id ON chatbot_conversations(org_id);
CREATE INDEX idx_chatbot_conversations_chatbot_id ON chatbot_conversations(chatbot_id);
CREATE INDEX idx_chatbot_messages_org_id ON chatbot_messages(org_id);
CREATE INDEX idx_chatbot_messages_conversation_id ON chatbot_messages(conversation_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER set_chatbot_configs_updated_at
  BEFORE UPDATE ON chatbot_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_chatbot_conversations_updated_at
  BEFORE UPDATE ON chatbot_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

-- chatbot_configs
ALTER TABLE chatbot_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chatbot_configs_select" ON chatbot_configs FOR SELECT USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "chatbot_configs_insert" ON chatbot_configs FOR INSERT WITH CHECK (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "chatbot_configs_update" ON chatbot_configs FOR UPDATE USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "chatbot_configs_delete" ON chatbot_configs FOR DELETE USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);

-- chatbot_rules
ALTER TABLE chatbot_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chatbot_rules_select" ON chatbot_rules FOR SELECT USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "chatbot_rules_insert" ON chatbot_rules FOR INSERT WITH CHECK (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "chatbot_rules_update" ON chatbot_rules FOR UPDATE USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "chatbot_rules_delete" ON chatbot_rules FOR DELETE USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);

-- chatbot_conversations
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chatbot_conversations_select" ON chatbot_conversations FOR SELECT USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "chatbot_conversations_insert" ON chatbot_conversations FOR INSERT WITH CHECK (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "chatbot_conversations_update" ON chatbot_conversations FOR UPDATE USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "chatbot_conversations_delete" ON chatbot_conversations FOR DELETE USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);

-- chatbot_messages
ALTER TABLE chatbot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chatbot_messages_select" ON chatbot_messages FOR SELECT USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "chatbot_messages_insert" ON chatbot_messages FOR INSERT WITH CHECK (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "chatbot_messages_update" ON chatbot_messages FOR UPDATE USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "chatbot_messages_delete" ON chatbot_messages FOR DELETE USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
