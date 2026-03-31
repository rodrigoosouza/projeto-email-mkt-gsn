-- ============================================================
-- Migration 033: Instagram Publishing (Contas + campos calendario)
-- Permite conectar conta Instagram Business e publicar posts
-- ============================================================

CREATE TABLE IF NOT EXISTS org_instagram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  instagram_business_id TEXT NOT NULL,
  facebook_page_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  username TEXT,
  profile_picture_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id)
);

ALTER TABLE org_instagram_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ig_accounts_select" ON org_instagram_accounts FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "ig_accounts_admin" ON org_instagram_accounts FOR ALL USING (is_org_admin(org_id));

-- Add instagram fields to content_calendar
ALTER TABLE content_calendar ADD COLUMN IF NOT EXISTS instagram_media_id TEXT;
ALTER TABLE content_calendar ADD COLUMN IF NOT EXISTS instagram_permalink TEXT;
ALTER TABLE content_calendar ADD COLUMN IF NOT EXISTS published_to_instagram BOOLEAN DEFAULT false;
ALTER TABLE content_calendar ADD COLUMN IF NOT EXISTS instagram_published_at TIMESTAMPTZ;
