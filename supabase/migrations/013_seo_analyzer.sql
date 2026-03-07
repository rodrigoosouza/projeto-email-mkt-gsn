-- Migration 013: SEO Analyzer tables
-- Store SEO analysis results for URLs

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE seo_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  url text NOT NULL,
  title text,
  meta_description text,
  overall_score int DEFAULT 0,
  issues jsonb DEFAULT '[]',
  recommendations jsonb DEFAULT '[]',
  performance_data jsonb DEFAULT '{}',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'completed', 'failed')),
  analyzed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES users(id)
);

-- ============================================
-- INDICES
-- ============================================

CREATE INDEX idx_seo_analyses_org_id ON seo_analyses(org_id);
CREATE INDEX idx_seo_analyses_url ON seo_analyses(url);
CREATE INDEX idx_seo_analyses_status ON seo_analyses(status);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE seo_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seo_analyses_select" ON seo_analyses FOR SELECT USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "seo_analyses_insert" ON seo_analyses FOR INSERT WITH CHECK (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "seo_analyses_update" ON seo_analyses FOR UPDATE USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "seo_analyses_delete" ON seo_analyses FOR DELETE USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
