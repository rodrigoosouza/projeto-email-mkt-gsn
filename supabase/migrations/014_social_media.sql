-- Migration 014: Social Media tables
-- Social accounts and scheduled posts

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  platform text NOT NULL CHECK (platform IN ('instagram', 'facebook', 'linkedin', 'twitter', 'tiktok')),
  account_name text NOT NULL,
  account_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  avatar_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  account_id uuid NOT NULL REFERENCES social_accounts(id),
  content text NOT NULL,
  media_urls text[] DEFAULT '{}',
  hashtags text[] DEFAULT '{}',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  scheduled_for timestamptz,
  published_at timestamptz,
  platform_post_id text,
  metrics jsonb DEFAULT '{}',
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES users(id)
);

-- ============================================
-- INDICES
-- ============================================

CREATE INDEX idx_social_accounts_org_id ON social_accounts(org_id);
CREATE INDEX idx_social_accounts_platform ON social_accounts(platform);
CREATE INDEX idx_social_posts_org_id ON social_posts(org_id);
CREATE INDEX idx_social_posts_account_id ON social_posts(account_id);
CREATE INDEX idx_social_posts_status ON social_posts(status);
CREATE INDEX idx_social_posts_scheduled_for ON social_posts(scheduled_for);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER set_social_accounts_updated_at
  BEFORE UPDATE ON social_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_social_posts_updated_at
  BEFORE UPDATE ON social_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

-- social_accounts
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_accounts_select" ON social_accounts FOR SELECT USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "social_accounts_insert" ON social_accounts FOR INSERT WITH CHECK (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "social_accounts_update" ON social_accounts FOR UPDATE USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "social_accounts_delete" ON social_accounts FOR DELETE USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);

-- social_posts
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_posts_select" ON social_posts FOR SELECT USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "social_posts_insert" ON social_posts FOR INSERT WITH CHECK (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "social_posts_update" ON social_posts FOR UPDATE USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
CREATE POLICY "social_posts_delete" ON social_posts FOR DELETE USING (
  org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
);
