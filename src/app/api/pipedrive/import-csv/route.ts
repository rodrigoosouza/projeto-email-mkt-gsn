import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Recebe array de rows JSON do CSV parsed no client e faz upsert em pipedrive_deals
// Body: { orgId, source: 'csv-import-<nome>', rows: [{...}] }
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const body = await request.json()
    const { orgId, source = 'csv-import', rows } = body
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'rows[] required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Mapeia cada row para o formato pipedrive_deals
    // Aceita várias variações de nomes de coluna
    const mapped = rows.map((r: any, idx: number) => {
      const get = (...keys: string[]) => {
        for (const k of keys) {
          for (const [colKey, val] of Object.entries(r)) {
            if (colKey.toLowerCase().includes(k.toLowerCase()) && val !== '' && val !== null) {
              return val
            }
          }
        }
        return null
      }

      const title = get('título', 'titulo', 'title', 'negócio - tí') || `Sem título #${idx}`
      const addTime = get('criado em', 'adicionado em', 'add_time', 'created at', 'data de criação')
      const utmSource = get('utm source', 'utm_source')
      const utmCampaign = get('utm campaign', 'utm_campaign')
      const utmMedium = get('utm medium', 'utm_medium')
      const utmContent = get('utm content', 'utm_content')
      const utmTerm = get('utm term', 'utm_term')
      const fbclid = get('fbclid')
      const value = parseFloat(String(get('valor do negócio', 'valor', 'value', 'amount') || 0)) || 0
      const status = String(get('status', 'situação') || 'Aberto')
      const pipelineName = get('funil', 'pipeline')
      const wonTime = get('ganho em', 'won_time', 'won at')
      const lostTime = get('data de perda', 'lost_time', 'lost at')
      const ownerName = get('proprietário', 'owner', 'responsável')

      // Deal id: pega do CSV se tiver, senão sintético baseado em hash
      const csvDealId = get('id', 'deal_id', 'negócio - id')
      let dealId: number
      if (csvDealId && /^\d+$/.test(String(csvDealId))) {
        dealId = parseInt(String(csvDealId), 10)
      } else {
        const hash = crypto.createHash('md5')
          .update(`csv:${orgId}:${title}|${addTime || ''}`)
          .digest('hex')
        dealId = -parseInt(hash.slice(0, 7), 16)
      }

      return {
        org_id: orgId,
        deal_id: dealId,
        title: String(title),
        value,
        pipeline_name: pipelineName ? String(pipelineName) : null,
        status,
        won_time: wonTime ? new Date(String(wonTime)).toISOString() : null,
        lost_time: lostTime ? new Date(String(lostTime)).toISOString() : null,
        owner_name: ownerName ? String(ownerName) : null,
        utm_source: utmSource ? String(utmSource) : null,
        utm_medium: utmMedium ? String(utmMedium) : null,
        utm_campaign: utmCampaign ? String(utmCampaign) : null,
        utm_content: utmContent ? String(utmContent) : null,
        utm_term: utmTerm ? String(utmTerm) : null,
        fbclid: fbclid ? String(fbclid) : null,
        add_time: addTime ? new Date(String(addTime)).toISOString() : null,
        raw_data: { source, csv_row: r },
      }
    })

    // Filtra rows com add_time válido
    const valid = mapped.filter(r => r.add_time)
    if (valid.length === 0) {
      return NextResponse.json({ error: 'Nenhuma linha tem data de criação válida' }, { status: 400 })
    }

    const { error, count } = await admin
      .from('pipedrive_deals')
      .upsert(valid, { onConflict: 'org_id,deal_id', count: 'exact' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      received: rows.length,
      upserted: count ?? valid.length,
      skipped: rows.length - valid.length,
    })
  } catch (e: any) {
    console.error('[pipedrive/import-csv]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
