import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get('orgId')
  const from = searchParams.get('from') // YYYY-MM-DD
  const to = searchParams.get('to')
  const channel = searchParams.get('channel') || 'all'  // all | meta | google | organico
  const metaOnly = searchParams.get('metaOnly') === '1' || channel === 'meta'  // back-compat
  const limit = Math.min(parseInt(searchParams.get('limit') || '500', 10), 2000)

  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

  // Leads Lovable
  let leadsQuery = supabase
    .from('leads_lovable')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  // Filtra pelo created_at do Lovable (data_correta vem null em alguns leads)
  if (from) leadsQuery = leadsQuery.gte('created_at', `${from}T00:00:00Z`)
  if (to) leadsQuery = leadsQuery.lte('created_at', `${to}T23:59:59Z`)

  // Filtra leads pelo canal
  if (channel === 'meta' || metaOnly) {
    leadsQuery = leadsQuery.not('fbclid', 'is', null)
  } else if (channel === 'google') {
    leadsQuery = leadsQuery.or('gclid.not.is.null,gad_source.not.is.null')
  } else if (channel === 'organico') {
    leadsQuery = leadsQuery.is('fbclid', null).is('gclid', null).is('gad_source', null)
  }

  const { data: leads, error: leadsError } = await leadsQuery
  if (leadsError) return NextResponse.json({ error: leadsError.message }, { status: 500 })

  // Meta Ads insights (campanha) no mesmo período
  let metaQuery = supabase
    .from('meta_campaign_insights')
    .select('date, leads, spend, impressions, clicks')
    .eq('org_id', orgId)

  if (from) metaQuery = metaQuery.gte('date', from)
  if (to) metaQuery = metaQuery.lte('date', to)

  const { data: metaRows } = await metaQuery

  // Pipedrive deals no mesmo período
  // Critério Meta-only = utm_source contém 'facebook' (mesmo do report Pipedrive),
  // pois fbclid não é populado na sincronia atual
  let pipeQuery = supabase
    .from('pipedrive_deals')
    .select('add_time, utm_source, fbclid')
    .eq('org_id', orgId)

  if (from) pipeQuery = pipeQuery.gte('add_time', `${from}T00:00:00Z`)
  if (to) pipeQuery = pipeQuery.lte('add_time', `${to}T23:59:59Z`)
  if (channel === 'meta' || metaOnly) pipeQuery = pipeQuery.ilike('utm_source', '%facebook%')
  else if (channel === 'google') pipeQuery = pipeQuery.ilike('utm_source', '%google%')
  else if (channel === 'organico') pipeQuery = pipeQuery.is('utm_source', null)

  const { data: pipeRows } = await pipeQuery

  // Agrega por dia
  type DayRow = {
    meta_leads: number
    spend: number
    impressions: number
    clicks: number
    lovable_leads: number
    lovable_to_pipe: number
    pipedrive_deals: number
  }
  const empty = (): DayRow => ({ meta_leads: 0, spend: 0, impressions: 0, clicks: 0, lovable_leads: 0, lovable_to_pipe: 0, pipedrive_deals: 0 })
  const byDay: Record<string, DayRow> = {}

  for (const row of metaRows || []) {
    const d = row.date
    if (!byDay[d]) byDay[d] = empty()
    byDay[d].meta_leads += row.leads || 0
    byDay[d].spend += Number(row.spend) || 0
    byDay[d].impressions += row.impressions || 0
    byDay[d].clicks += row.clicks || 0
  }

  for (const lead of leads || []) {
    const d = lead.data_correta || (lead.created_at ? String(lead.created_at).slice(0, 10) : null)
    if (!d) continue
    if (!byDay[d]) byDay[d] = empty()
    byDay[d].lovable_leads += 1
    if (lead.pipedrive_deal_id) byDay[d].lovable_to_pipe += 1
  }

  for (const deal of pipeRows || []) {
    if (!deal.add_time) continue
    const d = String(deal.add_time).slice(0, 10)
    if (!byDay[d]) byDay[d] = empty()
    byDay[d].pipedrive_deals += 1
  }

  const comparison = Object.entries(byDay)
    .map(([date, v]) => ({
      date,
      ...v,
      diff: v.lovable_leads - v.meta_leads,
      diff_pipe: v.pipedrive_deals - v.lovable_leads,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({
    leads: leads || [],
    comparison,
    totals: {
      lovable: (leads || []).length,
      meta: (metaRows || []).reduce((s, r) => s + (r.leads || 0), 0),
      pipedrive: (pipeRows || []).length,
      lovable_to_pipe: (leads || []).filter((l) => l.pipedrive_deal_id).length,
    },
  })
}
