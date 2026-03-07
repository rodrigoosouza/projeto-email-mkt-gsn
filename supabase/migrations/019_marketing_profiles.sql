-- Migration 019: Marketing Profiles (Diagnostic + Strategy + Business Plan)
-- Ported from grow-automaton project with adaptations for multi-tenant SaaS.
-- Stores: briefing answers (36 questions), AI-generated persona/ICP/strategy,
-- business plan with financial calculations, and brand identity.

CREATE TABLE org_marketing_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Briefing / Diagnostic (36 questions, 12 sections as JSONB)
  briefing jsonb DEFAULT '{}'::jsonb,
  briefing_completed_at timestamptz,

  -- AI-Generated Strategy
  persona jsonb,           -- Persona (17 fields)
  icp jsonb,               -- ICP (15 fields)
  strategy jsonb,          -- Full strategy (horarios, palavrasChave, anuncios, paginaCRO, campanhas)
  strategy_generated_at timestamptz,
  strategy_model text,     -- AI model used for generation

  -- Business Plan
  business_plan jsonb,     -- BP params + channels + calculated results
  business_plan_updated_at timestamptz,

  -- Brand Identity
  brand_identity jsonb DEFAULT '{}'::jsonb,

  -- Status tracking
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'briefing_done', 'strategy_generated', 'complete')),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE UNIQUE INDEX idx_marketing_profiles_org ON org_marketing_profiles(org_id);

ALTER TABLE org_marketing_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org marketing profile"
  ON org_marketing_profiles FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Admins can insert marketing profile"
  ON org_marketing_profiles FOR INSERT
  WITH CHECK (is_org_admin(org_id));

CREATE POLICY "Admins can update marketing profile"
  ON org_marketing_profiles FOR UPDATE
  USING (is_org_admin(org_id));

CREATE POLICY "Admins can delete marketing profile"
  ON org_marketing_profiles FOR DELETE
  USING (is_org_admin(org_id));

CREATE TRIGGER set_marketing_profiles_updated_at
  BEFORE UPDATE ON org_marketing_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Industry benchmarks (reference data for business plan calculations)
CREATE TABLE industry_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment text NOT NULL UNIQUE,
  segment_label text NOT NULL,
  avg_ticket numeric NOT NULL DEFAULT 0,
  mql_to_sql_rate numeric NOT NULL DEFAULT 0.3,
  sql_to_sale_rate numeric NOT NULL DEFAULT 0.25,
  avg_cpl numeric NOT NULL DEFAULT 0,
  avg_margin numeric NOT NULL DEFAULT 0.15,
  avg_tax_rate numeric NOT NULL DEFAULT 0.15,
  seasonality jsonb DEFAULT '{}'::jsonb,
  channels jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE industry_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view benchmarks"
  ON industry_benchmarks FOR SELECT
  USING (true);

-- Seed common Brazilian industry benchmarks
INSERT INTO industry_benchmarks (segment, segment_label, avg_ticket, mql_to_sql_rate, sql_to_sale_rate, avg_cpl, avg_margin, avg_tax_rate) VALUES
  ('consultoria', 'Consultoria', 5000, 0.30, 0.25, 80, 0.40, 0.15),
  ('saas', 'SaaS / Software', 500, 0.25, 0.20, 60, 0.70, 0.10),
  ('educacao', 'Educacao / Cursos', 2000, 0.35, 0.15, 40, 0.60, 0.10),
  ('ecommerce', 'E-commerce', 200, 0.20, 0.10, 25, 0.30, 0.12),
  ('saude', 'Saude / Clinicas', 3000, 0.30, 0.20, 90, 0.50, 0.15),
  ('industria', 'Industria', 15000, 0.20, 0.30, 150, 0.25, 0.18),
  ('servicos', 'Servicos Gerais', 1500, 0.25, 0.20, 50, 0.35, 0.15),
  ('imobiliario', 'Imobiliario', 300000, 0.15, 0.10, 200, 0.05, 0.15),
  ('financeiro', 'Financeiro / Seguros', 8000, 0.20, 0.25, 120, 0.45, 0.15),
  ('agro', 'Agronegocio', 20000, 0.20, 0.25, 100, 0.20, 0.12);
