-- Migration 024: SEO Keywords & Competitor Tracking
CREATE TABLE IF NOT EXISTS seo_keywords (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  search_volume integer,
  difficulty integer,
  current_position integer,
  previous_position integer,
  url text,
  search_engine text DEFAULT 'google',
  country text DEFAULT 'BR',
  tracked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seo_competitors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain text NOT NULL,
  name text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_keywords_org ON seo_keywords(org_id);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_keyword ON seo_keywords(org_id, keyword);
CREATE INDEX IF NOT EXISTS idx_seo_competitors_org ON seo_competitors(org_id);

ALTER TABLE seo_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seo_keywords_select" ON seo_keywords FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "seo_keywords_insert" ON seo_keywords FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "seo_keywords_update" ON seo_keywords FOR UPDATE USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "seo_keywords_delete" ON seo_keywords FOR DELETE USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "seo_competitors_select" ON seo_competitors FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "seo_competitors_insert" ON seo_competitors FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "seo_competitors_update" ON seo_competitors FOR UPDATE USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "seo_competitors_delete" ON seo_competitors FOR DELETE USING (org_id IN (SELECT get_user_org_ids()));
