import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  PipedriveConfig,
  getRecentDeals,
  extractPersonEmail, extractPersonPhone, extractPersonName, extractOrgName,
} from '@/lib/pipedrive/client'

// Cron rápido: pega só deals atualizados nas últimas 26h e upsert.
// Cabe nos 10s do Vercel Free.
export const maxDuration = 60
export const dynamic = 'force-dynamic'

function verifyCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ') && auth.slice(7) === secret) return true
  if (req.headers.get('x-cron-secret') === secret) return true
  if (req.nextUrl.searchParams.get('secret') === secret) return true
  return false
}

async function syncOne(admin: any, conn: any, hoursBack: number) {
  const config: PipedriveConfig = { api_token: conn.api_token, filter_id: conn.filter_id }
  const since = new Date(Date.now() - hoursBack * 3600 * 1000).toISOString()

  const recent = await getRecentDeals(config, since) // retorna { item: 'deal', data: deal }
  // Normaliza: getRecentDeals usa /recents que retorna {item, data}
  const deals = (recent || [])
    .map((r: any) => r.data || r)
    .filter((d: any) => d && d.id)

  if (deals.length === 0) return { synced: 0 }

  // Carrega stage names cached
  const { data: stagesData } = await admin
    .from('pipedrive_stages').select('stage_id, name').eq('org_id', conn.org_id)
  const stageMap = new Map<number, string>()
  stagesData?.forEach((s: any) => stageMap.set(s.stage_id, s.name))

  const rows = deals.map((deal: any) => ({
    org_id: conn.org_id,
    deal_id: deal.id,
    title: deal.title,
    value: deal.value || 0,
    currency: deal.currency || 'BRL',
    status: deal.status,
    stage_id: deal.stage_id,
    stage_name: stageMap.get(deal.stage_id) || null,
    pipeline_id: deal.pipeline_id,
    pipeline_name: conn.pipeline_name || null,
    person_id: deal.person_id?.value || deal.person_id || null,
    person_name: extractPersonName(deal),
    person_email: extractPersonEmail(deal),
    person_phone: extractPersonPhone(deal),
    org_name: extractOrgName(deal),
    owner_name: deal.owner_name || deal.user_id?.name || null,
    add_time: deal.add_time || null,
    update_time: deal.update_time || null,
    won_time: deal.won_time || null,
    lost_time: deal.lost_time || null,
    utm_source: deal['92f5fbfb2cfdcbe4d46a72b5acf06ca15f29ac14'] || deal['06754c74401e609e506d01d3a928f8d3025ad43e'] || null,
    utm_medium: deal['15bdeb9558dc89ed77d92cbfa0d04a4ee26d4d1f'] || deal['a335961b5cded844362e09480b5ca68048e33404'] || null,
    utm_campaign: deal['6b578f95362c28ee95473982525671ff43435b38'] || deal['6bc82d18de3ae4574c4f8b8185a1dfa7e43cd5d0'] || null,
    utm_content: deal['921482eae8dae5a8b2c830100038a17801df8b45'] || deal['ba178b2651759509012cfad3beac506f51d12a27'] || null,
    utm_term: deal['5c22fd65ac5f7dbfbef6c07347fde9154bcdc385'] || deal['3ba67d7950d346b4b6dd0d4bbb8974a007a53aee'] || null,
    fbclid: deal['143f49947826ce1d1b3e995baa842e96de518e74'] || null,
    raw_data: deal,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))

  const { error } = await admin
    .from('pipedrive_deals')
    .upsert(rows, { onConflict: 'org_id,deal_id' })

  if (error) throw error
  return { synced: rows.length }
}

// GET: cron incremental — todas conexões ativas
export async function GET(request: NextRequest) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const startTime = Date.now()
  const admin = createAdminClient()
  const hoursBack = parseInt(request.nextUrl.searchParams.get('hours') || '26', 10)

  const { data: conns } = await admin
    .from('pipedrive_connections')
    .select('*')
    .eq('status', 'active')

  if (!conns?.length) return NextResponse.json({ message: 'No connections', synced: 0 })

  const results: any = {}
  for (const c of conns) {
    try {
      results[c.org_id] = await syncOne(admin, c, hoursBack)
    } catch (e: any) {
      results[c.org_id] = { error: e.message }
    }
  }

  return NextResponse.json({ success: true, duration_ms: Date.now() - startTime, results })
}
