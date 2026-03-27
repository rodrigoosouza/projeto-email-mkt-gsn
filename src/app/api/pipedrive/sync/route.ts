import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  PipedriveConfig,
  getDeals,
  getStages,
  extractPersonEmail,
  extractPersonPhone,
  extractPersonName,
  extractOrgName,
} from '@/lib/pipedrive/client'

export const maxDuration = 120

// ===== Core sync logic =====
async function syncPipedrive(
  admin: SupabaseClient,
  orgId: string,
  connection: any,
  syncType: 'deals' | 'stages' | 'full',
) {
  const config: PipedriveConfig = {
    api_token: connection.api_token,
    filter_id: connection.filter_id,
  }

  const startTime = Date.now()

  // Create sync log
  const { data: syncLog } = await admin
    .from('pipedrive_sync_logs')
    .insert({
      org_id: orgId,
      sync_type: syncType,
      status: 'running',
    })
    .select('id')
    .single()

  const syncLogId = syncLog?.id
  let totalSynced = 0

  try {
    // ===== SYNC STAGES =====
    if (syncType === 'stages' || syncType === 'full') {
      const stages = await getStages(config, connection.pipeline_id || undefined)

      for (const stage of stages) {
        await admin
          .from('pipedrive_stages')
          .upsert({
            org_id: orgId,
            stage_id: stage.id,
            pipeline_id: stage.pipeline_id,
            pipeline_name: connection.pipeline_name || stage.pipeline_name || null,
            name: stage.name,
            order_nr: stage.order_nr,
            deal_probability: stage.deal_probability,
            active_flag: stage.active_flag,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'org_id,stage_id' })
        totalSynced++
      }
    }

    // ===== SYNC DEALS =====
    if (syncType === 'deals' || syncType === 'full') {
      const deals = await getDeals(config)

      // Load stage names for mapping
      const { data: stagesData } = await admin
        .from('pipedrive_stages')
        .select('stage_id, name')
        .eq('org_id', orgId)

      const stageMap = new Map<number, string>()
      stagesData?.forEach((s: any) => stageMap.set(s.stage_id, s.name))

      for (const deal of deals) {
        const personEmail = extractPersonEmail(deal)
        const personPhone = extractPersonPhone(deal)
        const personName = extractPersonName(deal)
        const orgName = extractOrgName(deal)

        await admin
          .from('pipedrive_deals')
          .upsert({
            org_id: orgId,
            deal_id: deal.id,
            title: deal.title,
            value: deal.value || 0,
            currency: deal.currency || 'BRL',
            status: deal.status, // open, won, lost, deleted
            stage_id: deal.stage_id,
            stage_name: stageMap.get(deal.stage_id) || deal.stage_order_nr?.toString() || null,
            pipeline_id: deal.pipeline_id,
            pipeline_name: connection.pipeline_name || null,
            person_id: deal.person_id?.value || deal.person_id || null,
            person_name: personName,
            person_email: personEmail,
            person_phone: personPhone,
            org_name: orgName,
            owner_name: deal.owner_name || deal.user_id?.name || null,
            add_time: deal.add_time || null,
            update_time: deal.update_time || null,
            close_time: deal.close_time || null,
            won_time: deal.won_time || null,
            lost_time: deal.lost_time || null,
            lost_reason: deal.lost_reason || null,
            expected_close_date: deal.expected_close_date || null,
            probability: deal.probability || null,
            label: deal.label || null,
            // UTM fields (Pipedrive custom field hashes)
            utm_source: deal['92f5fbfb2cfdcbe4d46a72b5acf06ca15f29ac14'] || deal['06754c74401e609e506d01d3a928f8d3025ad43e'] || null,
            utm_medium: deal['15bdeb9558dc89ed77d92cbfa0d04a4ee26d4d1f'] || deal['a335961b5cded844362e09480b5ca68048e33404'] || null,
            utm_campaign: deal['6b578f95362c28ee95473982525671ff43435b38'] || deal['6bc82d18de3ae4574c4f8b8185a1dfa7e43cd5d0'] || null,
            utm_content: deal['921482eae8dae5a8b2c830100038a17801df8b45'] || deal['ba178b2651759509012cfad3beac506f51d12a27'] || null,
            utm_term: deal['5c22fd65ac5f7dbfbef6c07347fde9154bcdc385'] || deal['3ba67d7950d346b4b6dd0d4bbb8974a007a53aee'] || null,
            fbclid: deal['143f49947826ce1d1b3e995baa842e96de518e74'] || null,
            raw_data: deal,
            synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'org_id,deal_id' })
        totalSynced++
      }
    }

    // ===== AUTO-CREATE LEADS from new Pipedrive deals =====
    if (syncType === 'deals' || syncType === 'full') {
      try {
        // Get all deals with email
        const { data: allDeals } = await admin
          .from('pipedrive_deals')
          .select('deal_id,person_name,person_email,person_phone,org_name,owner_name,stage_name,status,utm_source,utm_medium,utm_campaign,utm_content,utm_term,add_time,update_time')
          .eq('org_id', orgId)
          .not('person_email', 'is', null)

        if (allDeals && allDeals.length > 0) {
          // Get existing lead emails to avoid duplicates
          const { data: existingLeads } = await admin
            .from('leads')
            .select('email')
            .eq('org_id', orgId)

          const existingEmails = new Set((existingLeads || []).map(l => l.email?.toLowerCase()))

          // Create leads for deals that don't have a matching lead
          const newLeads = allDeals
            .filter(d => d.person_email && !existingEmails.has(d.person_email.toLowerCase()))
            .map(d => {
              const nameParts = (d.person_name || '').split(' ')
              const firstName = nameParts[0] || null
              const lastName = nameParts.slice(1).join(' ') || null

              return {
                org_id: orgId,
                email: d.person_email,
                first_name: firstName,
                last_name: lastName,
                phone: d.person_phone || null,
                company: d.org_name || null,
                source: d.utm_source || 'pipedrive',
                external_id: String(d.deal_id),
                created_at: d.add_time || new Date().toISOString(),
                updated_at: d.update_time || d.add_time || new Date().toISOString(),
                custom_fields: {
                  ...(d.utm_source ? { utm_source: d.utm_source } : {}),
                  ...(d.utm_medium ? { utm_medium: d.utm_medium } : {}),
                  ...(d.utm_campaign ? { utm_campaign: d.utm_campaign } : {}),
                  ...(d.utm_content ? { utm_content: d.utm_content } : {}),
                  ...(d.utm_term ? { utm_term: d.utm_term } : {}),
                  ...(d.owner_name ? { deal_owner: d.owner_name } : {}),
                  ...(d.stage_name ? { deal_stage: d.stage_name } : {}),
                  ...(d.status ? { deal_status: d.status } : {}),
                  deal_id: d.deal_id,
                  pipedrive_deal_id: d.deal_id,
                },
              }
            })

          if (newLeads.length > 0) {
            // Batch upsert (onConflict handles duplicates)
            const { error: insertError } = await admin
              .from('leads')
              .upsert(newLeads, { onConflict: 'org_id,email', ignoreDuplicates: true })

            if (insertError) {
              console.warn('[Pipedrive Sync] Lead creation error (non-fatal):', insertError.message)
            } else {
              console.log(`[Pipedrive Sync] Created ${newLeads.length} new leads from Pipedrive deals`)

              // Log events for newly created leads
              try {
                const { data: createdLeads } = await admin
                  .from('leads')
                  .select('id, email, first_name, company, source')
                  .eq('org_id', orgId)
                  .in('email', newLeads.map(l => l.email).filter(Boolean))

                if (createdLeads && createdLeads.length > 0) {
                  const events = createdLeads.map(l => ({
                    org_id: orgId,
                    lead_id: l.id,
                    event_type: 'custom',
                    title: 'Lead criado via Pipedrive Sync',
                    description: `${l.first_name || ''} — ${l.company || l.source || 'Pipedrive'}`,
                    metadata: { action: 'create', source: l.source, webhook_source: 'pipedrive_sync' },
                  }))
                  // Batch insert events (max 100 to avoid payload limits)
                  for (let e = 0; e < events.length; e += 100) {
                    await admin.from('lead_events').insert(events.slice(e, e + 100))
                  }
                }
              } catch { /* non-fatal */ }
            }
          }
        }
      } catch (leadCreateError) {
        console.warn('[Pipedrive Sync] Auto lead creation error (non-fatal):', leadCreateError)
      }
    }

    // ===== AUTO-PARSE NOTES for leads with empty fields =====
    if (syncType === 'deals' || syncType === 'full') {
      try {
        // Find leads with empty fields that have matching Pipedrive deals
        const { data: leadsToEnrich } = await admin
          .from('leads')
          .select('id, email, first_name, last_name, company, position, phone')
          .eq('org_id', orgId)
          .or('company.is.null,position.is.null,phone.is.null')
          .limit(20)

        if (leadsToEnrich && leadsToEnrich.length > 0) {
          // Fire-and-forget: trigger note parsing in background via internal API
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : ''

          if (baseUrl) {
            for (const lead of leadsToEnrich) {
              // Match lead to a deal
              const { data: matchingDeal } = await admin
                .from('pipedrive_deals')
                .select('deal_id')
                .eq('org_id', orgId)
                .eq('person_email', lead.email)
                .limit(1)
                .single()

              if (matchingDeal) {
                // Fire and forget — don't block sync
                fetch(`${baseUrl}/api/leads/parse-notes`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-internal-key': (process.env.SUPABASE_SERVICE_ROLE_KEY || '').slice(0, 20),
                  },
                  body: JSON.stringify({ leadId: lead.id }),
                }).catch(() => {}) // ignore errors — this is fire-and-forget
              }
            }
          }
        }
      } catch (noteParseError) {
        // Never let note parsing errors break the sync
        console.warn('[Pipedrive Sync] Auto note parse error (non-fatal):', noteParseError)
      }
    }

    // Update sync log
    const duration = Date.now() - startTime
    if (syncLogId) {
      await admin
        .from('pipedrive_sync_logs')
        .update({
          status: 'completed',
          records_synced: totalSynced,
          duration_ms: duration,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLogId)
    }

    // Update connection last_synced_at
    await admin
      .from('pipedrive_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', connection.id)

    return {
      status: 'ok',
      records_synced: totalSynced,
      duration_ms: Date.now() - startTime,
    }

  } catch (err: any) {
    if (syncLogId) {
      await admin
        .from('pipedrive_sync_logs')
        .update({
          status: 'failed',
          error_message: err.message,
          duration_ms: Date.now() - startTime,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLogId)
    }
    return { status: 'error', error: err.message }
  }
}

