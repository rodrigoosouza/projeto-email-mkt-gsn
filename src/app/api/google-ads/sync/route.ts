import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  GoogleAdsConfig,
  getAccessToken,
  getCampaignInsightsDaily,
  getAdGroupInsightsDaily,
  getAdInsightsDaily,
} from '@/lib/analytics/google-ads-client'

export const maxDuration = 120

// ===== Core sync logic =====
async function syncAccount(
  admin: SupabaseClient,
  orgId: string,
  account: any,
  daysBack: number = 7,
) {
  const startTime = Date.now()

  // Get access token
  const accessToken = account.refresh_token
    ? await refreshAccountToken(account.refresh_token)
    : await getAccessToken()

  if (!accessToken) {
    return { status: 'error', error: 'Failed to get access token' }
  }

  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  if (!developerToken) {
    return { status: 'error', error: 'Missing GOOGLE_ADS_DEVELOPER_TOKEN' }
  }

  const config: GoogleAdsConfig = {
    customer_id: account.customer_id,
    developer_token: developerToken,
    access_token: accessToken,
    login_customer_id: account.login_customer_id || undefined,
  }

  // Create sync log
  const { data: syncLog } = await admin
    .from('google_sync_logs')
    .insert({
      org_id: orgId,
      customer_id: account.customer_id,
      sync_type: 'full',
      status: 'running',
    })
    .select('id')
    .single()

  const syncLogId = syncLog?.id
  let totalSynced = 0

  try {
    // Date range
    const until = new Date()
    until.setDate(until.getDate() - 1) // D-1 (Google finalizes metrics next day)
    const since = new Date(until)
    since.setDate(since.getDate() - daysBack)
    const sinceStr = since.toISOString().split('T')[0]
    const untilStr = until.toISOString().split('T')[0]

    // ===== SYNC CAMPAIGN INSIGHTS =====
    const campaignResults = await getCampaignInsightsDaily(config, sinceStr, untilStr)
    for (const row of campaignResults) {
      const c = row.campaign || {}
      const m = row.metrics || {}
      const spend = Number(m.costMicros || 0) / 1_000_000
      const conversions = Number(m.conversions || 0)
      const leads = Math.round(conversions) // Google Ads conversions ≈ leads

      await admin
        .from('google_campaign_insights')
        .upsert({
          org_id: orgId,
          customer_id: account.customer_id,
          campaign_id: String(c.id),
          campaign_name: c.name || null,
          campaign_status: c.status || null,
          date: row.segments?.date,
          impressions: Number(m.impressions || 0),
          clicks: Number(m.clicks || 0),
          spend,
          conversions,
          cost_per_conversion: Number(m.costPerConversion || 0) / 1_000_000,
          cpc: Number(m.averageCpc || 0) / 1_000_000,
          cpm: Number(m.averageCpm || 0) / 1_000_000,
          ctr: Number(m.ctr || 0),
          leads,
          cost_per_lead: leads > 0 ? spend / leads : 0,
          interactions: Number(m.interactions || 0),
          interaction_rate: Number(m.interactionRate || 0),
          search_impression_share: m.searchImpressionShare ? Number(m.searchImpressionShare) : null,
          all_conversions: Number(m.allConversions || 0),
          view_through_conversions: Number(m.viewThroughConversions || 0),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'org_id,campaign_id,date' })
      totalSynced++
    }

    // ===== SYNC AD GROUP INSIGHTS =====
    const adGroupResults = await getAdGroupInsightsDaily(config, sinceStr, untilStr)
    for (const row of adGroupResults) {
      const ag = row.adGroup || {}
      const c = row.campaign || {}
      const m = row.metrics || {}
      const spend = Number(m.costMicros || 0) / 1_000_000
      const conversions = Number(m.conversions || 0)

      await admin
        .from('google_adgroup_insights')
        .upsert({
          org_id: orgId,
          customer_id: account.customer_id,
          campaign_id: String(c.id),
          adgroup_id: String(ag.id),
          adgroup_name: ag.name || null,
          date: row.segments?.date,
          impressions: Number(m.impressions || 0),
          clicks: Number(m.clicks || 0),
          spend,
          conversions,
          cpc: Number(m.averageCpc || 0) / 1_000_000,
          ctr: Number(m.ctr || 0),
          leads: Math.round(conversions),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'org_id,adgroup_id,date' })
      totalSynced++
    }

    // ===== SYNC AD INSIGHTS =====
    const adResults = await getAdInsightsDaily(config, sinceStr, untilStr)
    for (const row of adResults) {
      const ad = row.adGroupAd?.ad || {}
      const ag = row.adGroup || {}
      const c = row.campaign || {}
      const m = row.metrics || {}
      const spend = Number(m.costMicros || 0) / 1_000_000
      const conversions = Number(m.conversions || 0)

      await admin
        .from('google_ad_insights')
        .upsert({
          org_id: orgId,
          customer_id: account.customer_id,
          campaign_id: String(c.id),
          adgroup_id: String(ag.id),
          ad_id: String(ad.id),
          date: row.segments?.date,
          impressions: Number(m.impressions || 0),
          clicks: Number(m.clicks || 0),
          spend,
          conversions,
          cpc: Number(m.averageCpc || 0) / 1_000_000,
          ctr: Number(m.ctr || 0),
          leads: Math.round(conversions),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'org_id,ad_id,date' })
      totalSynced++
    }

    // Update sync log
    if (syncLogId) {
      await admin
        .from('google_sync_logs')
        .update({
          status: 'completed',
          records_synced: totalSynced,
          duration_ms: Date.now() - startTime,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLogId)
    }

    // Update account last_synced_at
    await admin
      .from('google_ads_accounts')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', account.id)

    return {
      status: 'ok',
      records_synced: totalSynced,
      duration_ms: Date.now() - startTime,
    }
  } catch (err: any) {
    if (syncLogId) {
      await admin
        .from('google_sync_logs')
        .update({
          status: 'failed',
          error_message: err.message,
          duration_ms: Date.now() - startTime,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLogId)
    }
    return { status: 'error', error: err.message }
  }
}

// Refresh token for per-account OAuth
async function refreshAccountToken(refreshToken: string): Promise<string | null> {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }).toString(),
    })
    if (!response.ok) return null
    const data = await response.json()
    return data.access_token || null
  } catch {
    return null
  }
}

