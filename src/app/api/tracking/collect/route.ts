import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      body = await req.json()
    } else {
      const text = await req.text()
      body = JSON.parse(text)
    }

    const {
      org_id,
      session_id,
      visitor_id,
      event,
      page,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      device,
      scroll_depth,
      duration,
      pages_viewed,
    } = body as Record<string, string | number | null>

    if (!org_id || !session_id || !event) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()

    if (event === 'pageview') {
      // Upsert session
      await supabase.from('visitor_sessions').upsert(
        {
          org_id,
          session_id,
          visitor_id,
          landing_page: page,
          referrer: referrer || null,
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null,
          device_type: device || null,
          pages_viewed: pages_viewed || 1,
          max_scroll_depth: Number(scroll_depth) || 0,
          duration_seconds: Number(duration) || 0,
          started_at: new Date().toISOString(),
        },
        { onConflict: 'org_id,session_id', ignoreDuplicates: false }
      )

      // Upsert page analytics
      const today = new Date().toISOString().split('T')[0]
      const { data: existing } = await supabase
        .from('page_analytics')
        .select('id, views')
        .eq('org_id', org_id as string)
        .eq('page_path', page as string)
        .eq('date', today)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('page_analytics')
          .update({ views: existing.views + 1 })
          .eq('id', existing.id)
      } else {
        await supabase.from('page_analytics').insert({
          org_id,
          page_path: page,
          views: 1,
          unique_visitors: 1,
          date: today,
        })
      }
    } else if (event === 'session_end' || event === 'heartbeat') {
      // Update session data
      await supabase
        .from('visitor_sessions')
        .update({
          max_scroll_depth: Number(scroll_depth) || 0,
          duration_seconds: Number(duration) || 0,
          pages_viewed: Number(pages_viewed) || 1,
          ended_at: event === 'session_end' ? new Date().toISOString() : undefined,
        })
        .eq('org_id', org_id as string)
        .eq('session_id', session_id as string)
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('[Tracking Collect] Error:', error)
    return new NextResponse(null, { status: 204 }) // Don't break client
  }
}
