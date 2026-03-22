import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { getTrackingOrgByOrgId } from '@/lib/tracking/organizations'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

function createTrackingClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const email = req.nextUrl.searchParams.get('email')
    const phone = req.nextUrl.searchParams.get('phone')
    const orgId = req.nextUrl.searchParams.get('orgId')

    if (!email && !phone) {
      return NextResponse.json({ error: 'email or phone required' }, { status: 400 })
    }
    if (!orgId) {
      return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    }

    const trackingOrg = getTrackingOrgByOrgId(orgId)
    if (!trackingOrg) {
      return NextResponse.json({ error: 'No tracking configured for this org' }, { status: 404 })
    }

    const tracking = createTrackingClient()
    const eventsTable = trackingOrg.tables.events

    // Step 1: Find session_ids where this lead converted (generate_lead event)
    let sessionsQuery = tracking
      .from(eventsTable)
      .select('session_id, email, phone, created_at, utm_source, utm_medium, utm_campaign, utm_term, utm_content, landing_page, geo_state, geo_city')
      .eq('event_name', 'generate_lead')

    if (email) {
      sessionsQuery = sessionsQuery.ilike('email', email)
    } else if (phone) {
      sessionsQuery = sessionsQuery.ilike('phone', `%${phone!.replace(/\D/g, '').slice(-8)}%`)
    }

    const { data: leadEvents, error: leadErr } = await sessionsQuery.limit(20)
    if (leadErr) throw leadErr

    if (!leadEvents || leadEvents.length === 0) {
      // Try matching by phone in various formats
      if (phone) {
        const digits = phone.replace(/\D/g, '')
        const { data: phoneMatch } = await tracking
          .from(eventsTable)
          .select('session_id, email, phone, created_at, utm_source, utm_medium, utm_campaign, utm_term, landing_page')
          .eq('event_name', 'generate_lead')
          .ilike('phone', `%${digits.slice(-9)}%`)
          .limit(20)

        if (!phoneMatch || phoneMatch.length === 0) {
          return NextResponse.json({ sessions: [], summary: null })
        }
        // Continue with phone match
        return await buildJourney(tracking, eventsTable, phoneMatch)
      }
      return NextResponse.json({ sessions: [], summary: null })
    }

    return await buildJourney(tracking, eventsTable, leadEvents)
  } catch (err: any) {
    console.error('Lead journey error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function buildJourney(tracking: any, eventsTable: string, leadEvents: any[]) {
  // Get unique session IDs
  const sessionIds = Array.from(new Set(leadEvents.map((e: any) => e.session_id).filter(Boolean)))

  if (sessionIds.length === 0) {
    return NextResponse.json({ sessions: [], summary: null })
  }

  // Step 2: Get ALL events for these sessions
  const { data: allEvents, error: eventsErr } = await tracking
    .from(eventsTable)
    .select('event_name, page_path, page_hostname, scroll_depth, time_on_page, utm_source, utm_medium, utm_campaign, utm_term, utm_content, landing_page, referrer, geo_state, geo_city, created_at, session_id')
    .in('session_id', sessionIds)
    .order('created_at', { ascending: true })
    .limit(500)

  if (eventsErr) throw eventsErr

  // Step 3: Group by session
  const sessionMap = new Map<string, any[]>()
  allEvents?.forEach((e: any) => {
    const list = sessionMap.get(e.session_id) || []
    list.push(e)
    sessionMap.set(e.session_id, list)
  })

  // Step 4: Build session summaries
  const sessions = sessionIds.map((sid) => {
    const events = sessionMap.get(sid) || []
    const pageViews = events.filter((e: any) => e.event_name === 'page_view')
    const leadEvent = events.find((e: any) => e.event_name === 'generate_lead')
    const scrollEvents = events.filter((e: any) => e.event_name === 'scroll_depth')
    const heartbeats = events.filter((e: any) => e.event_name === 'time_on_page_heartbeat')

    const maxTime = Math.max(0, ...events.map((e: any) => e.time_on_page || 0))
    const maxScroll = Math.max(0, ...scrollEvents.map((e: any) => parseInt(e.scroll_depth || '0', 10)))
    const firstEvent = events[0]
    const pagesVisited = Array.from(new Set(pageViews.map((e: any) => e.page_path).filter(Boolean)))

    return {
      session_id: sid,
      started_at: firstEvent?.created_at,
      converted_at: leadEvent?.created_at,
      utm_source: firstEvent?.utm_source || leadEvent?.utm_source,
      utm_medium: firstEvent?.utm_medium || leadEvent?.utm_medium,
      utm_campaign: firstEvent?.utm_campaign || leadEvent?.utm_campaign,
      utm_term: firstEvent?.utm_term || leadEvent?.utm_term,
      utm_content: firstEvent?.utm_content || leadEvent?.utm_content,
      landing_page: firstEvent?.landing_page || firstEvent?.page_path,
      referrer: firstEvent?.referrer,
      geo_state: firstEvent?.geo_state || leadEvent?.geo_state,
      geo_city: firstEvent?.geo_city || leadEvent?.geo_city,
      pages_visited: pagesVisited,
      page_views: pageViews.length,
      time_on_page: maxTime,
      max_scroll: maxScroll,
      total_events: events.length,
      events: events.filter((e: any) => e.event_name !== 'time_on_page_heartbeat'), // exclude heartbeats from detail
    }
  }).sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())

  // Summary
  const summary = {
    total_sessions: sessions.length,
    total_page_views: sessions.reduce((s, ss) => s + ss.page_views, 0),
    avg_time_on_page: sessions.length > 0
      ? Math.round(sessions.reduce((s, ss) => s + ss.time_on_page, 0) / sessions.length)
      : 0,
    sources: Array.from(new Set(sessions.map((s) => s.utm_source).filter(Boolean))),
    pages: Array.from(new Set(sessions.flatMap((s) => s.pages_visited))),
  }

  return NextResponse.json({ sessions, summary })
}
