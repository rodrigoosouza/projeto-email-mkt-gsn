-- ============================================================
-- Migration 026: Ad Campaigns (Meta Ads + Google Ads)
-- Estrutura de campanhas de ads geradas por IA
-- ============================================================

CREATE TABLE IF NOT EXISTS ad_campaigns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('meta_ads', 'google_ads')),
  campaign_type text NOT NULL CHECK (campaign_type IN ('lead_generation', 'traffic', 'conversion', 'awareness', 'engagement', 'retargeting')),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'active', 'paused', 'completed', 'failed')),
  objective text,
  target_audience jsonb DEFAULT '{}',
  budget_daily numeric(10,2),
  budget_total numeric(10,2),
  currency text DEFAULT 'BRL',
  start_date date,
  end_date date,
  ad_creatives jsonb DEFAULT '[]',
  copy_variants jsonb DEFAULT '[]',
  landing_page_url text,
  segment_id uuid REFERENCES segments(id),
  audience_export_id uuid REFERENCES audience_exports(id),
  platform_campaign_id text,
  performance_data jsonb DEFAULT '{}',
  ai_generated boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_org ON ad_campaigns(org_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_platform ON ad_campaigns(org_id, platform);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns(org_id, status);

-- RLS
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_campaigns_select" ON ad_campaigns FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "ad_campaigns_insert" ON ad_campaigns FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "ad_campaigns_update" ON ad_campaigns FOR UPDATE USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "ad_campaigns_delete" ON ad_campaigns FOR DELETE USING (org_id IN (SELECT get_user_org_ids()));
