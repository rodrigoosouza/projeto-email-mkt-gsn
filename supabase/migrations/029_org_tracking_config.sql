CREATE TABLE IF NOT EXISTS org_tracking_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- GTM
  gtm_container_id TEXT,
  gtm_account_id TEXT,
  gtm_workspace_id TEXT,
  -- GA4
  ga4_property_id TEXT,
  ga4_measurement_id TEXT,
  ga4_data_stream_id TEXT,
  -- Ads Pixels
  meta_pixel_id TEXT,
  google_ads_conversion_id TEXT,
  google_ads_conversion_label TEXT,
  -- Generated script
  tracking_script TEXT,
  -- Status
  auto_created BOOLEAN DEFAULT false,
  setup_status TEXT DEFAULT 'pending' CHECK (setup_status IN ('pending', 'creating', 'completed', 'failed')),
  setup_log JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id)
);

ALTER TABLE org_tracking_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tracking_config_select" ON org_tracking_config FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "tracking_config_admin" ON org_tracking_config FOR ALL USING (is_org_admin(org_id));
