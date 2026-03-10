-- Migration 025: Visitor Analytics & Session Data
CREATE TABLE IF NOT EXISTS visitor_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  visitor_id text,
  landing_page text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type text CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  browser text,
  country text,
  city text,
  pages_viewed integer DEFAULT 1,
  max_scroll_depth integer DEFAULT 0,
  duration_seconds integer DEFAULT 0,
  events_count integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, session_id)
);

CREATE TABLE IF NOT EXISTS page_analytics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  page_path text NOT NULL,
  views integer DEFAULT 0,
  unique_visitors integer DEFAULT 0,
  avg_scroll_depth integer DEFAULT 0,
  avg_time_seconds integer DEFAULT 0,
  bounce_rate numeric(5,2) DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, page_path, date)
);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_org ON visitor_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_started ON visitor_sessions(org_id, started_at);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_session ON visitor_sessions(org_id, session_id);
CREATE INDEX IF NOT EXISTS idx_page_analytics_org ON page_analytics(org_id);
CREATE INDEX IF NOT EXISTS idx_page_analytics_date ON page_analytics(org_id, date);

ALTER TABLE visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visitor_sessions_select" ON visitor_sessions FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "visitor_sessions_insert" ON visitor_sessions FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "visitor_sessions_update" ON visitor_sessions FOR UPDATE USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "visitor_sessions_delete" ON visitor_sessions FOR DELETE USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "page_analytics_select" ON page_analytics FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "page_analytics_insert" ON page_analytics FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "page_analytics_update" ON page_analytics FOR UPDATE USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "page_analytics_delete" ON page_analytics FOR DELETE USING (org_id IN (SELECT get_user_org_ids()));
