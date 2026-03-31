-- Prospects found via Google Places (NOT leads table)
CREATE TABLE IF NOT EXISTS prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Google Places data
  place_id TEXT,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  website TEXT,
  rating NUMERIC(2,1),
  total_ratings INTEGER DEFAULT 0,
  business_type TEXT,
  -- Enriched data (from Firecrawl/scraping)
  email TEXT,
  owner_name TEXT,
  instagram TEXT,
  facebook TEXT,
  linkedin TEXT,
  description TEXT,
  -- Search context
  search_query TEXT,
  search_location TEXT,
  search_segment TEXT,
  -- Status
  status TEXT DEFAULT 'novo' CHECK (status IN ('novo', 'qualificado', 'abordado', 'respondeu', 'converteu', 'descartado')),
  notes TEXT,
  converted_to_lead_id UUID REFERENCES leads(id),
  -- Metadata
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  photos JSONB DEFAULT '[]',
  opening_hours JSONB DEFAULT '{}',
  enriched BOOLEAN DEFAULT false,
  enriched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, place_id)
);

-- Search history
CREATE TABLE IF NOT EXISTS prospect_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  location TEXT,
  segment TEXT,
  radius_km INTEGER DEFAULT 50,
  results_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_prospects_org ON prospects(org_id, created_at DESC);
CREATE INDEX idx_prospects_status ON prospects(org_id, status);
CREATE INDEX idx_prospects_segment ON prospects(org_id, search_segment);
CREATE INDEX idx_prospect_searches_org ON prospect_searches(org_id, created_at DESC);

ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prospects_access" ON prospects FOR ALL USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "prospect_searches_access" ON prospect_searches FOR ALL USING (org_id IN (SELECT get_user_org_ids()));
