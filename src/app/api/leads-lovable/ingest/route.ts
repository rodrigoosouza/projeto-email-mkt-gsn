import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'

// Org Orbit (default quando header x-org-id não vier)
const DEFAULT_ORG_ID = 'aa652b9a-5a03-4c59-be37-8a81cd6ecdb9'

const BOOLEAN_FIELDS = [
  'confirmou_participacao',
  'lembrete_enviado',
  'ligacao_confirmacao_enviada',
  'ligacao_agendada',
  'deseja_contato_vendedor',
] as const

const TEXT_FIELDS = [
  'nome', 'sobrenome', 'email', 'whatsapp', 'empresa', 'oque_faz', 'cargo',
  'faturamento', 'funcionarios', 'prioridade', 'software_gestao',
  'horario_reuniao', 'link_reuniao', 'status', 'status_reuniao', 'etapa_pipedrive',
  'copy_variant', 'landing_page', 'origin_page',
  'pipedrive_deal_id', 'pipedrive_person_id', 'pipedrive_org_id',
  'fbclid', 'gclid', 'gbraid', 'wbraid', 'gad_campaignid', 'gad_source',
  'msclkid', 'li_fat_id', 'ttclid', 'sck',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'manychat_subscriber_id', 'reschedule_token', 'apex_session_id', 'session_attributes_encoded',
] as const

function toBool(v: any): boolean | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  const s = String(v).trim().toLowerCase()
  if (['true', '1', 'yes', 'sim', 't', 'y'].includes(s)) return true
  if (['false', '0', 'no', 'nao', 'não', 'f', 'n'].includes(s)) return false
  return null
}

function toDate(v: any): string | null {
  if (!v) return null
  const s = String(v).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

function toTimestamptz(v: any): string | null {
  if (!v) return null
  const d = new Date(v)
  if (isNaN(d.getTime())) return null
  return d.toISOString()
}

function mapLead(orgId: string, input: Record<string, any>) {
  const row: Record<string, any> = { org_id: orgId, raw_payload: input }

  // id vindo do Lovable (string ou number)
  if (input.id !== undefined && input.id !== null) {
    row.lovable_id = String(input.id)
  }

  for (const f of TEXT_FIELDS) {
    if (input[f] !== undefined) row[f] = input[f] === null ? null : String(input[f])
  }

  for (const f of BOOLEAN_FIELDS) {
    if (input[f] !== undefined) row[f] = toBool(input[f])
  }

  if (input.nps !== undefined && input.nps !== null && input.nps !== '') {
    const n = parseInt(String(input.nps), 10)
    row.nps = Number.isFinite(n) ? n : null
  }

  if (input.data_reuniao !== undefined) row.data_reuniao = toDate(input.data_reuniao)
  if (input.data_correta !== undefined) row.data_correta = toDate(input.data_correta)
  if (input.created_at !== undefined) row.created_at = toTimestamptz(input.created_at)

  return row
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const { success: rlOk } = rateLimit(`lovable-ingest:${clientIp}`, 200, 60000)
    if (!rlOk) {
      return NextResponse.json({ error: 'Rate limit exceeded (200/min)' }, { status: 429 })
    }

    const apiKey = request.headers.get('x-api-key')
    const expected = process.env.LOVABLE_INGEST_SECRET
    if (!expected) {
      return NextResponse.json({ error: 'Server missing LOVABLE_INGEST_SECRET' }, { status: 500 })
    }
    if (!apiKey || apiKey !== expected) {
      return NextResponse.json({ error: 'Invalid or missing x-api-key' }, { status: 401 })
    }

    const orgId = request.headers.get('x-org-id') || DEFAULT_ORG_ID

    const raw = await request.json()
    const items: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.leads) ? raw.leads : [raw]

    const supabase = createAdminClient()
    const rows = items.map((item) => mapLead(orgId, item))

    // Upsert em lote: precisa de lovable_id pra conflitar; senão, insert puro
    const withLovableId = rows.filter((r) => r.lovable_id)
    const withoutLovableId = rows.filter((r) => !r.lovable_id)

    const results: { upserted: number; inserted: number; errors: string[] } = {
      upserted: 0,
      inserted: 0,
      errors: [],
    }

    if (withLovableId.length > 0) {
      const { error, count } = await supabase
        .from('leads_lovable')
        .upsert(withLovableId, { onConflict: 'org_id,lovable_id', count: 'exact' })
      if (error) results.errors.push(`upsert: ${error.message}`)
      else results.upserted = count ?? withLovableId.length
    }

    if (withoutLovableId.length > 0) {
      const { error, count } = await supabase
        .from('leads_lovable')
        .insert(withoutLovableId, { count: 'exact' })
      if (error) results.errors.push(`insert: ${error.message}`)
      else results.inserted = count ?? withoutLovableId.length
    }

    return NextResponse.json({
      success: results.errors.length === 0,
      received: items.length,
      ...results,
    })
  } catch (error: any) {
    console.error('[leads-lovable/ingest] error:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/leads-lovable/ingest',
    auth: 'header x-api-key: <LOVABLE_INGEST_SECRET>',
    optional_headers: { 'x-org-id': 'UUID da org (default Orbit)' },
    body: 'objeto único, array, ou { leads: [...] }',
    idempotency: 'upsert por (org_id, lovable_id) — envie o campo "id" do Lovable',
  })
}
