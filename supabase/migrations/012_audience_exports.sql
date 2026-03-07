-- Migration 012: Audience Exports tables
-- Export segments to ad platforms (Meta Ads, Google Ads)

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE audience_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('meta_ads', 'google_ads')),
  segment_id uuid REFERENCES segments(id),
  config jsonb DEFAULT '{}',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'failed')),
  total_leads int DEFAULT 0,
  exported_leads int DEFAULT 0,
  platform_audience_id text,
  last_synced_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES users(id)
);

-- ============================================
-- INDICES
-- ============================================

CREATE INDEX idx_audience_exports_org_id ON audience_exports(org_id);
CREATE INDEX idx_audience_exports_segment_id ON audience_exports(segment_id);
CREATE INDEX idx_audience_exports_status ON audience_exports(status);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER set_audience_exports_updated_at
  BEFORE UPDATE ON audience_exports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE audience_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audience_exports_select" ON audience_exports FOR SELECT USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "audience_exports_insert" ON audience_exports FOR INSERT WITH CHECK (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "audience_exports_update" ON audience_exports FOR UPDATE USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "audience_exports_delete" ON audience_exports FOR DELETE USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
