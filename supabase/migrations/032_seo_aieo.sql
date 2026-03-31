-- SEO AIEO/GEO Audit and Monitoring tables

-- Audit results per org (can run multiple audits over time)
CREATE TABLE IF NOT EXISTS seo_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  score_total NUMERIC(5,2) DEFAULT 0,
  score_citability NUMERIC(5,2) DEFAULT 0,
  score_technical NUMERIC(5,2) DEFAULT 0,
  score_authority NUMERIC(5,2) DEFAULT 0,
  score_ai_friendly NUMERIC(5,2) DEFAULT 0,
  classification TEXT, -- 'critico', 'em_desenvolvimento', 'bom', 'avancado', 'excelente'
  audit_data JSONB DEFAULT '{}', -- detailed scores per item
  quick_wins JSONB DEFAULT '[]', -- prioritized actions
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- AI visibility monitoring (track if brand is cited by AI engines)
CREATE TABLE IF NOT EXISTS seo_ai_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  engine TEXT NOT NULL, -- 'chatgpt', 'perplexity', 'claude', 'gemini', 'google_ai_overview'
  is_mentioned BOOLEAN DEFAULT false,
  is_cited BOOLEAN DEFAULT false,
  is_recommended BOOLEAN DEFAULT false,
  position INTEGER, -- position in the response if cited
  response_snippet TEXT, -- relevant part of AI response
  competitors_mentioned TEXT[] DEFAULT '{}',
  checked_at TIMESTAMPTZ DEFAULT now()
);

-- Schema markup generated per page
CREATE TABLE IF NOT EXISTS seo_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  page_title TEXT,
  schema_type TEXT NOT NULL, -- 'Organization', 'LocalBusiness', 'FAQ', 'Article', 'HowTo', 'Service', 'Person', 'BreadcrumbList'
  schema_json JSONB NOT NULL,
  auto_generated BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, page_url, schema_type)
);

-- llms.txt content per org
CREATE TABLE IF NOT EXISTS seo_llms_txt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  content TEXT NOT NULL,
  auto_generated BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_seo_audits_org ON seo_audits(org_id, created_at DESC);
CREATE INDEX idx_seo_ai_mentions_org ON seo_ai_mentions(org_id, checked_at DESC);
CREATE INDEX idx_seo_schemas_org ON seo_schemas(org_id);

-- RLS
ALTER TABLE seo_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_ai_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_llms_txt ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seo_audits_access" ON seo_audits FOR ALL USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "seo_ai_mentions_access" ON seo_ai_mentions FOR ALL USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "seo_schemas_access" ON seo_schemas FOR ALL USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "seo_llms_txt_access" ON seo_llms_txt FOR ALL USING (org_id IN (SELECT get_user_org_ids()));
