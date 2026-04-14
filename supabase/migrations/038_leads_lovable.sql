-- ============================================================================
-- Migration 038: Leads Lovable
-- ============================================================================
-- Tabela espelho para leads vindos de uma plataforma externa (Lovable).
-- Usada para cruzar (de-para) com leads do Meta Ads por dia/campanha.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.leads_lovable (
  -- Chaves
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                        UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lovable_id                    TEXT,  -- id vindo do Lovable (mantido pra idempotência)

  -- Dados do lead
  nome                          TEXT,
  sobrenome                     TEXT,
  email                         TEXT,
  whatsapp                      TEXT,
  empresa                       TEXT,
  oque_faz                      TEXT,
  cargo                         TEXT,
  faturamento                   TEXT,
  funcionarios                  TEXT,
  prioridade                    TEXT,
  software_gestao               TEXT,

  -- Reunião
  data_reuniao                  DATE,
  horario_reuniao               TEXT,    -- string livre (ex: "14:30")
  link_reuniao                  TEXT,
  status                        TEXT,
  status_reuniao                TEXT,
  etapa_pipedrive               TEXT,
  confirmou_participacao        BOOLEAN,
  lembrete_enviado              BOOLEAN,
  ligacao_confirmacao_enviada   BOOLEAN,
  ligacao_agendada              BOOLEAN,
  deseja_contato_vendedor       BOOLEAN,
  nps                           INTEGER,

  -- Copy / página
  copy_variant                  TEXT,
  landing_page                  TEXT,
  origin_page                   TEXT,

  -- Pipedrive
  pipedrive_deal_id             TEXT,
  pipedrive_person_id           TEXT,
  pipedrive_org_id              TEXT,

  -- Click IDs
  fbclid                        TEXT,
  gclid                         TEXT,
  gbraid                        TEXT,
  wbraid                        TEXT,
  gad_campaignid                TEXT,
  gad_source                    TEXT,
  msclkid                       TEXT,
  li_fat_id                     TEXT,
  ttclid                        TEXT,
  sck                           TEXT,

  -- UTMs
  utm_source                    TEXT,
  utm_medium                    TEXT,
  utm_campaign                  TEXT,
  utm_content                   TEXT,
  utm_term                      TEXT,

  -- Integrações / sessão
  manychat_subscriber_id        TEXT,
  reschedule_token              TEXT,
  apex_session_id               TEXT,
  session_attributes_encoded    TEXT,

  -- Datas
  created_at                    TIMESTAMPTZ,
  data_correta                  DATE,

  -- Auditoria interna
  raw_payload                   JSONB DEFAULT '{}'::jsonb,
  ingested_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (org_id, lovable_id)
);

-- Índices pra filtros/de-para
CREATE INDEX IF NOT EXISTS idx_leads_lovable_org              ON public.leads_lovable(org_id);
CREATE INDEX IF NOT EXISTS idx_leads_lovable_created          ON public.leads_lovable(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_lovable_data_correta     ON public.leads_lovable(org_id, data_correta);
CREATE INDEX IF NOT EXISTS idx_leads_lovable_email            ON public.leads_lovable(org_id, email);
CREATE INDEX IF NOT EXISTS idx_leads_lovable_utm_campaign     ON public.leads_lovable(org_id, utm_campaign);
CREATE INDEX IF NOT EXISTS idx_leads_lovable_status           ON public.leads_lovable(org_id, status);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.leads_lovable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_lovable_select_by_org"
  ON public.leads_lovable FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "leads_lovable_insert_by_org"
  ON public.leads_lovable FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "leads_lovable_update_by_org"
  ON public.leads_lovable FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "leads_lovable_delete_by_admin"
  ON public.leads_lovable FOR DELETE
  USING (is_org_admin(org_id));

-- ----------------------------------------------------------------------------
-- Trigger: updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.leads_lovable_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leads_lovable_updated_at ON public.leads_lovable;
CREATE TRIGGER trg_leads_lovable_updated_at
  BEFORE UPDATE ON public.leads_lovable
  FOR EACH ROW EXECUTE FUNCTION public.leads_lovable_set_updated_at();
