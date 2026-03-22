import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  MetaAdsConfig,
  getCampaignInsightsDaily,
  getAdSetInsightsDaily,
  getAdInsightsDaily,
  getCampaigns,
  getAdSets,
  getAds,
  extractLeads,
  extractCostPerLead,
  extractLinkClicks,
  extractConversions,
  extractVideoViews,
  extractVideoPercent,
} from '@/lib/analytics/meta-ads-client'

export const maxDuration = 120 // 2 min timeout

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      orgId,
      adAccountId,
      daysBack = 7,
      syncLevels = ['campaigns'],
    } = body as {
      orgId: string
      adAccountId?: string
      daysBack?: number
      syncLevels?: ('campaigns' | 'adsets' | 'ads' | 'structure')[]
    }

    if (!orgId) {
      return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Get ad accounts for this org
    let accountsQuery = admin
      .from('meta_ad_accounts')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .eq('sync_enabled', true)

    if (adAccountId) {
      accountsQuery = accountsQuery.eq('ad_account_id', adAccountId)
    }

    const { data: accounts, error: accountsError } = await accountsQuery
    if (accountsError) throw accountsError

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        error: 'Nenhuma conta Meta Ads ativa encontrada',
      }, { status: 404 })
    }

    // Date range
    const until = new Date()
    until.setDate(until.getDate() - 1) // yesterday (Meta reports D-1)
    const since = new Date(until)
    since.setDate(since.getDate() - daysBack + 1)

    const sinceStr = since.toISOString().split('T')[0]
    const untilStr = until.toISOString().split('T')[0]

    const results: Record<string, any> = {}

    for (const account of accounts) {
      const config: MetaAdsConfig = {
        access_token: account.access_token,
        ad_account_id: account.ad_account_id,
      }

      // Create sync log
      const { data: syncLog } = await admin
        .from('meta_sync_logs')
        .insert({
          org_id: orgId,
          ad_account_id: account.ad_account_id,
          sync_type: syncLevels.join(','),
          status: 'running',
          date_range_start: sinceStr,
          date_range_end: untilStr,
        })
        .select('id')
        .single()

      const syncLogId = syncLog?.id
      let totalSynced = 0

      try {
        // ===== SYNC STRUCTURE (campaigns, adsets, ads metadata) =====
        if (syncLevels.includes('structure')) {
          // Sync campaigns structure
          const campaignsData = await getCampaigns(config)
          for (const c of campaignsData) {
            // Campaign structure is stored implicitly in insights
            // If we had a meta_campaigns table we'd save here
          }

          // Sync adsets structure
          const adsetsData = await getAdSets(config)
          for (const adset of adsetsData) {
            await admin
              .from('meta_adsets')
              .upsert({
                org_id: orgId,
                ad_account_id: account.ad_account_id,
                campaign_id: adset.campaign_id,
                adset_id: adset.id,
                name: adset.name,
                status: adset.status,
                effective_status: adset.effective_status,
                daily_budget: adset.daily_budget ? parseFloat(adset.daily_budget) / 100 : null,
                lifetime_budget: adset.lifetime_budget ? parseFloat(adset.lifetime_budget) / 100 : null,
                bid_strategy: adset.bid_strategy || null,
                optimization_goal: adset.optimization_goal || null,
                billing_event: adset.billing_event || null,
                targeting: adset.targeting || {},
                start_time: adset.start_time || null,
                end_time: adset.end_time || null,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'org_id,adset_id' })
            totalSynced++
          }

          // Sync ads structure
          const adsData = await getAds(config)
          for (const ad of adsData) {
            const creative = ad.creative || {}
            await admin
              .from('meta_ads')
              .upsert({
                org_id: orgId,
                ad_account_id: account.ad_account_id,
                campaign_id: ad.campaign_id,
                adset_id: ad.adset_id,
                ad_id: ad.id,
                name: ad.name,
                status: ad.status,
                effective_status: ad.effective_status,
                creative_id: creative.id || null,
                headline: creative.title || null,
                body: creative.body || null,
                call_to_action_type: creative.call_to_action_type || null,
                image_url: creative.image_url || null,
                link_url: creative.link_url || null,
                creative_data: creative,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'org_id,ad_id' })
            totalSynced++
          }
        }

        // ===== SYNC CAMPAIGN INSIGHTS (daily) =====
        if (syncLevels.includes('campaigns')) {
          const insights = await getCampaignInsightsDaily(config, sinceStr, untilStr)

          for (const row of insights) {
            const leads = extractLeads(row.actions)
            const cpl = extractCostPerLead(row.cost_per_action_type)
            const linkClicks = extractLinkClicks(row.actions)
            const conversions = extractConversions(row.actions)
            const videoViews = extractVideoViews(row.video_play_actions)

            await admin
              .from('meta_campaign_insights')
              .upsert({
                org_id: orgId,
                ad_account_id: account.ad_account_id,
                campaign_id: row.campaign_id,
                campaign_name: row.campaign_name,
                date: row.date_start,
                impressions: parseInt(row.impressions || '0', 10),
                reach: parseInt(row.reach || '0', 10),
                clicks: parseInt(row.clicks || '0', 10),
                link_clicks: linkClicks,
                spend: parseFloat(row.spend || '0'),
                cpc: row.cpc ? parseFloat(row.cpc) : null,
                cpm: row.cpm ? parseFloat(row.cpm) : null,
                ctr: row.ctr ? parseFloat(row.ctr) : null,
                frequency: row.frequency ? parseFloat(row.frequency) : null,
                conversions,
                cost_per_conversion: conversions > 0 ? parseFloat(row.spend || '0') / conversions : null,
                leads,
                cost_per_lead: cpl || (leads > 0 ? parseFloat(row.spend || '0') / leads : null),
                video_views: videoViews,
                video_views_p25: extractVideoPercent(row.video_p25_watched_actions),
                video_views_p50: extractVideoPercent(row.video_p50_watched_actions),
                video_views_p75: extractVideoPercent(row.video_p75_watched_actions),
                video_views_p100: extractVideoPercent(row.video_p100_watched_actions),
                actions: row.actions || [],
                raw_response: row,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'org_id,campaign_id,date' })
            totalSynced++
          }
        }

        // ===== SYNC ADSET INSIGHTS (daily) =====
        if (syncLevels.includes('adsets')) {
          const adsetInsights = await getAdSetInsightsDaily(config, sinceStr, untilStr)

          for (const row of adsetInsights) {
            const leads = extractLeads(row.actions)
            const cpl = extractCostPerLead(row.cost_per_action_type)
            const conversions = extractConversions(row.actions)

            await admin
              .from('meta_adset_insights')
              .upsert({
                org_id: orgId,
                adset_id: row.adset_id,
                date: row.date_start,
                impressions: parseInt(row.impressions || '0', 10),
                reach: parseInt(row.reach || '0', 10),
                clicks: parseInt(row.clicks || '0', 10),
                link_clicks: extractLinkClicks(row.actions),
                spend: parseFloat(row.spend || '0'),
                cpc: row.cpc ? parseFloat(row.cpc) : null,
                cpm: row.cpm ? parseFloat(row.cpm) : null,
                ctr: row.ctr ? parseFloat(row.ctr) : null,
                conversions,
                cost_per_conversion: conversions > 0 ? parseFloat(row.spend || '0') / conversions : null,
                leads,
                cost_per_lead: cpl || (leads > 0 ? parseFloat(row.spend || '0') / leads : null),
                actions: row.actions || [],
              }, { onConflict: 'org_id,adset_id,date' })
            totalSynced++
          }
        }

        // ===== SYNC AD INSIGHTS (daily) =====
        if (syncLevels.includes('ads')) {
          const adInsights = await getAdInsightsDaily(config, sinceStr, untilStr)

          for (const row of adInsights) {
            const leads = extractLeads(row.actions)
            const conversions = extractConversions(row.actions)

            await admin
              .from('meta_ad_insights')
              .upsert({
                org_id: orgId,
                ad_id: row.ad_id,
                date: row.date_start,
                impressions: parseInt(row.impressions || '0', 10),
                reach: parseInt(row.reach || '0', 10),
                clicks: parseInt(row.clicks || '0', 10),
                link_clicks: extractLinkClicks(row.actions),
                spend: parseFloat(row.spend || '0'),
                cpc: row.cpc ? parseFloat(row.cpc) : null,
                cpm: row.cpm ? parseFloat(row.cpm) : null,
                ctr: row.ctr ? parseFloat(row.ctr) : null,
                conversions,
                leads,
                actions: row.actions || [],
              }, { onConflict: 'org_id,ad_id,date' })
            totalSynced++
          }
        }

        // Update sync log as completed
        const duration = Date.now() - startTime
        if (syncLogId) {
          await admin
            .from('meta_sync_logs')
            .update({
              status: 'completed',
              records_synced: totalSynced,
              duration_ms: duration,
              completed_at: new Date().toISOString(),
            })
            .eq('id', syncLogId)
        }

        // Update last_synced_at on account
        await admin
          .from('meta_ad_accounts')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', account.id)

        results[account.ad_account_id] = {
          status: 'ok',
          name: account.ad_account_name,
          records_synced: totalSynced,
          date_range: { since: sinceStr, until: untilStr },
        }

      } catch (err: any) {
        // Update sync log as failed
        if (syncLogId) {
          await admin
            .from('meta_sync_logs')
            .update({
              status: 'failed',
              error_message: err.message,
              duration_ms: Date.now() - startTime,
              completed_at: new Date().toISOString(),
            })
            .eq('id', syncLogId)
        }

        results[account.ad_account_id] = {
          status: 'error',
          name: account.ad_account_name,
          error: err.message,
        }
      }
    }

    return NextResponse.json({
      success: true,
      accounts_synced: Object.keys(results).length,
      duration_ms: Date.now() - startTime,
      results,
    })

  } catch (error: any) {
    console.error('Meta Ads sync error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
