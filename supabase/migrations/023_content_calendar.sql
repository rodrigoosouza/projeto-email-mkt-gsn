-- ============================================================
-- Migration 023: Content Calendar (Método Hyesser)
-- Calendario de conteudo organico com 4 pilares
-- ============================================================

CREATE TABLE IF NOT EXISTS content_calendar (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  pillar text NOT NULL CHECK (pillar IN ('growth', 'connection', 'objection_breaking', 'authority')),
  content_type text NOT NULL,
  format text NOT NULL CHECK (format IN ('reels', 'carousel', 'static_post', 'stories', 'article')),
  platform text NOT NULL DEFAULT 'instagram' CHECK (platform IN ('instagram', 'facebook', 'linkedin', 'tiktok', 'twitter')),
  caption text,
  hashtags text[] DEFAULT '{}',
  image_prompt text,
  video_prompt text,
  image_urls text[] DEFAULT '{}',
  video_urls text[] DEFAULT '{}',
  scheduled_for timestamptz,
  published_at timestamptz,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'approved', 'scheduled', 'published', 'failed')),
  engagement_data jsonb DEFAULT '{}',
  ai_generated boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_calendar_org ON content_calendar(org_id);
CREATE INDEX IF NOT EXISTS idx_content_calendar_scheduled ON content_calendar(org_id, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_content_calendar_pillar ON content_calendar(org_id, pillar);
CREATE INDEX IF NOT EXISTS idx_content_calendar_status ON content_calendar(org_id, status);

-- RLS
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_calendar_select" ON content_calendar FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "content_calendar_insert" ON content_calendar FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "content_calendar_update" ON content_calendar FOR UPDATE USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "content_calendar_delete" ON content_calendar FOR DELETE USING (org_id IN (SELECT get_user_org_ids()));
