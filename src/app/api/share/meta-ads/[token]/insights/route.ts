import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Endpoint público — não requer auth, valida via token de share
export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  const admin = createAdminClient()

  // Valida token + share ativo + não expirado
  const { data: share, error: shareError } = await admin
    .from('dashboard_shares')
    .select('id, org_id, dashboard_type, title, default_filters, is_active, expires_at')
    .eq('token', token)
    .eq('dashboard_type', 'meta-ads')
    .single()

  if (shareError || !share) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (!share.is_active) return NextResponse.json({ error: 'revoked' }, { status: 403 })
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return NextResponse.json({ error: 'expired' }, { status: 403 })
  }

  // Busca insights via admin (bypassa RLS)
  const { data: insights, error: insightsError } = await admin
    .from('meta_campaign_insights')
    .select('id,campaign_id,campaign_name,date,impressions,reach,clicks,link_clicks,spend,cpc,cpm,ctr,leads,cost_per_lead,frequency')
    .eq('org_id', share.org_id)
    .order('date', { ascending: false })

  if (insightsError) return NextResponse.json({ error: insightsError.message }, { status: 500 })

  // Atualiza estatísticas de visualização (fire-and-forget)
  admin
    .from('dashboard_shares')
    .update({
      last_viewed_at: new Date().toISOString(),
      view_count: undefined as any,
    })
    .eq('id', share.id)
    .then(() => {})

  // Increment view_count via RPC pra atomicidade
  admin.rpc('increment_dashboard_share_views', { share_id: share.id }).then(() => {})

  return NextResponse.json({
    title: share.title,
    default_filters: share.default_filters || {},
    insights: insights || [],
  })
}
