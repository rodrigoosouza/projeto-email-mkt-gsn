-- White Label Configuration
CREATE TABLE white_label_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  app_name text NOT NULL DEFAULT 'Plataforma Email',
  logo_url text,
  favicon_url text,
  primary_color text NOT NULL DEFAULT '#3B82F6',
  secondary_color text NOT NULL DEFAULT '#6366F1',
  accent_color text NOT NULL DEFAULT '#F59E0B',
  custom_domain text,
  custom_css text,
  hide_branding boolean DEFAULT false,
  email_footer_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_white_label_org ON white_label_configs(org_id);

ALTER TABLE white_label_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "white_label_configs_select" ON white_label_configs FOR SELECT USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "white_label_configs_insert" ON white_label_configs FOR INSERT WITH CHECK (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "white_label_configs_update" ON white_label_configs FOR UPDATE USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "white_label_configs_delete" ON white_label_configs FOR DELETE USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);

CREATE TRIGGER set_white_label_configs_updated_at BEFORE UPDATE ON white_label_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