// Verifies CRON_SECRET
function verifyCronAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ') && authHeader.slice(7) === cronSecret) return true

  const customHeader = request.headers.get('x-cron-secret')
  if (customHeader === cronSecret) return true

  const queryParam = request.nextUrl.searchParams.get('secret')
  if (queryParam === cronSecret) return true

  return false
}

// ===== GET: Cron sync all active accounts =====
export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const admin = createAdminClient()

  const { data: accounts } = await admin
    .from('google_ads_accounts')
    .select('*')
    .eq('status', 'active')
    .eq('sync_enabled', true)

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ message: 'No active Google Ads accounts', synced: 0 })
  }

  const results: Record<string, any> = {}
  for (const account of accounts) {
    results[account.customer_id] = await syncAccount(admin, account.org_id, account)
  }

  return NextResponse.json({
    success: true,
    duration_ms: Date.now() - startTime,
    results,
  })
}

// ===== POST: Manual sync from dashboard =====
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    if (!verifyCronAuth(request)) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const { orgId, daysBack = 7 } = await request.json()

    if (!orgId) {
      return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: accounts } = await admin
      .from('google_ads_accounts')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'active')

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ message: 'No active Google Ads accounts for this org', synced: 0 })
    }

    const results: Record<string, any> = {}
    for (const account of accounts) {
      results[account.customer_id] = await syncAccount(admin, account.org_id, account, daysBack)
    }

    return NextResponse.json({
      success: true,
      duration_ms: Date.now() - startTime,
      results,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
