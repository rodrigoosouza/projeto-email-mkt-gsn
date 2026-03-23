-- Migration 027: Lead Enrichment
-- Adds enrichment columns to leads table for company research data

-- Add enrichment columns to leads table
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS enrichment_data jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS enrichment_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS enrichment_updated_at timestamptz;

-- Add check constraint for enrichment_status values
ALTER TABLE leads
  ADD CONSTRAINT leads_enrichment_status_check
  CHECK (enrichment_status IN ('pending', 'enriching', 'enriched', 'failed'));

-- Index for batch enrichment queries (find pending leads with company name)
CREATE INDEX IF NOT EXISTS idx_leads_enrichment_status ON leads (enrichment_status)
  WHERE enrichment_status = 'pending' AND company IS NOT NULL;

COMMENT ON COLUMN leads.enrichment_data IS 'CNPJ data + AI research about the lead company';
COMMENT ON COLUMN leads.enrichment_status IS 'pending | enriching | enriched | failed';
COMMENT ON COLUMN leads.enrichment_updated_at IS 'Last time enrichment was attempted';
