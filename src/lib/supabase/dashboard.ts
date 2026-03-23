import { createClient } from './client'

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

export async function getDashboardData(orgId: string): Promise<DashboardData> {
  const supabase = createClient()

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    leadsResult, campaignsResult, statsResult, recentLeadsResult, recentCampaignsResult,
    landingPagesResult, formsResult, formSubmissionsResult, templatesResult, segmentsResult, activeCampaignsResult,
    // New queries
    leadsThisMonthResult, leadsActiveResult, leadsUnsubResult, leadsBouncedResult, leadsComplainedResult,
    postsThisMonthResult, totalPostsResult,
    activeAdCampaignsResult, adInsightsResult,
    openDealsResult, wonDealsResult, pipelineValueResult,
    totalAutomationsResult, activeAutomationsResult,
  ] = await Promise.all([
      // Total leads count
      safeQuery(supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)),
      // Total campaigns count
      safeQuery(supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)),
      // Aggregate stats from all campaign_stats (join through campaigns)
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
        .select(
          'id, name, status, total_leads, sent_at, created_at, campaign_stats(total_sent, total_opened, total_clicked)'
        )
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(5)),
      // Landing pages count
      safeQuery(supabase
        .from('landing_pages')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)),
      // Forms count
      safeQuery(supabase
        .from('forms')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)),
      // Form submissions count
      safeQuery(supabase
        .from('form_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)),
      // Templates count
      safeQuery(supabase
        .from('email_templates')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)),
      // Segments count
      safeQuery(supabase
        .from('segments')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)),
      // Active campaigns count
      safeQuery(supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .in('status', ['sending', 'scheduled'])),
      // --- NEW: Leads this month ---
      safeQuery(supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('created_at', firstOfMonth)),
      // Leads by status: active
      safeQuery(supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', 'active')),
      // Leads by status: unsubscribed
      safeQuery(supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', 'unsubscribed')),
      // Leads by status: bounced
      safeQuery(supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', 'bounced')),
      // Leads by status: complained
      safeQuery(supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', 'complained')),
      // --- NEW: Content Calendar ---
      safeQuery(supabase
        .from('content_calendar')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('scheduled_date', firstOfMonth)
        .lte('scheduled_date', now.toISOString())),
      safeQuery(supabase
        .from('content_calendar')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)),
      // --- NEW: Ads ---
      safeQuery(supabase
        .from('meta_campaign_insights')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)),
      safeQuery(supabase
        .from('meta_campaign_insights')
        .select('spend, leads')
        .eq('org_id', orgId)),
      // --- NEW: CRM Pipedrive ---
      safeQuery(supabase
        .from('pipedrive_deals')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', 'open')),
      safeQuery(supabase
        .from('pipedrive_deals')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', 'won')
        .gte('won_time', firstOfMonth)),
      safeQuery(supabase
        .from('pipedrive_deals')
        .select('value')
        .eq('org_id', orgId)
        .eq('status', 'open')),
      // --- NEW: Automations ---
      safeQuery(supabase
        .from('automation_flows')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)),
      safeQuery(supabase
        .from('automation_flows')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('is_active', true)),
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

  const openRate =
    totalDelivered > 0 ? Math.round((totalOpened / totalDelivered) * 100) : 0
  const clickRate =
    totalDelivered > 0 ? Math.round((totalClicked / totalDelivered) * 100) : 0

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
    // New fields
    leadsThisMonth: leadsThisMonthResult.count || 0,
    leadsByStatus,
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
  }
}
