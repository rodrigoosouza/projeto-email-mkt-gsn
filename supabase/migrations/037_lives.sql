-- ============================================================================
-- Migration 037: Lives (Transmissoes Zoom + YouTube)
-- ============================================================================
-- Cria tabelas para o modulo de lives que cria reuniao no Zoom e transmissao
-- no YouTube simultaneamente, com RLS por organizacao.
-- ============================================================================

-- Extension para criptografar tokens e stream keys
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- Tabela: live_integrations
-- Guarda conexoes OAuth por organizacao (Zoom e YouTube)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_integrations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL CHECK (provider IN ('zoom', 'youtube')),
  account_email    TEXT,
  account_name     TEXT,
  external_id      TEXT,              -- user_id Zoom ou channel_id YouTube
  access_token     TEXT NOT NULL,     -- criptografado (pgp_sym_encrypt)
  refresh_token    TEXT,              -- criptografado
  token_type       TEXT DEFAULT 'Bearer',
  expires_at       TIMESTAMPTZ,
  scope            TEXT,
  connected_by     UUID REFERENCES auth.users(id),
  connected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_refresh_at  TIMESTAMPTZ,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  metadata         JSONB DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_live_integrations_org ON public.live_integrations(org_id);
CREATE INDEX IF NOT EXISTS idx_live_integrations_provider ON public.live_integrations(org_id, provider);

-- ----------------------------------------------------------------------------
-- Tabela: live_broadcasts
-- Cada registro = uma live criada (Zoom + YouTube vinculados)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_broadcasts (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                 UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Dados editoriais
  title                  TEXT NOT NULL,
  description            TEXT,
  thumbnail_url          TEXT,           -- URL publica no Supabase Storage

  -- Agendamento
  scheduled_start        TIMESTAMPTZ NOT NULL,
  scheduled_end          TIMESTAMPTZ,
  timezone               TEXT DEFAULT 'America/Sao_Paulo',
  duration_minutes       INT,

  -- Status geral da live
  status                 TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','scheduled','live','ended','cancelled','failed')),

  -- Zoom
  zoom_enabled           BOOLEAN NOT NULL DEFAULT true,
  zoom_type              TEXT DEFAULT 'webinar' CHECK (zoom_type IN ('meeting','webinar')),
  zoom_meeting_id        TEXT,
  zoom_join_url          TEXT,
  zoom_start_url         TEXT,           -- URL do host (sensivel)
  zoom_password          TEXT,
  zoom_raw               JSONB,          -- resposta crua da API pra debug

  -- YouTube
  youtube_enabled        BOOLEAN NOT NULL DEFAULT true,
  youtube_broadcast_id   TEXT,
  youtube_stream_id      TEXT,
  youtube_watch_url      TEXT,
  youtube_privacy        TEXT DEFAULT 'unlisted'
                         CHECK (youtube_privacy IN ('public','unlisted','private')),
  youtube_rtmp_url       TEXT,           -- criptografado
  youtube_stream_key     TEXT,           -- criptografado
  youtube_raw            JSONB,

  -- Erros / auditoria
  last_error             TEXT,
  created_by             UUID REFERENCES auth.users(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_broadcasts_org ON public.live_broadcasts(org_id);
CREATE INDEX IF NOT EXISTS idx_live_broadcasts_status ON public.live_broadcasts(org_id, status);
CREATE INDEX IF NOT EXISTS idx_live_broadcasts_scheduled ON public.live_broadcasts(org_id, scheduled_start DESC);

-- ----------------------------------------------------------------------------
-- Trigger: atualizar updated_at automaticamente
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_live_broadcasts_updated ON public.live_broadcasts;
CREATE TRIGGER trg_live_broadcasts_updated
  BEFORE UPDATE ON public.live_broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_live_integrations_updated ON public.live_integrations;
CREATE TRIGGER trg_live_integrations_updated
  BEFORE UPDATE ON public.live_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS: mesma pattern do resto da plataforma (get_user_org_ids)
-- ----------------------------------------------------------------------------
ALTER TABLE public.live_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_broadcasts   ENABLE ROW LEVEL SECURITY;

-- live_integrations
DROP POLICY IF EXISTS "live_integrations_select" ON public.live_integrations;
CREATE POLICY "live_integrations_select" ON public.live_integrations
  FOR SELECT USING (org_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS "live_integrations_insert" ON public.live_integrations;
CREATE POLICY "live_integrations_insert" ON public.live_integrations
  FOR INSERT WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS "live_integrations_update" ON public.live_integrations;
CREATE POLICY "live_integrations_update" ON public.live_integrations
  FOR UPDATE USING (org_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS "live_integrations_delete" ON public.live_integrations;
CREATE POLICY "live_integrations_delete" ON public.live_integrations
  FOR DELETE USING (org_id IN (SELECT public.get_user_org_ids()));

-- live_broadcasts
DROP POLICY IF EXISTS "live_broadcasts_select" ON public.live_broadcasts;
CREATE POLICY "live_broadcasts_select" ON public.live_broadcasts
  FOR SELECT USING (org_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS "live_broadcasts_insert" ON public.live_broadcasts;
CREATE POLICY "live_broadcasts_insert" ON public.live_broadcasts
  FOR INSERT WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS "live_broadcasts_update" ON public.live_broadcasts;
CREATE POLICY "live_broadcasts_update" ON public.live_broadcasts
  FOR UPDATE USING (org_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS "live_broadcasts_delete" ON public.live_broadcasts;
CREATE POLICY "live_broadcasts_delete" ON public.live_broadcasts
  FOR DELETE USING (org_id IN (SELECT public.get_user_org_ids()));

-- ----------------------------------------------------------------------------
-- Storage bucket para thumbnails das lives
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('live-thumbnails', 'live-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Policies de storage
DROP POLICY IF EXISTS "live_thumbs_select" ON storage.objects;
CREATE POLICY "live_thumbs_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'live-thumbnails');

DROP POLICY IF EXISTS "live_thumbs_insert" ON storage.objects;
CREATE POLICY "live_thumbs_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'live-thumbnails');

DROP POLICY IF EXISTS "live_thumbs_delete" ON storage.objects;
CREATE POLICY "live_thumbs_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'live-thumbnails');
