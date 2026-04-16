import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: share, error: shareError } = await admin
    .from('dashboard_shares')
    .select('id, org_id, dashboard_type, title, default_filters, is_active, expires_at')
    .eq('token', token)
    .eq('dashboard_type', 'growth')
    .single()

  if (shareError || !share) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (!share.is_active) return NextResponse.json({ error: 'revoked' }, { status: 403 })
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return NextResponse.json({ error: 'expired' }, { status: 403 })
  }

  const orgId = share.org_id

  // Pipeline filtrado se config existir
  const { data: pipeConn } = await admin
    .from('pipedrive_connections')
    .select('pipeline_name')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .maybeSingle()
  const pipelineName = pipeConn?.pipeline_name || null

  const dealsSelect = 'deal_id,title,value,status,stage_name,pipeline_name,add_time,won_time,lost_time,utm_source,utm_campaign,utm_content,utm_term'
  const dealsQ = pipelineName
    ? admin.from('pipedrive_deals').select(dealsSelect).eq('org_id', orgId).eq('pipeline_name', pipelineName).range(0, 999)
    : admin.from('pipedrive_deals').select(dealsSelect).eq('org_id', orgId).range(0, 999)

  const [campaignInsights, deals] = await Promise.all([
    admin.from('meta_campaign_insights')
      .select('id,campaign_id,campaign_name,date,impressions,clicks,spend,leads,cost_per_lead')
      .eq('org_id', orgId).range(0, 999),
    dealsQ,
  ])

  // Org name
  const { data: org } = await admin
    .from('organizations').select('name').eq('id', orgId).single()

  admin.rpc('increment_dashboard_share_views', { share_id: share.id }).then(() => {})

  return NextResponse.json({
    title: share.title,
    org_name: org?.name || '',
    default_filters: share.default_filters || {},
    campaigns: campaignInsights.data || [],
    deals: deals.data || [],
  })
}
