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

    // Normalize phone: strip all non-digit characters, generate clean variants
    // IMPORTANT: PostgREST .or() breaks with parentheses/spaces in values
    const phoneVariants: string[] = []
    if (decodedPhone) {
      // Strip ALL formatting: (19) 99602-2561 → 19996022561
      const digits = decodedPhone.replace(/\D/g, '')
      if (digits) {
        phoneVariants.push(digits)
        // Add +55 variant
        if (!digits.startsWith('55')) {
          phoneVariants.push(`+55${digits}`)
          phoneVariants.push(`55${digits}`)
        }
        // If starts with 55, add without country code
        if (digits.startsWith('55') && digits.length > 11) {
          phoneVariants.push(`+${digits}`)
          phoneVariants.push(digits.slice(2))
        }
      }
      // Also add original ONLY if it has no special PostgREST chars
      if (!/[(),]/.test(decodedPhone) && !phoneVariants.includes(decodedPhone)) {
        phoneVariants.push(decodedPhone)
      }
    }
    console.log(`[Tracking API] Phone variants:`, phoneVariants)

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

    // Step 1: Find client_ids associated with this email/phone
    // Most events (page_view, scroll, etc) do NOT have email — only generate_lead does
    // So we first find the client_id from events that DO have the email,
    // then fetch ALL events for those client_ids
    const clientIdResults = await Promise.all(
      orgTablesList.map(async (tables) => {
        const orFilters: string[] = []
        if (decodedEmail) orFilters.push(`email.eq.${decodedEmail}`)
        for (const pv of phoneVariants) orFilters.push(`phone.eq.${pv}`)
        if (orFilters.length === 0) return []

        const { data, error } = await tracking
          .from(tables.events)
          .select('client_id')
          .or(orFilters.join(','))
          .not('client_id', 'is', null)
          .limit(50)
        if (error) {
          console.error(`[Tracking API] Error finding client_ids in ${tables.events}:`, error.message)
        }
        return { tables, clientIds: Array.from(new Set((data || []).map((r: any) => r.client_id).filter(Boolean))) }
      })
    )

    // Step 2: Fetch ALL events for found client_ids (this gets the full journey)
    const eventResults = await Promise.all(
      clientIdResults.map(async (result: any) => {
        if (!result || !result.clientIds || result.clientIds.length === 0) {
          // Fallback: still try email/phone direct match
          const orFilters: string[] = []
          if (decodedEmail) orFilters.push(`email.eq.${decodedEmail}`)
          for (const pv of phoneVariants) orFilters.push(`phone.eq.${pv}`)
          if (orFilters.length === 0) return []

          const { data } = await tracking
            .from(result.tables.events)
            .select('*')
            .or(orFilters.join(','))
            .order('created_at', { ascending: true })
            .limit(500)
          return data || []
        }

        // Query by client_id — this gets ALL page_views, scrolls, etc
        const { data, error } = await tracking
          .from(result.tables.events)
          .select('*')
          .in('client_id', result.clientIds)
          .order('created_at', { ascending: true })
          .limit(1000)
        if (error) {
          console.error(`[Tracking API] Error querying ${result.tables.events} by client_id:`, error.message)
        }
        return data || []
      })
    )
    const events = eventResults.flat().sort(
      (a: any, b: any) => (a.created_at || '').localeCompare(b.created_at || '')
    )

    const clientIds = clientIdResults.flatMap((r: any) => r?.clientIds || [])
    console.log(`[Tracking API] email=${decodedEmail}, phone=${decodedPhone}, clientIds=${clientIds.length}, lead=${!!lead}, events=${events.length}, tables=${orgTablesList.map(t => t.events).join(',')}`)

    return NextResponse.json({ lead, events })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Tracking API] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
