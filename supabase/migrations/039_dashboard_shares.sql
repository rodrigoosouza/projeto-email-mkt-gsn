-- ============================================================================
-- Migration 039: Dashboard Shares
-- ============================================================================
-- Tokens públicos pra compartilhar dashboards externamente (ex: CEO ver
-- relatório Meta Ads sem login).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dashboard_shares (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token           TEXT NOT NULL UNIQUE,
  org_id          UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dashboard_type  TEXT NOT NULL,                           -- 'meta-ads', futuramente 'pipedrive', etc
  title           TEXT,
  default_filters JSONB DEFAULT '{}'::jsonb,               -- { dateFrom, dateTo, campaignFilter, ... }
  is_active       BOOLEAN NOT NULL DEFAULT true,
  expires_at      TIMESTAMPTZ,                             -- NULL = nunca expira
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_viewed_at  TIMESTAMPTZ,
  view_count      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_dashboard_shares_token ON public.dashboard_shares(token);
CREATE INDEX IF NOT EXISTS idx_dashboard_shares_org   ON public.dashboard_shares(org_id, dashboard_type);

ALTER TABLE public.dashboard_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shares_select_by_org" ON public.dashboard_shares FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "shares_insert_by_org" ON public.dashboard_shares FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "shares_update_by_admin" ON public.dashboard_shares FOR UPDATE
  USING (is_org_admin(org_id));

CREATE POLICY "shares_delete_by_admin" ON public.dashboard_shares FOR DELETE
  USING (is_org_admin(org_id));
