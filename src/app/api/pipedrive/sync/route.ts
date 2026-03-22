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
