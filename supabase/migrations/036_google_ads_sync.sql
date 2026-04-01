-- Google Ads sync tables (parallel to meta_* tables)

-- Accounts table (OAuth tokens + customer IDs per org)
CREATE TABLE IF NOT EXISTS google_ads_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL, -- format: 123-456-7890
  account_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  sync_enabled BOOLEAN DEFAULT true,
  refresh_token TEXT, -- per-account OAuth refresh token (null = use env var)
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, customer_id)
);

-- Campaign-level daily insights
CREATE TABLE IF NOT EXISTS google_campaign_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  campaign_status TEXT,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend NUMERIC(12,2) DEFAULT 0, -- converted from cost_micros
  conversions NUMERIC(10,2) DEFAULT 0,
  cost_per_conversion NUMERIC(10,2) DEFAULT 0,
  cpc NUMERIC(10,2) DEFAULT 0,
  cpm NUMERIC(10,2) DEFAULT 0,
  ctr NUMERIC(8,4) DEFAULT 0,
  leads INTEGER DEFAULT 0,
  cost_per_lead NUMERIC(10,2) DEFAULT 0,
  interactions INTEGER DEFAULT 0,
  interaction_rate NUMERIC(8,4) DEFAULT 0,
  search_impression_share NUMERIC(8,4),
  all_conversions NUMERIC(10,2) DEFAULT 0,
  view_through_conversions INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, campaign_id, date)
);

-- Ad group daily insights (equivalent to meta_adset_insights)
CREATE TABLE IF NOT EXISTS google_adgroup_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  adgroup_id TEXT NOT NULL,
  adgroup_name TEXT,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend NUMERIC(12,2) DEFAULT 0,
  conversions NUMERIC(10,2) DEFAULT 0,
  cpc NUMERIC(10,2) DEFAULT 0,
  ctr NUMERIC(8,4) DEFAULT 0,
  leads INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, adgroup_id, date)
);

-- Ad-level daily insights
CREATE TABLE IF NOT EXISTS google_ad_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  adgroup_id TEXT NOT NULL,
  ad_id TEXT NOT NULL,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend NUMERIC(12,2) DEFAULT 0,
  conversions NUMERIC(10,2) DEFAULT 0,
  cpc NUMERIC(10,2) DEFAULT 0,
  ctr NUMERIC(8,4) DEFAULT 0,
  leads INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, ad_id, date)
);

-- Ad group metadata (equivalent to meta_adsets)
CREATE TABLE IF NOT EXISTS google_adgroups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  adgroup_id TEXT NOT NULL,
  name TEXT,
  status TEXT,
  cpc_bid_micros BIGINT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, adgroup_id)
);

-- Sync logs
CREATE TABLE IF NOT EXISTS google_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id TEXT,
  sync_type TEXT DEFAULT 'full',
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_google_campaign_insights_org_date ON google_campaign_insights(org_id, date);
CREATE INDEX IF NOT EXISTS idx_google_adgroup_insights_org_date ON google_adgroup_insights(org_id, date);
CREATE INDEX IF NOT EXISTS idx_google_ad_insights_org_date ON google_ad_insights(org_id, date);
CREATE INDEX IF NOT EXISTS idx_google_ads_accounts_org ON google_ads_accounts(org_id);

-- RLS
ALTER TABLE google_ads_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_campaign_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_adgroup_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_ad_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_adgroups ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as meta_* tables)
CREATE POLICY google_ads_accounts_select ON google_ads_accounts FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY google_campaign_insights_select ON google_campaign_insights FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY google_adgroup_insights_select ON google_adgroup_insights FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY google_ad_insights_select ON google_ad_insights FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY google_adgroups_select ON google_adgroups FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY google_sync_logs_select ON google_sync_logs FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
