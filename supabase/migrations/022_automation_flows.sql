-- ============================================================
-- Migration 022: Automation Flows + Lead Tags
-- Flow Builder for WhatsApp/Email/SMS automations
-- ============================================================

-- Fluxos de automacao
CREATE TABLE IF NOT EXISTS automation_flows (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  channel text NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email', 'sms')),
  trigger_type text NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('broadcast', 'tag_added', 'form_submitted', 'event', 'manual', 'keyword')),
  trigger_config jsonb DEFAULT '{}',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  flow_data jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
  stats jsonb DEFAULT '{"total_entered":0,"total_completed":0,"total_active":0}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Execucoes do fluxo (cada lead que entra)
CREATE TABLE IF NOT EXISTS automation_executions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  flow_id uuid NOT NULL REFERENCES automation_flows(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  current_node_id text,
  status text DEFAULT 'running' CHECK (status IN ('running', 'completed', 'paused', 'failed', 'cancelled')),
  tags_applied text[] DEFAULT '{}',
  history jsonb DEFAULT '[]',
  variables jsonb DEFAULT '{}',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  next_action_at timestamptz
);

-- Tags do lead
CREATE TABLE IF NOT EXISTS lead_tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tag text NOT NULL,
  source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, lead_id, tag)
);

-- Tag definitions (catalog of available tags per org)
CREATE TABLE IF NOT EXISTS tag_definitions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#6b7280',
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automation_flows_org ON automation_flows(org_id);
CREATE INDEX IF NOT EXISTS idx_automation_flows_status ON automation_flows(org_id, status);
CREATE INDEX IF NOT EXISTS idx_automation_executions_flow ON automation_executions(flow_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_lead ON automation_executions(lead_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_next ON automation_executions(next_action_at) WHERE status = 'running';
CREATE INDEX IF NOT EXISTS idx_lead_tags_org ON lead_tags(org_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_lead ON lead_tags(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_tag ON lead_tags(org_id, tag);

-- RLS
ALTER TABLE automation_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_definitions ENABLE ROW LEVEL SECURITY;

-- Policies using get_user_org_ids() (SECURITY DEFINER function from migration 018)
CREATE POLICY "automation_flows_select" ON automation_flows FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "automation_flows_insert" ON automation_flows FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "automation_flows_update" ON automation_flows FOR UPDATE USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "automation_flows_delete" ON automation_flows FOR DELETE USING (org_id IN (SELECT get_user_org_ids()) AND is_org_admin(org_id));

CREATE POLICY "automation_executions_select" ON automation_executions FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "automation_executions_insert" ON automation_executions FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "automation_executions_update" ON automation_executions FOR UPDATE USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "lead_tags_select" ON lead_tags FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "lead_tags_insert" ON lead_tags FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "lead_tags_delete" ON lead_tags FOR DELETE USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "tag_definitions_select" ON tag_definitions FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "tag_definitions_insert" ON tag_definitions FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "tag_definitions_update" ON tag_definitions FOR UPDATE USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "tag_definitions_delete" ON tag_definitions FOR DELETE USING (org_id IN (SELECT get_user_org_ids()));
