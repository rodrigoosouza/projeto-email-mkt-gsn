import { createClient } from './client'

export type PeriodRange = {
  from: string
  to: string
  prevFrom: string
  prevTo: string
}

export interface DashboardData {
  // Email Marketing
  totalLeads: number
  totalCampaigns: number
  totalEmailsSent: number
  totalOpened: number
  totalClicked: number
  totalDelivered: number
  openRate: number
  clickRate: number
  totalLandingPages: number
  totalForms: number
  totalFormSubmissions: number
  totalTemplates: number
  totalSegments: number
  activeCampaigns: number
  recentCampaigns: {
    id: string
    name: string
    status: string
    total_leads: number
    sent_at: string | null
    created_at: string
    stats?: { total_sent: number; total_opened: number; total_clicked: number }
  }[]
  recentLeads: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    status: string
    created_at: string
  }[]
  // Leads breakdown
  leadsThisMonth: number
  leadsByStatus: { status: string; count: number }[]
  leadsBySource: { source: string; count: number }[]
  // Content Calendar
  postsThisMonth: number
  totalPostsGenerated: number
  // Ads
  activeAdCampaigns: number
  totalAdSpend: number
  leadsFromAds: number
  // CRM (Pipedrive)
  openDeals: number
  wonDealsThisMonth: number
  pipelineValue: number
  // Automations
  totalAutomations: number
  activeAutomations: number

  // Last LP
  lastLP: { id: string; title: string; created_at: string; visits: number; leads: number } | null
  // Last email campaign
  lastEmailCampaign: { id: string; name: string; created_at: string; sent: number; delivered: number; opened: number; clicked: number } | null
  // Top pages (GA4 or tracking)
  topPages: { path: string; views: number; change?: number }[]

  // === NEW: Funnel metrics ===
  impressions: number
  qualifiedLeads: number
  opportunities: number
  sales: number
  salesValue: number

  // Previous period comparison
  prevImpressions: number
  prevLeads: number
  prevQualifiedLeads: number
  prevOpportunities: number
  prevSales: number

  // Daily leads for chart
  dailyLeads: { date: string; count: number; cumulative: number }[]
  prevDailyLeads: { date: string; count: number; cumulative: number }[]

  // Latest lead conversions (detailed)
  latestLeads: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    company: string | null
    position: string | null
    source: string | null
    created_at: string
    custom_fields: Record<string, unknown> | null
  }[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function safeQuery(promise: any): Promise<{ data: any; count: number }> {
  try {
    const result = await promise
    return { data: result.data ?? null, count: result.count ?? 0 }
  } catch {
    return { data: null, count: 0 }
  }
}

export async function getDashboardData(orgId: string, period?: PeriodRange): Promise<DashboardData> {
  const supabase = createClient()

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Period defaults to this month if not provided
  const from = period?.from || firstOfMonth
  const to = period?.to || now.toISOString()
  const prevFrom = period?.prevFrom || new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const prevTo = period?.prevTo || new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

  const [
    leadsResult, campaignsResult, statsResult, recentLeadsResult, recentCampaignsResult,
    landingPagesResult, formsResult, formSubmissionsResult, templatesResult, segmentsResult, activeCampaignsResult,
    leadsThisMonthResult, leadsActiveResult, leadsUnsubResult, leadsBouncedResult, leadsComplainedResult,
    postsThisMonthResult, totalPostsResult,
    activeAdCampaignsResult, adInsightsResult,
    openDealsResult, wonDealsResult, pipelineValueResult,
    leadsBySourceResult,
    totalAutomationsResult, activeAutomationsResult,
    // NEW: LP, Email, Top Pages
    lastLPResult, lastEmailResult, topPagesResult,
    // NEW: Funnel queries
    impressionsResult, prevImpressionsResult,
    leadsInPeriodResult, prevLeadsInPeriodResult,
    qualifiedLeadsResult, prevQualifiedLeadsResult,
    opportunitiesResult, prevOpportunitiesResult,
    salesResult, prevSalesResult,
    salesValueResult,
    dailyLeadsResult, prevDailyLeadsResult,
    latestLeadsResult,
  ] = await Promise.all([
    // Total leads count
    safeQuery(supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)),
    // Total campaigns count
    safeQuery(supabase
      .from('campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)),
    // Aggregate stats from all campaign_stats
    safeQuery(supabase
      .from('campaigns')
      .select('id, campaign_stats(total_sent, total_delivered, total_opened, total_clicked)')
      .eq('org_id', orgId)),
    // Recent 5 leads
    safeQuery(supabase
      .from('leads')
      .select('id, email, first_name, last_name, status, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(5)),
    // Recent 5 campaigns with stats
    safeQuery(supabase
      .from('campaigns')
      .select('id, name, status, total_leads, sent_at, created_at, campaign_stats(total_sent, total_opened, total_clicked)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(5)),
    // Landing pages count
    safeQuery(supabase
      .from('landing_pages')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)),
    // Forms count
    safeQuery(supabase
      .from('forms')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)),
    // Form submissions count
    safeQuery(supabase
      .from('form_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)),
    // Templates count
    safeQuery(supabase
      .from('email_templates')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)),
    // Segments count
    safeQuery(supabase
      .from('segments')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)),
    // Active campaigns count
    safeQuery(supabase
      .from('campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .in('status', ['sending', 'scheduled'])),
    // Leads this month
    safeQuery(supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('created_at', firstOfMonth)),
    // Leads by status: active
    safeQuery(supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'active')),
    // Leads by status: unsubscribed
    safeQuery(supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'unsubscribed')),
    // Leads by status: bounced
    safeQuery(supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'bounced')),
    // Leads by status: complained
    safeQuery(supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'complained')),
    // Content Calendar this month
    safeQuery(supabase
      .from('content_calendar')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('scheduled_date', firstOfMonth)
      .lte('scheduled_date', now.toISOString())),
    safeQuery(supabase
      .from('content_calendar')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)),
    // Ads
    safeQuery(supabase
      .from('meta_campaign_insights')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)),
    safeQuery(supabase
      .from('meta_campaign_insights')
      .select('spend, leads')
      .eq('org_id', orgId)),
    // CRM Pipedrive
    safeQuery(supabase
      .from('pipedrive_deals')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'open')),
    safeQuery(supabase
      .from('pipedrive_deals')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'won')
      .gte('won_time', firstOfMonth)),
    safeQuery(supabase
      .from('pipedrive_deals')
      .select('value')
      .eq('org_id', orgId)
      .eq('status', 'open')),
    // Leads by source
    safeQuery(supabase
      .from('leads')
      .select('source')
      .eq('org_id', orgId)),
    // Automations
    safeQuery(supabase
      .from('automation_flows')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)),
    safeQuery(supabase
      .from('automation_flows')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('is_active', true)),

    // Last landing page
    safeQuery(supabase
      .from('landing_pages')
      .select('id, title, created_at, visits, leads')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)),
    // Last email campaign with stats
    safeQuery(supabase
      .from('campaigns')
      .select('id, name, created_at, campaign_stats(total_sent, total_delivered, total_opened, total_clicked)')
      .eq('org_id', orgId)
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(1)),
    // Top pages from visitor_sessions or page_analytics
    safeQuery(supabase
      .from('page_analytics')
      .select('page_path, page_views')
      .eq('org_id', orgId)
      .order('page_views', { ascending: false })
      .limit(5)),

    // === NEW FUNNEL QUERIES ===

    // Impressions in period
    safeQuery(supabase
      .from('meta_campaign_insights')
      .select('impressions')
      .eq('org_id', orgId)
      .gte('date', from)
      .lte('date', to)),
    // Prev impressions
    safeQuery(supabase
      .from('meta_campaign_insights')
      .select('impressions')
      .eq('org_id', orgId)
      .gte('date', prevFrom)
      .lte('date', prevTo)),

    // Leads in period
    safeQuery(supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('created_at', from)
      .lte('created_at', to)),
    // Prev leads
    safeQuery(supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('created_at', prevFrom)
      .lte('created_at', prevTo)),

    // Qualified leads (leads with a pipedrive deal match — by having deal_stage in custom_fields)
    safeQuery(supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('created_at', from)
      .lte('created_at', to)
      .not('custom_fields->deal_stage', 'is', null)),
    // Prev qualified leads
    safeQuery(supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('created_at', prevFrom)
      .lte('created_at', prevTo)
      .not('custom_fields->deal_stage', 'is', null)),

    // Opportunities (pipedrive deals created in period)
    safeQuery(supabase
      .from('pipedrive_deals')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('add_time', from)
      .lte('add_time', to)),
    // Prev opportunities
    safeQuery(supabase
      .from('pipedrive_deals')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('add_time', prevFrom)
      .lte('add_time', prevTo)),

    // Sales (won deals in period)
    safeQuery(supabase
      .from('pipedrive_deals')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'won')
      .gte('won_time', from)
      .lte('won_time', to)),
    // Prev sales
    safeQuery(supabase
      .from('pipedrive_deals')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'won')
      .gte('won_time', prevFrom)
      .lte('won_time', prevTo)),

    // Sales value (won deals value in period)
    safeQuery(supabase
      .from('pipedrive_deals')
      .select('value')
      .eq('org_id', orgId)
      .eq('status', 'won')
      .gte('won_time', from)
      .lte('won_time', to)),

    // Daily leads in period (for chart)
    safeQuery(supabase
      .from('leads')
      .select('created_at')
      .eq('org_id', orgId)
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at', { ascending: true })),
    // Prev daily leads
    safeQuery(supabase
      .from('leads')
      .select('created_at')
      .eq('org_id', orgId)
      .gte('created_at', prevFrom)
      .lte('created_at', prevTo)
      .order('created_at', { ascending: true })),

    // Latest leads with detail
    safeQuery(supabase
      .from('leads')
      .select('id, email, first_name, last_name, company, position, source, created_at, custom_fields')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(10)),
  ])

  const totalLeads = leadsResult.count || 0
  const totalCampaigns = campaignsResult.count || 0

  // Aggregate email stats
  let totalEmailsSent = 0
  let totalDelivered = 0
  let totalOpened = 0
  let totalClicked = 0

  if (statsResult.data) {
    for (const campaign of statsResult.data as Record<string, unknown>[]) {
      const stats = campaign.campaign_stats as Record<string, number>[] | undefined
      if (Array.isArray(stats) && stats.length > 0) {
        totalEmailsSent += stats[0].total_sent || 0
        totalDelivered += stats[0].total_delivered || 0
        totalOpened += stats[0].total_opened || 0
        totalClicked += stats[0].total_clicked || 0
      }
    }
  }

  const openRate = totalDelivered > 0 ? Math.round((totalOpened / totalDelivered) * 100) : 0
  const clickRate = totalDelivered > 0 ? Math.round((totalClicked / totalDelivered) * 100) : 0

  // Format recent campaigns
  const recentCampaigns = ((recentCampaignsResult.data as Record<string, unknown>[] | null) || []).map((campaign) => {
    const cStats = campaign.campaign_stats
    return {
      id: campaign.id as string,
      name: campaign.name as string,
      status: campaign.status as string,
      total_leads: campaign.total_leads as number,
      sent_at: campaign.sent_at as string | null,
      created_at: campaign.created_at as string,
      stats:
        Array.isArray(cStats) && cStats.length > 0
          ? cStats[0] as { total_sent: number; total_opened: number; total_clicked: number }
          : undefined,
    }
  })

  const recentLeads = ((recentLeadsResult.data as Record<string, unknown>[] | null) || []).map((lead) => ({
    id: lead.id as string,
    email: lead.email as string,
    first_name: lead.first_name as string | null,
    last_name: lead.last_name as string | null,
    status: lead.status as string,
    created_at: lead.created_at as string,
  }))

  // Leads by status
  const leadsByStatus = [
    { status: 'active', count: leadsActiveResult.count },
    { status: 'unsubscribed', count: leadsUnsubResult.count },
    { status: 'bounced', count: leadsBouncedResult.count },
    { status: 'complained', count: leadsComplainedResult.count },
  ].filter(s => s.count > 0)

  // Ads aggregation
  let totalAdSpend = 0
  let leadsFromAds = 0
  if (adInsightsResult.data && Array.isArray(adInsightsResult.data)) {
    for (const row of adInsightsResult.data as Record<string, number>[]) {
      totalAdSpend += Number(row.spend) || 0
      leadsFromAds += Number(row.leads) || 0
    }
  }

  // Pipeline value
  let pipelineValue = 0
  if (pipelineValueResult.data && Array.isArray(pipelineValueResult.data)) {
    for (const deal of pipelineValueResult.data as Record<string, number>[]) {
      pipelineValue += Number(deal.value) || 0
    }
  }

  // Leads by source
  const sourceMap = new Map<string, number>()
  if (leadsBySourceResult.data && Array.isArray(leadsBySourceResult.data)) {
    for (const lead of leadsBySourceResult.data as Record<string, string>[]) {
      const src = lead.source || 'direto'
      sourceMap.set(src, (sourceMap.get(src) || 0) + 1)
    }
  }
  const leadsBySource = Array.from(sourceMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)

  // === Last LP ===
  let lastLP = null
  if (lastLPResult.data && Array.isArray(lastLPResult.data) && lastLPResult.data.length > 0) {
    const lp = lastLPResult.data[0] as any
    lastLP = { id: lp.id, title: lp.title || 'Sem titulo', created_at: lp.created_at, visits: Number(lp.visits || 0), leads: Number(lp.leads || 0) }
  }

  // === Last Email Campaign ===
  let lastEmailCampaign = null
  if (lastEmailResult.data && Array.isArray(lastEmailResult.data) && lastEmailResult.data.length > 0) {
    const c = lastEmailResult.data[0] as any
    const cStats = Array.isArray(c.campaign_stats) && c.campaign_stats.length > 0 ? c.campaign_stats[0] : {}
    lastEmailCampaign = {
      id: c.id, name: c.name, created_at: c.created_at,
      sent: Number(cStats.total_sent || 0), delivered: Number(cStats.total_delivered || 0),
      opened: Number(cStats.total_opened || 0), clicked: Number(cStats.total_clicked || 0),
    }
  }

  // === Top Pages ===
  const topPages = ((topPagesResult.data as any[] | null) || []).map((p: any) => ({
    path: p.page_path || '/',
    views: Number(p.page_views || 0),
  }))

  // === NEW: Funnel aggregations ===

  // Sum impressions
  let impressions = 0
  if (impressionsResult.data && Array.isArray(impressionsResult.data)) {
    for (const row of impressionsResult.data as Record<string, number>[]) {
      impressions += Number(row.impressions) || 0
    }
  }
  let prevImpressions = 0
  if (prevImpressionsResult.data && Array.isArray(prevImpressionsResult.data)) {
    for (const row of prevImpressionsResult.data as Record<string, number>[]) {
      prevImpressions += Number(row.impressions) || 0
    }
  }

  const leadsInPeriod = leadsInPeriodResult.count || 0
  const prevLeadsCount = prevLeadsInPeriodResult.count || 0
  const qualifiedLeads = qualifiedLeadsResult.count || 0
  const prevQualifiedLeads = prevQualifiedLeadsResult.count || 0
  const opportunities = opportunitiesResult.count || 0
  const prevOpportunities = prevOpportunitiesResult.count || 0
  const sales = salesResult.count || 0
  const prevSales = prevSalesResult.count || 0

  let salesValue = 0
  if (salesValueResult.data && Array.isArray(salesValueResult.data)) {
    for (const deal of salesValueResult.data as Record<string, number>[]) {
      salesValue += Number(deal.value) || 0
    }
  }

  // Daily leads aggregation
  function aggregateDailyLeads(rows: Record<string, string>[] | null): { date: string; count: number; cumulative: number }[] {
    if (!rows || !Array.isArray(rows)) return []
    const dayMap = new Map<string, number>()
    for (const row of rows) {
      const day = (row.created_at || '').slice(0, 10) // YYYY-MM-DD
      dayMap.set(day, (dayMap.get(day) || 0) + 1)
    }
    const sorted = Array.from(dayMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    let cumulative = 0
    return sorted.map(([date, count]) => {
      cumulative += count
      return { date, count, cumulative }
    })
  }

  const dailyLeads = aggregateDailyLeads(dailyLeadsResult.data)
  const prevDailyLeads = aggregateDailyLeads(prevDailyLeadsResult.data)

  // Latest leads
  const latestLeads = ((latestLeadsResult.data as Record<string, unknown>[] | null) || []).map((lead) => ({
    id: lead.id as string,
    email: lead.email as string,
    first_name: lead.first_name as string | null,
    last_name: lead.last_name as string | null,
    company: lead.company as string | null,
    position: lead.position as string | null,
    source: lead.source as string | null,
    created_at: lead.created_at as string,
    custom_fields: lead.custom_fields as Record<string, unknown> | null,
  }))

  return {
    totalLeads,
    totalCampaigns,
    totalEmailsSent,
    totalOpened,
    totalClicked,
    totalDelivered,
    openRate,
    clickRate,
    totalLandingPages: landingPagesResult.count || 0,
    totalForms: formsResult.count || 0,
    totalFormSubmissions: formSubmissionsResult.count || 0,
    totalTemplates: templatesResult.count || 0,
    totalSegments: segmentsResult.count || 0,
    activeCampaigns: activeCampaignsResult.count || 0,
    recentCampaigns,
    recentLeads,
    leadsThisMonth: leadsThisMonthResult.count || 0,
    leadsByStatus,
    leadsBySource,
    postsThisMonth: postsThisMonthResult.count || 0,
    totalPostsGenerated: totalPostsResult.count || 0,
    activeAdCampaigns: activeAdCampaignsResult.count || 0,
    totalAdSpend,
    leadsFromAds,
    openDeals: openDealsResult.count || 0,
    wonDealsThisMonth: wonDealsResult.count || 0,
    pipelineValue,
    totalAutomations: totalAutomationsResult.count || 0,
    activeAutomations: activeAutomationsResult.count || 0,
    // NEW: LP, Email, Pages
    lastLP,
    lastEmailCampaign,
    topPages,
    // NEW: Funnel
    impressions,
    qualifiedLeads,
    opportunities,
    sales,
    salesValue,
    prevImpressions,
    prevLeads: prevLeadsCount,
    prevQualifiedLeads,
    prevOpportunities,
    prevSales,
    dailyLeads,
    prevDailyLeads,
    latestLeads,
  }
}
