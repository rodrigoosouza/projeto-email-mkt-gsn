import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import * as ga4 from '@/lib/analytics/ga4-client'
import * as meta from '@/lib/analytics/meta-ads-client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { org_id, period_start, period_end } = await request.json()
    if (!org_id) return NextResponse.json({ error: 'org_id required' }, { status: 400 })

    const startDate = period_start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = period_end || new Date().toISOString().split('T')[0]

    const admin = createAdminClient()

    // Get active integrations
    const { data: integrations } = await admin
      .from('integrations')
      .select('*')
      .eq('org_id', org_id)
      .eq('is_active', true)

    if (!integrations || integrations.length === 0) {
      return NextResponse.json({ message: 'Nenhuma integracao ativa', synced: 0 })
    }

    const results: Record<string, any> = {}

    for (const integration of integrations) {
      try {
        if (integration.provider === 'google_analytics') {
          const config = integration.config as any
          if (!config.property_id) continue

          const overview = await ga4.getOverview(config, startDate, endDate)
          const topPages = await ga4.getTopPages(config, startDate, endDate)
          const sources = await ga4.getTrafficSources(config, startDate, endDate)

          // Save metrics
          const metricsToSave = [
            { type: 'page_views', data: overview },
            { type: 'top_pages', data: topPages },
            { type: 'traffic_sources', data: sources },
          ]

          for (const metric of metricsToSave) {
            await admin.from('analytics_data').insert({
              org_id,
              integration_id: integration.id,
              metric_type: metric.type,
              data: metric.data,
              period_start: startDate,
              period_end: endDate,
            })
          }

          results.google_analytics = { status: 'ok', metrics: metricsToSave.length }
        }

        if (integration.provider === 'meta_ads') {
          const config = integration.config as any
          if (!config.access_token || !config.ad_account_id) continue

          const overview = await meta.getAccountOverview(config, startDate, endDate)
          const campaigns = await meta.getCampaignInsights(config, startDate, endDate)

          const metricsToSave = [
            { type: 'ad_spend', data: overview },
            { type: 'ad_campaigns', data: campaigns },
          ]

          for (const metric of metricsToSave) {
            await admin.from('analytics_data').insert({
              org_id,
              integration_id: integration.id,
              metric_type: metric.type,
              data: metric.data,
              period_start: startDate,
              period_end: endDate,
            })
          }

          results.meta_ads = { status: 'ok', metrics: metricsToSave.length }
        }

        // Update last_sync_at
        await admin
          .from('integrations')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', integration.id)

      } catch (error: any) {
        results[integration.provider] = { status: 'error', message: error.message }
      }
    }

    return NextResponse.json({ synced: Object.keys(results).length, results })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
