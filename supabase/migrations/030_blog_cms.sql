-- Blog CMS tables per organization
-- Migration 030

-- Blog posts
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT DEFAULT '',
  content_html TEXT DEFAULT '',
  excerpt TEXT,
  featured_image TEXT,
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'scheduled', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  -- SEO
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[] DEFAULT '{}',
  canonical_url TEXT,
  og_image TEXT,
  -- Organization
  category_id UUID,
  tags TEXT[] DEFAULT '{}',
  -- Metrics
  views_count INTEGER DEFAULT 0,
  reading_time_min INTEGER DEFAULT 0,
  -- AI
  ai_generated BOOLEAN DEFAULT false,
  ai_prompt TEXT,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, slug)
);

-- Blog categories
CREATE TABLE IF NOT EXISTS blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, slug)
);

-- Blog settings per org
CREATE TABLE IF NOT EXISTS blog_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  blog_title TEXT,
  blog_description TEXT,
  custom_domain TEXT,
  theme TEXT DEFAULT 'default',
  colors JSONB DEFAULT '{"primary": "#6366f1", "secondary": "#0f172a", "accent": "#f59e0b"}',
  logo_url TEXT,
  favicon_url TEXT,
  analytics_snippet TEXT,
  social_links JSONB DEFAULT '{}',
  cta_config JSONB DEFAULT '{}',
  sidebar_config JSONB DEFAULT '{"show_categories": true, "show_recent": true, "show_newsletter": true}',
  footer_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Foreign key for category
ALTER TABLE blog_posts ADD CONSTRAINT fk_blog_posts_category FOREIGN KEY (category_id) REFERENCES blog_categories(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_blog_posts_org_status ON blog_posts(org_id, status);
CREATE INDEX idx_blog_posts_org_slug ON blog_posts(org_id, slug);
CREATE INDEX idx_blog_posts_published ON blog_posts(org_id, published_at DESC) WHERE status = 'published';
CREATE INDEX idx_blog_categories_org ON blog_categories(org_id);

-- RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_posts_select" ON blog_posts FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "blog_posts_modify" ON blog_posts FOR ALL USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "blog_categories_select" ON blog_categories FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "blog_categories_modify" ON blog_categories FOR ALL USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "blog_settings_select" ON blog_settings FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "blog_settings_modify" ON blog_settings FOR ALL USING (is_org_admin(org_id));

-- Helper: auto-calculate reading time on insert/update
CREATE OR REPLACE FUNCTION calculate_reading_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.content IS NOT NULL AND NEW.content != '' THEN
    NEW.reading_time_min := GREATEST(1, CEIL(array_length(string_to_array(NEW.content, ' '), 1)::numeric / 200));
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blog_posts_reading_time
  BEFORE INSERT OR UPDATE OF content ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION calculate_reading_time();
