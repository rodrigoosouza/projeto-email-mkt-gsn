import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { TRACKING_ORGANIZATIONS, getAllOrgTables, findTrackingOrgBySlug } from '@/lib/tracking/organizations'
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
    const phone = req.nextUrl.searchParams.get('phone')
    const orgSlug = req.nextUrl.searchParams.get('orgSlug')

    if (!email && !phone) {
      return NextResponse.json({ error: 'Email or phone is required' }, { status: 400 })
    }

    // Determine which org tables to query
    let orgTablesList: OrgTables[]
    if (orgSlug) {
      const org = findTrackingOrgBySlug(orgSlug)
      orgTablesList = org ? [org.tables] : getAllOrgTables()
    } else {
      orgTablesList = getAllOrgTables()
    }

    const decodedEmail = email ? decodeURIComponent(email) : null
    const decodedPhone = phone ? decodeURIComponent(phone) : null

    // Normalize phone variants for matching (e.g. "19996022561" → also try "+5519996022561")
    const phoneVariants: string[] = []
    if (decodedPhone) {
      phoneVariants.push(decodedPhone)
      // If no country code, add +55 variant
      if (!decodedPhone.startsWith('+')) {
        phoneVariants.push(`+55${decodedPhone}`)
      }
      // If starts with +55, add without country code
      if (decodedPhone.startsWith('+55')) {
        phoneVariants.push(decodedPhone.slice(3))
      }
      // If starts with 55 (no +), add with + and without
      if (decodedPhone.startsWith('55') && !decodedPhone.startsWith('+') && decodedPhone.length > 11) {
        phoneVariants.push(`+${decodedPhone}`)
        phoneVariants.push(decodedPhone.slice(2))
      }
    }

    const tracking = createTrackingClient()

    // Query lead_journey views across all org tables (by email or phone)
    const leadResults = await Promise.all(
      orgTablesList.map(async (tables) => {
        // Try email first
        if (decodedEmail) {
          const { data, error } = await tracking
            .from(tables.leadJourney)
            .select('*')
            .eq('email', decodedEmail)
            .limit(1)
          if (error) {
            console.error(`[Tracking API] Error querying ${tables.leadJourney}:`, error.message)
          }
          if (data && data.length > 0) return data
        }
        // Fallback: try phone variants
        if (phoneVariants.length > 0) {
          const { data, error } = await tracking
            .from(tables.leadJourney)
            .select('*')
            .in('phone', phoneVariants)
            .limit(1)
          if (error) {
            console.error(`[Tracking API] Error querying ${tables.leadJourney} by phone:`, error.message)
          }
          if (data && data.length > 0) return data
        }
        return []
      })
    )
    const lead = leadResults.flat()[0] || null

    // Query events tables across all org tables (by email or phone)
    const eventResults = await Promise.all(
      orgTablesList.map(async (tables) => {
        // Build OR filter for email + phone variants
        const orFilters: string[] = []
        if (decodedEmail) {
          orFilters.push(`email.eq.${decodedEmail}`)
        }
        for (const pv of phoneVariants) {
          orFilters.push(`phone.eq.${pv}`)
        }

        if (orFilters.length === 0) return []

        const { data, error } = await tracking
          .from(tables.events)
          .select('*')
          .or(orFilters.join(','))
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

    console.log(`[Tracking API] email=${decodedEmail}, phone=${decodedPhone}, lead=${!!lead}, events=${events.length}, tables=${orgTablesList.map(t => t.events).join(',')}`)

    return NextResponse.json({ lead, events })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Tracking API] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
