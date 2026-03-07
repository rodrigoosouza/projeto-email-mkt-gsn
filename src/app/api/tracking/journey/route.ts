import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { TRACKING_ORGANIZATIONS, getAllOrgTables } from '@/lib/tracking/organizations'
import type { OrgTables } from '@/lib/tracking/organizations'

// Separate client for legacy tracking tables — uses anon key without user session
// Legacy tables (events, conversions, lead_journey) don't have org_id-based RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

function createTrackingClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET(req: NextRequest) {
  try {
    // Auth check — user must be logged in
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = req.nextUrl.searchParams.get('email')
    const orgSlug = req.nextUrl.searchParams.get('orgSlug')

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Determine which org tables to query
    let orgTablesList: OrgTables[]
    if (orgSlug) {
      const org = TRACKING_ORGANIZATIONS.find(
        (o) => o.id === orgSlug || o.name.toLowerCase().includes(orgSlug.toLowerCase())
      )
      orgTablesList = org ? [org.tables] : getAllOrgTables()
    } else {
      orgTablesList = getAllOrgTables()
    }

    const decodedEmail = decodeURIComponent(email)
    const tracking = createTrackingClient()

    // Query lead_journey views across all org tables
    const leadResults = await Promise.all(
      orgTablesList.map(async (tables) => {
        const { data, error } = await tracking
          .from(tables.leadJourney)
          .select('*')
          .eq('email', decodedEmail)
          .limit(1)
        if (error) {
          console.error(`[Tracking API] Error querying ${tables.leadJourney}:`, error.message)
        }
        return data || []
      })
    )
    const lead = leadResults.flat()[0] || null

    // Query events tables across all org tables
    const eventResults = await Promise.all(
      orgTablesList.map(async (tables) => {
        const { data, error } = await tracking
          .from(tables.events)
          .select('*')
          .eq('email', decodedEmail)
          .order('created_at', { ascending: true })
          .limit(500)
        if (error) {
          console.error(`[Tracking API] Error querying ${tables.events}:`, error.message)
        }
        return data || []
      })
    )
    const events = eventResults.flat().sort(
      (a: any, b: any) => (a.created_at || '').localeCompare(b.created_at || '')
    )

    console.log(`[Tracking API] email=${decodedEmail}, lead=${!!lead}, events=${events.length}, tables=${orgTablesList.map(t => t.events).join(',')}`)

    return NextResponse.json({ lead, events })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Tracking API] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
