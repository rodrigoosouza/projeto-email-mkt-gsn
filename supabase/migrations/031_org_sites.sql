-- Migration 031: Organization Sites (Site Builder)
-- Sites per organization with pages and sections for AI-generated websites.

-- Sites per organization
CREATE TABLE IF NOT EXISTS org_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Site Principal',
  domain TEXT,
  custom_domain TEXT,
  template TEXT DEFAULT 'business' CHECK (template IN ('business', 'saas', 'ecommerce', 'portfolio', 'agency', 'consulting')),
  global_styles JSONB DEFAULT '{}',
  navigation JSONB DEFAULT '[]',
  footer JSONB DEFAULT '{}',
  seo_global JSONB DEFAULT '{}',
  gtm_id TEXT,
  ga4_id TEXT,
  meta_pixel_id TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'building', 'published', 'offline')),
  published_url TEXT,
  vercel_deployment_id TEXT,
  vercel_project_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id)
);

-- Pages within a site
CREATE TABLE IF NOT EXISTS site_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES org_sites(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sections JSONB DEFAULT '[]',
  seo JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, slug)
);

-- Indexes
CREATE INDEX idx_org_sites_org ON org_sites(org_id);
CREATE INDEX idx_site_pages_site ON site_pages(site_id);
CREATE INDEX idx_site_pages_org ON site_pages(org_id);

-- RLS
ALTER TABLE org_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sites_select" ON org_sites FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "sites_modify" ON org_sites FOR ALL USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "site_pages_select" ON site_pages FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "site_pages_modify" ON site_pages FOR ALL USING (org_id IN (SELECT get_user_org_ids()));
