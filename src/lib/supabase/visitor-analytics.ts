import { createClient } from './client'

export interface VisitorSession {
  id: string
  org_id: string
  session_id: string
  visitor_id: string | null
  landing_page: string | null
  referrer: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  device_type: 'desktop' | 'mobile' | 'tablet' | null
  browser: string | null
  country: string | null
  city: string | null
  pages_viewed: number
  max_scroll_depth: number
  duration_seconds: number
  events_count: number
  started_at: string
  ended_at: string | null
  created_at: string
}

export interface PageAnalytics {
  id: string
  org_id: string
  page_path: string
  views: number
  unique_visitors: number
  avg_scroll_depth: number
  avg_time_seconds: number
  bounce_rate: number
  date: string
  created_at: string
}

export interface VisitorAnalyticsSummary {
  totalSessions: number
  totalPageViews: number
  avgDuration: number
  avgScrollDepth: number
  bounceRate: number
  topPages: PageAnalytics[]
  recentSessions: VisitorSession[]
  deviceBreakdown: { desktop: number; mobile: number; tablet: number }
  sourceBreakdown: { source: string; count: number }[]
}

export async function getVisitorSessions(orgId: string, options?: { limit?: number; from?: string; to?: string }) {
  const supabase = createClient()
  let query = supabase
    .from('visitor_sessions')
    .select('*')
    .eq('org_id', orgId)
    .order('started_at', { ascending: false })
    .limit(options?.limit || 50)

  if (options?.from) {
    query = query.gte('started_at', options.from)
  }
  if (options?.to) {
    query = query.lte('started_at', options.to)
  }

  const { data, error } = await query
  if (error) throw error
  return data as VisitorSession[]
}

export async function getPageAnalytics(orgId: string, options?: { from?: string; to?: string }) {
  const supabase = createClient()
  let query = supabase
    .from('page_analytics')
    .select('*')
    .eq('org_id', orgId)
    .order('views', { ascending: false })

  if (options?.from) {
    query = query.gte('date', options.from)
  }
  if (options?.to) {
    query = query.lte('date', options.to)
  }

  const { data, error } = await query
  if (error) throw error
  return data as PageAnalytics[]
}

export async function getAnalyticsSummary(orgId: string, days: number = 30): Promise<VisitorAnalyticsSummary> {
  const supabase = createClient()
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - days)
  const from = fromDate.toISOString()

  const [sessionsResult, pagesResult] = await Promise.all([
    supabase
      .from('visitor_sessions')
      .select('*')
      .eq('org_id', orgId)
      .gte('started_at', from)
      .order('started_at', { ascending: false })
      .limit(200),
    supabase
      .from('page_analytics')
      .select('*')
      .eq('org_id', orgId)
      .gte('date', fromDate.toISOString().split('T')[0])
      .order('views', { ascending: false }),
  ])

  const sessions = (sessionsResult.data || []) as VisitorSession[]
  const pages = (pagesResult.data || []) as PageAnalytics[]

  const totalSessions = sessions.length
  const totalPageViews = sessions.reduce((sum, s) => sum + s.pages_viewed, 0)
  const avgDuration = totalSessions > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.duration_seconds, 0) / totalSessions)
    : 0
  const avgScrollDepth = totalSessions > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.max_scroll_depth, 0) / totalSessions)
    : 0
  const bounceRate = totalSessions > 0
    ? Math.round((sessions.filter((s) => s.pages_viewed <= 1).length / totalSessions) * 100)
    : 0

  const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 }
  sessions.forEach((s) => {
    if (s.device_type && s.device_type in deviceCounts) {
      deviceCounts[s.device_type as keyof typeof deviceCounts]++
    }
  })

  const sourceCounts: Record<string, number> = {}
  sessions.forEach((s) => {
    let source = s.utm_source || 'direto'
    if (!s.utm_source && s.referrer) {
      try {
        source = new URL(s.referrer).hostname
      } catch {
        source = 'direto'
      }
    }
    sourceCounts[source] = (sourceCounts[source] || 0) + 1
  })
  const sourceBreakdown = Object.entries(sourceCounts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Aggregate pages by path across dates
  const pageMap: Record<string, PageAnalytics> = {}
  pages.forEach((p) => {
    if (!pageMap[p.page_path]) {
      pageMap[p.page_path] = { ...p }
    } else {
      pageMap[p.page_path].views += p.views
      pageMap[p.page_path].unique_visitors += p.unique_visitors
    }
  })
  const topPages = Object.values(pageMap).sort((a, b) => b.views - a.views).slice(0, 10)

  return {
    totalSessions,
    totalPageViews,
    avgDuration,
    avgScrollDepth,
    bounceRate,
    topPages,
    recentSessions: sessions.slice(0, 20),
    deviceBreakdown: deviceCounts,
    sourceBreakdown,
  }
}
