-- Migration 015: Bio Links tables
-- Bio pages (link-in-bio) and individual links

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE bio_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  avatar_url text,
  background_color text DEFAULT '#FFFFFF',
  text_color text DEFAULT '#000000',
  button_style text DEFAULT 'rounded' CHECK (button_style IN ('rounded', 'pill', 'square')),
  custom_css text,
  is_active boolean DEFAULT true,
  view_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES users(id)
);

CREATE TABLE bio_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bio_page_id uuid NOT NULL REFERENCES bio_pages(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id),
  title text NOT NULL,
  url text NOT NULL,
  icon text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  click_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- INDICES
-- ============================================

CREATE INDEX idx_bio_pages_org_id ON bio_pages(org_id);
CREATE INDEX idx_bio_pages_slug ON bio_pages(slug);
CREATE INDEX idx_bio_links_org_id ON bio_links(org_id);
CREATE INDEX idx_bio_links_bio_page_id ON bio_links(bio_page_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER set_bio_pages_updated_at
  BEFORE UPDATE ON bio_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

-- bio_pages
ALTER TABLE bio_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bio_pages_select" ON bio_pages FOR SELECT USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "bio_pages_insert" ON bio_pages FOR INSERT WITH CHECK (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "bio_pages_update" ON bio_pages FOR UPDATE USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "bio_pages_delete" ON bio_pages FOR DELETE USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);

-- bio_links
ALTER TABLE bio_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bio_links_select" ON bio_links FOR SELECT USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "bio_links_insert" ON bio_links FOR INSERT WITH CHECK (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "bio_links_update" ON bio_links FOR UPDATE USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "bio_links_delete" ON bio_links FOR DELETE USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
