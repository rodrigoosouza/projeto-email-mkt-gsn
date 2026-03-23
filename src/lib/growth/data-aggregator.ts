import { createAdminClient } from '@/lib/supabase/admin'
import { getTrackingOrgByOrgId } from '@/lib/tracking/organizations'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

function createTrackingClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export interface GrowthDataSnapshot {
  period: { from: string; to: string }
  metaAds: {
    kpis: { spend: number; impressions: number; clicks: number; leads: number; cpl: number; ctr: number; convRate: number }
    topCreatives: { name: string; leads: number; spend: number; cpl: number; convRate: number; clicks: number; impressions: number; reach: number; ctr: number; cpc: number; cpm: number }[]
    topAudiences: { name: string; leads: number; spend: number; cpl: number; convRate: number; type: string; clicks: number; impressions: number; ctr: number; cpc: number }[]
    campaigns: { name: string; spend: number; leads: number; cpl: number; convRate: number }[]
  }
  crm: {
    kpis: { total: number; open: number; won: number; lost: number; wonValue: number; openValue: number; winRate: number; avgTicket: number }
    funnel: { stage: string; count: number; value: number }[]
    lostReasons: { reason: string; count: number }[]
    creativesInCRM: { name: string; deals: number; open: number; won: number; lost: number; wonValue: number }[]
    audiencesInCRM: { name: string; deals: number; open: number; won: number; lost: number }[]
    recentActivities: { dealTitle: string; personName: string; activityType: string; subject: string; note: string; date: string }[]
    recentNotes: { dealTitle: string; personName: string; content: string; date: string }[]
    allWonDeals: { title: string; personName: string; value: number; wonTime: string; utmTerm: string | null; utmContent: string | null; utmSource: string | null; source: string }[]
  }
  tracking: {
    kpis: { sessions: number; visitors: number; pageViews: number; leads: number; convRate: number }
    topSources: { source: string; medium: string; sessions: number; leads: number; convRate: number }[]
    topPages: { path: string; views: number; sessions: number; leads: number; convRate: number }[]
    topStates: { state: string; sessions: number; leads: number; convRate: number }[]
  }
  ga4: {
    overview: { sessions: number; totalUsers: number; newUsers: number; pageViews: number; avgSessionDuration: number; bounceRate: number; conversions: number; engagedSessions: number } | null
    sources: { source: string; medium: string; sessions: number; users: number; conversions: number; bounceRate: number }[]
    topPages: { pagePath: string; pageViews: number; users: number; avgDuration: number; bounceRate: number; conversions: number }[]
    geography: { region: string; sessions: number; users: number; conversions: number }[]
    devices: { device: string; sessions: number; users: number; conversions: number }[]
    topEvents: { eventName: string; count: number; users: number }[]
  } | null
}