// Verify cron auth (same pattern as meta-ads)
function verifyCronAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ') && authHeader.slice(7) === cronSecret) return true

  const customHeader = request.headers.get('x-cron-secret')
  if (customHeader === cronSecret) return true

  const queryParam = request.nextUrl.searchParams.get('secret')
  if (queryParam === cronSecret) return true

  return false
}

// ===== GET: Cron sync all active connections =====
export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const admin = createAdminClient()

  const { data: connections } = await admin
    .from('pipedrive_connections')
    .select('*')
    .eq('status', 'active')
    .eq('sync_enabled', true)

  if (!connections || connections.length === 0) {
    return NextResponse.json({ message: 'No active connections', synced: 0 })
  }

  const results: Record<string, any> = {}
  for (const conn of connections) {
    results[conn.org_id] = await syncPipedrive(admin, conn.org_id, conn, 'full')
  }

  return NextResponse.json({
    success: true,
    duration_ms: Date.now() - startTime,
    results,
  })
}

// ===== POST: Manual sync from dashboard =====
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Auth: user JWT or cron secret
    if (!verifyCronAuth(request)) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const { orgId, syncType = 'full' } = await request.json()

    if (!orgId) {
      return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: connection, error } = await admin
      .from('pipedrive_connections')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .single()

    if (error || !connection) {
      return NextResponse.json({
        error: 'Nenhuma conexão Pipedrive ativa para esta organização',
      }, { status: 404 })
    }

    const result = await syncPipedrive(admin, orgId, connection, syncType)

    return NextResponse.json({
      success: result.status === 'ok',
      duration_ms: Date.now() - startTime,
      ...result,
    })

  } catch (error: any) {
    console.error('Pipedrive sync error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
