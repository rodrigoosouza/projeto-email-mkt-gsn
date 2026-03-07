import { createClient } from './client'

export interface DashboardData {
  totalLeads: number
  totalCampaigns: number
  totalEmailsSent: number
  totalOpened: number
  totalClicked: number
  totalDelivered: number
  openRate: number
  clickRate: number
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
}

export async function getDashboardData(orgId: string): Promise<DashboardData> {
  const supabase = createClient()

  const [leadsResult, campaignsResult, statsResult, recentLeadsResult, recentCampaignsResult] =
    await Promise.all([
      // Total leads count
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId),
      // Total campaigns count
      supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId),
      // Aggregate stats from all campaign_stats (join through campaigns)
      supabase
        .from('campaigns')
        .select('id, campaign_stats(total_sent, total_delivered, total_opened, total_clicked)')
        .eq('org_id', orgId),
      // Recent 5 leads
      supabase
        .from('leads')
        .select('id, email, first_name, last_name, status, created_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(5),
      // Recent 5 campaigns with stats
      supabase
        .from('campaigns')
        .select(
          'id, name, status, total_leads, sent_at, created_at, campaign_stats(total_sent, total_opened, total_clicked)'
        )
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

  const totalLeads = leadsResult.count || 0
  const totalCampaigns = campaignsResult.count || 0

  // Aggregate stats
  let totalEmailsSent = 0
  let totalDelivered = 0
  let totalOpened = 0
  let totalClicked = 0

  if (statsResult.data) {
    for (const campaign of statsResult.data) {
      const stats = (campaign as Record<string, unknown>).campaign_stats as Record<string, number>[] | undefined
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
  const recentCampaigns = (recentCampaignsResult.data || []).map((c) => {
    const campaign = c as Record<string, unknown>
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

  const recentLeads = (recentLeadsResult.data || []).map((l) => {
    const lead = l as Record<string, unknown>
    return {
      id: lead.id as string,
      email: lead.email as string,
      first_name: lead.first_name as string | null,
      last_name: lead.last_name as string | null,
      status: lead.status as string,
      created_at: lead.created_at as string,
    }
  })

  return {
    totalLeads,
    totalCampaigns,
    totalEmailsSent,
    totalOpened,
    totalClicked,
    totalDelivered,
    openRate,
    clickRate,
    recentCampaigns,
    recentLeads,
  }
}