export async function aggregateGrowthData(orgId: string, fromDate: string, toDate: string): Promise<GrowthDataSnapshot> {
  const admin = createAdminClient()

  // === META ADS ===
  const { data: campaignInsights } = await admin
    .from('meta_campaign_insights')
    .select('campaign_name, spend, impressions, clicks, leads, ctr, cost_per_lead')
    .eq('org_id', orgId)
    .gte('date', fromDate)
    .lte('date', toDate)

  const { data: adInsights } = await admin
    .from('meta_ad_insights')
    .select('ad_id, spend, impressions, reach, clicks, link_clicks, leads, ctr, cpc, cpm')
    .eq('org_id', orgId)
    .gte('date', fromDate)
    .lte('date', toDate)

  const { data: adsetInsights } = await admin
    .from('meta_adset_insights')
    .select('adset_id, spend, impressions, clicks, leads, ctr, cpc')
    .eq('org_id', orgId)
    .gte('date', fromDate)
    .lte('date', toDate)

  const { data: adsMeta } = await admin
    .from('meta_ads')
    .select('ad_id, name, image_url')
    .eq('org_id', orgId)

  const { data: adsetsMeta } = await admin
    .from('meta_adsets')
    .select('adset_id, name')
    .eq('org_id', orgId)

  // Aggregate campaigns
  const campaignMap = new Map<string, { spend: number; leads: number; impressions: number; clicks: number }>()
  campaignInsights?.forEach((c: any) => {
    const e = campaignMap.get(c.campaign_name) || { spend: 0, leads: 0, impressions: 0, clicks: 0 }
    e.spend += Number(c.spend); e.leads += Number(c.leads); e.impressions += Number(c.impressions); e.clicks += Number(c.clicks)
    campaignMap.set(c.campaign_name, e)
  })

  // Aggregate creatives by name
  const adNameMap = new Map<string, any>()
  adsMeta?.forEach((a: any) => adNameMap.set(a.ad_id, a))

  const creativeMap = new Map<string, { name: string; spend: number; impressions: number; reach: number; clicks: number; linkClicks: number; leads: number; ctrSum: number; cpcSum: number; cpmSum: number; rowCount: number }>()
  adInsights?.forEach((row: any) => {
    const meta = adNameMap.get(row.ad_id)
    const name = meta?.name || row.ad_id
    const e = creativeMap.get(name) || { name, spend: 0, impressions: 0, reach: 0, clicks: 0, linkClicks: 0, leads: 0, ctrSum: 0, cpcSum: 0, cpmSum: 0, rowCount: 0 }
    e.spend += Number(row.spend); e.impressions += Number(row.impressions); e.reach += Number(row.reach || 0)
    e.clicks += Number(row.clicks); e.linkClicks += Number(row.link_clicks || 0); e.leads += Number(row.leads)
    e.ctrSum += Number(row.ctr || 0); e.cpcSum += Number(row.cpc || 0); e.cpmSum += Number(row.cpm || 0); e.rowCount++
    creativeMap.set(name, e)
  })

  // Aggregate audiences
  const adsetNameMap = new Map<string, any>()
  adsetsMeta?.forEach((a: any) => adsetNameMap.set(a.adset_id, a))

  const audienceMap = new Map<string, { name: string; spend: number; impressions: number; clicks: number; leads: number; ctrSum: number; cpcSum: number; rowCount: number }>()
  adsetInsights?.forEach((row: any) => {
    const meta = adsetNameMap.get(row.adset_id)
    const name = meta?.name || row.adset_id
    const e = audienceMap.get(name) || { name, spend: 0, impressions: 0, clicks: 0, leads: 0, ctrSum: 0, cpcSum: 0, rowCount: 0 }
    e.spend += Number(row.spend); e.impressions += Number(row.impressions); e.clicks += Number(row.clicks); e.leads += Number(row.leads)
    e.ctrSum += Number(row.ctr || 0); e.cpcSum += Number(row.cpc || 0); e.rowCount++
    audienceMap.set(name, e)
  })

  const totalSpend = Array.from(campaignMap.values()).reduce((s, c) => s + c.spend, 0)
  const totalImpressions = Array.from(campaignMap.values()).reduce((s, c) => s + c.impressions, 0)
  const totalClicks = Array.from(campaignMap.values()).reduce((s, c) => s + c.clicks, 0)
  const totalLeads = Array.from(campaignMap.values()).reduce((s, c) => s + c.leads, 0)

  // === CRM PIPEDRIVE ===
  const { data: deals } = await admin
    .from('pipedrive_deals')
    .select('deal_id, title, value, status, stage_name, stage_id, person_name, person_email, utm_term, utm_content, utm_source, lost_reason, add_time, won_time, lost_time, owner_name')
    .eq('org_id', orgId)
    .gte('add_time', fromDate)
    .lte('add_time', toDate + 'T23:59:59')

  const { data: allDeals } = await admin
    .from('pipedrive_deals')
    .select('deal_id, title, value, status, stage_name, stage_id, person_name, utm_term, utm_content, lost_reason, owner_name')
    .eq('org_id', orgId)
    .eq('status', 'open')

  const { data: stages } = await admin
    .from('pipedrive_stages')
    .select('stage_id, name, order_nr')
    .eq('org_id', orgId)
    .order('order_nr', { ascending: true })

  // Get recent activities and notes from Pipedrive API
  const { data: connection } = await admin
    .from('pipedrive_connections')
    .select('api_token')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .single()

  let recentActivities: any[] = []
  let recentNotes: any[] = []

  if (connection?.api_token) {
    try {
      const actRes = await fetch(`https://api.pipedrive.com/v1/recents?api_token=${connection.api_token}&since_timestamp=${fromDate}+00:00:00&items=activity&limit=50`)
      const actJson = await actRes.json()
      if (actJson.success && actJson.data) {
        recentActivities = actJson.data
          .filter((item: any) => item.data?.done)
          .slice(0, 20)
          .map((item: any) => ({
            dealTitle: item.data?.deal_title || '',
            personName: item.data?.person_name || '',
            activityType: item.data?.type || '',
            subject: item.data?.subject || '',
            note: (item.data?.note || '').replace(/<[^>]*>/g, '').slice(0, 200),
            date: item.data?.marked_as_done_time || item.data?.due_date || '',
          }))
      }
    } catch (e) { /* ignore */ }

    try {
      const notesRes = await fetch(`https://api.pipedrive.com/v1/recents?api_token=${connection.api_token}&since_timestamp=${fromDate}+00:00:00&items=note&limit=30`)
      const notesJson = await notesRes.json()
      if (notesJson.success && notesJson.data) {
        recentNotes = notesJson.data.slice(0, 15).map((item: any) => ({
          dealTitle: item.data?.deal?.title || '',
          personName: item.data?.person?.name || '',
          content: (item.data?.content || '').replace(/<[^>]*>/g, '').slice(0, 300),
          date: item.data?.add_time || '',
        }))
      }
    } catch (e) { /* ignore */ }
  }

  // CRM KPIs (period deals)
  const periodDeals = deals || []
  const openDeals = allDeals || []
  const wonDeals = periodDeals.filter((d: any) => d.status === 'won')
  const lostDeals = periodDeals.filter((d: any) => d.status === 'lost')

  // Funnel (open deals by stage)
  const stageMap = new Map<number, { name: string; order: number }>()
  stages?.forEach((s: any) => stageMap.set(s.stage_id, { name: s.name, order: s.order_nr }))

  const funnelMap = new Map<string, { count: number; value: number; order: number }>()
  openDeals.forEach((d: any) => {
    const stageName = stageMap.get(d.stage_id)?.name || d.stage_name || 'Outro'
    const order = stageMap.get(d.stage_id)?.order || 99
    const e = funnelMap.get(stageName) || { count: 0, value: 0, order }
    e.count++; e.value += Number(d.value || 0)
    funnelMap.set(stageName, e)
  })

  // Lost reasons
  const lostReasonMap = new Map<string, number>()
  lostDeals.forEach((d: any) => {
    const reason = d.lost_reason || 'Sem motivo informado'
    lostReasonMap.set(reason, (lostReasonMap.get(reason) || 0) + 1)
  })

  // Creatives in CRM — use ALL deals (not just period) to capture won deals from any time
  const { data: allDealsWithUtm } = await admin
    .from('pipedrive_deals')
    .select('deal_id, value, status, utm_term, utm_content')
    .eq('org_id', orgId)
    .not('utm_term', 'is', null)
    .neq('utm_term', '{{ad.name}}')

  const crmCreativeMap = new Map<string, { name: string; deals: number; open: number; won: number; lost: number; wonValue: number }>()
  ;(allDealsWithUtm || []).forEach((d: any) => {
    const term = d.utm_term; if (!term) return
    const e = crmCreativeMap.get(term) || { name: term, deals: 0, open: 0, won: 0, lost: 0, wonValue: 0 }
    e.deals++
    if (d.status === 'open') e.open++
    if (d.status === 'won') { e.won++; e.wonValue += Number(d.value || 0) }
    if (d.status === 'lost') e.lost++
    crmCreativeMap.set(term, e)
  })

  // Audiences in CRM
  const crmAudienceMap = new Map<string, { name: string; deals: number; open: number; won: number; lost: number }>()
  periodDeals.forEach((d: any) => {
    const content = d.utm_content; if (!content) return
    const e = crmAudienceMap.get(content) || { name: content, deals: 0, open: 0, won: 0, lost: 0 }
    e.deals++
    if (d.status === 'open') e.open++
    if (d.status === 'won') e.won++
    if (d.status === 'lost') e.lost++
    crmAudienceMap.set(content, e)
  })

  // === GOOGLE ANALYTICS 4 ===
  let ga4Data: GrowthDataSnapshot['ga4'] = null
  try {
    const { getFullReport } = await import('@/lib/analytics/ga4-client')
    const propertyId = process.env.GA4_PROPERTY_ID
    if (propertyId) {
      const report = await getFullReport(propertyId, fromDate, toDate)
      ga4Data = {
        overview: report.overview,
        sources: report.sources as any,
        topPages: report.pages as any,
        geography: report.geography as any,
        devices: report.devices as any,
        topEvents: report.events as any,
      }
    }
  } catch (e: any) {
    console.error('[Growth Aggregator] GA4 error:', e.message)
  }

  // === TRACKING GTM ===
  const trackingOrg = getTrackingOrgByOrgId(orgId)
  let trackingKpis = { sessions: 0, visitors: 0, pageViews: 0, leads: 0, convRate: 0 }
  let topSources: any[] = []
  let topPages: any[] = []
  let topStates: any[] = []

  if (trackingOrg) {
    const tracking = createTrackingClient()
    const tableName = trackingOrg.tables.events

    const { data: events } = await tracking
      .from(tableName)
      .select('event_name, session_id, client_id, page_path, utm_source, utm_medium, geo_state')
      .gte('created_at', fromDate)
      .lte('created_at', toDate + 'T23:59:59')
      .limit(10000)

    if (events) {
      const sessions = new Set<string>()
      const visitors = new Set<string>()
      let pvCount = 0, leadCount = 0
      const srcMap = new Map<string, { sessions: Set<string>; leads: number }>()
      const pageMap = new Map<string, { views: number; sessions: Set<string>; leads: number }>()
      const geoMap = new Map<string, { sessions: Set<string>; leads: number }>()

      events.forEach((e: any) => {
        if (e.session_id) sessions.add(e.session_id)
        if (e.client_id) visitors.add(e.client_id)
        const isLead = e.event_name === 'generate_lead'
        const isPV = e.event_name === 'page_view' || e.event_name === 'custom_page_view'
        if (isPV) pvCount++
        if (isLead) leadCount++

        // Sources
        const src = e.utm_source || '(direct)'
        const med = e.utm_medium || '(none)'
        const srcKey = `${src}/${med}`
        const s = srcMap.get(srcKey) || { sessions: new Set(), leads: 0 }
        if (e.session_id) s.sessions.add(e.session_id)
        if (isLead) s.leads++
        srcMap.set(srcKey, s)

        // Pages
        if (e.page_path && (isPV || isLead)) {
          const p = pageMap.get(e.page_path) || { views: 0, sessions: new Set(), leads: 0 }
          if (isPV) p.views++
          if (e.session_id) p.sessions.add(e.session_id)
          if (isLead) p.leads++
          pageMap.set(e.page_path, p)
        }

        // Geo
        if (e.geo_state) {
          const g = geoMap.get(e.geo_state) || { sessions: new Set(), leads: 0 }
          if (e.session_id) g.sessions.add(e.session_id)
          if (isLead) g.leads++
          geoMap.set(e.geo_state, g)
        }
      })

      trackingKpis = {
        sessions: sessions.size, visitors: visitors.size, pageViews: pvCount, leads: leadCount,
        convRate: sessions.size > 0 ? (leadCount / sessions.size) * 100 : 0,
      }

      topSources = Array.from(srcMap.entries())
        .map(([key, val]) => {
          const [source, medium] = key.split('/')
          const sess = val.sessions.size
          return { source, medium, sessions: sess, leads: val.leads, convRate: sess > 0 ? (val.leads / sess) * 100 : 0 }
        })
        .sort((a, b) => b.leads - a.leads).slice(0, 10)

      topPages = Array.from(pageMap.entries())
        .map(([path, val]) => {
          const sess = val.sessions.size
          return { path, views: val.views, sessions: sess, leads: val.leads, convRate: sess > 0 ? (val.leads / sess) * 100 : 0 }
        })
        .sort((a, b) => b.views - a.views).slice(0, 10)

      topStates = Array.from(geoMap.entries())
        .map(([state, val]) => {
          const sess = val.sessions.size
          return { state, sessions: sess, leads: val.leads, convRate: sess > 0 ? (val.leads / sess) * 100 : 0 }
        })
        .sort((a, b) => b.sessions - a.sessions).slice(0, 10)
    }
  }

  return {
    period: { from: fromDate, to: toDate },
    metaAds: {
      kpis: {
        spend: totalSpend, impressions: totalImpressions, clicks: totalClicks, leads: totalLeads,
        cpl: totalLeads > 0 ? totalSpend / totalLeads : 0,
        ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        convRate: totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0,
      },
      topCreatives: Array.from(creativeMap.values())
        .map(c => ({
          name: c.name, leads: c.leads, spend: c.spend, clicks: c.clicks, impressions: c.impressions, reach: c.reach,
          cpl: c.leads > 0 ? c.spend / c.leads : 0,
          convRate: c.clicks > 0 ? (c.leads / c.clicks) * 100 : 0,
          ctr: c.rowCount > 0 ? c.ctrSum / c.rowCount : 0,
          cpc: c.rowCount > 0 ? c.cpcSum / c.rowCount : 0,
          cpm: c.rowCount > 0 ? c.cpmSum / c.rowCount : 0,
        }))
        .sort((a, b) => b.spend - a.spend).slice(0, 20),
      topAudiences: Array.from(audienceMap.values())
        .map(a => {
          const isRmk = a.name?.toLowerCase().includes('remarketing')
          const isLAL = a.name?.toLowerCase().includes('lookalike')
          return {
            name: a.name, leads: a.leads, spend: a.spend, clicks: a.clicks, impressions: a.impressions,
            type: isRmk ? 'Remarketing' : isLAL ? 'Lookalike' : 'Interesses',
            cpl: a.leads > 0 ? a.spend / a.leads : 0,
            convRate: a.clicks > 0 ? (a.leads / a.clicks) * 100 : 0,
            ctr: a.rowCount > 0 ? a.ctrSum / a.rowCount : 0,
            cpc: a.rowCount > 0 ? a.cpcSum / a.rowCount : 0,
          }
        })
        .sort((a, b) => b.spend - a.spend).slice(0, 20),
      campaigns: Array.from(campaignMap.entries())
        .map(([name, c]) => ({ name, ...c, cpl: c.leads > 0 ? c.spend / c.leads : 0, convRate: c.clicks > 0 ? (c.leads / c.clicks) * 100 : 0 }))
        .sort((a, b) => b.spend - a.spend),
    },
    crm: {
      kpis: {
        total: periodDeals.length, open: openDeals.length,
        won: wonDeals.length, lost: lostDeals.length,
        wonValue: wonDeals.reduce((s: number, d: any) => s + Number(d.value || 0), 0),
        openValue: openDeals.reduce((s: number, d: any) => s + Number(d.value || 0), 0),
        winRate: (wonDeals.length + lostDeals.length) > 0 ? (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100 : 0,
        avgTicket: wonDeals.length > 0 ? wonDeals.reduce((s: number, d: any) => s + Number(d.value || 0), 0) / wonDeals.length : 0,
      },
      funnel: Array.from(funnelMap.entries())
        .map(([stage, v]) => ({ stage, ...v }))
        .sort((a, b) => a.order - b.order),
      lostReasons: Array.from(lostReasonMap.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count).slice(0, 10),
      creativesInCRM: Array.from(crmCreativeMap.values()).sort((a, b) => b.deals - a.deals).slice(0, 15),
      audiencesInCRM: Array.from(crmAudienceMap.values()).sort((a, b) => b.deals - a.deals).slice(0, 15),
      recentActivities,
      recentNotes,
      allWonDeals: await (async () => {
        const { data: wonDeals } = await admin
          .from('pipedrive_deals')
          .select('title, person_name, value, won_time, utm_term, utm_content, utm_source')
          .eq('org_id', orgId)
          .eq('status', 'won')
          .order('won_time', { ascending: false })
          .limit(50)
        return (wonDeals || []).map((d: any) => {
          let source = 'Direto / Sem rastreio'
          if (d.utm_source === 'facebook') source = 'Meta Ads'
          else if (d.utm_source === 'google') source = 'Google Ads'
          else if (d.utm_source === 'ig') source = 'Instagram'
          else if (d.utm_source === 'manychat') source = 'ManyChat'
          else if (d.utm_source) source = d.utm_source
          else if (d.title?.includes('Orgânico') || d.title?.includes('orgânico')) source = 'Orgânico'
          return {
            title: d.title, personName: d.person_name, value: Number(d.value || 0),
            wonTime: d.won_time, utmTerm: d.utm_term, utmContent: d.utm_content,
            utmSource: d.utm_source, source,
          }
        })
      })(),
    },
    tracking: { kpis: trackingKpis, topSources, topPages, topStates },
    ga4: ga4Data,
  }
}
