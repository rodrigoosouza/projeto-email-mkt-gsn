-- Landing Pages
CREATE TABLE landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  brand text NOT NULL DEFAULT 'custom',
  theme text DEFAULT 'dark',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generating','reviewing','published','archived')),
  html_content text,
  unlayer_json jsonb,
  copy_text text,
  system_prompt text,
  deploy_url text,
  vercel_deployment_id text,
  preview_image_url text,
  slug text,
  session_id text,
  view_count int DEFAULT 0,
  lead_count int DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES users(id)
);

CREATE INDEX idx_landing_pages_org ON landing_pages(org_id);
CREATE INDEX idx_landing_pages_status ON landing_pages(status);
CREATE INDEX idx_landing_pages_slug ON landing_pages(slug);

ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "landing_pages_select" ON landing_pages FOR SELECT USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "landing_pages_insert" ON landing_pages FOR INSERT WITH CHECK (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "landing_pages_update" ON landing_pages FOR UPDATE USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "landing_pages_delete" ON landing_pages FOR DELETE USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);

CREATE TRIGGER set_landing_pages_updated_at BEFORE UPDATE ON landing_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at();
