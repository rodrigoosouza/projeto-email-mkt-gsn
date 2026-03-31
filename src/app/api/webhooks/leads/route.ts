import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'

async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(apiKey)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Maps incoming lead data from various formats to our standard format.
 * Supports: our standard format, ApexMkt/Orbit format, generic webhook format.
 */
function mapLeadData(body: Record<string, any>): {
  lead: Record<string, any>
  customFields: Record<string, any>
  tags: string[]
} {
  const lead: Record<string, any> = {}
  const customFields: Record<string, any> = {}
  const tags: string[] = []

  // === Email (required) ===
  lead.email = body.email || body.e_mail || body.Email || null

  // === Name ===
  lead.first_name = body.first_name || body.nome || body.firstName || body.Name || null
  lead.last_name = body.last_name || body.sobrenome || body.lastName || null

  // === Phone ===
  lead.phone = body.phone || body.whatsapp || body.telefone || body.celular || body.Phone || null

  // === Company ===
  lead.company = body.company || body.empresa || body.Company || body.org_name || null

  // === Position ===
  lead.position = body.position || body.cargo || body.Position || body.job_title || null

  // === Source (de onde veio) ===
  lead.source = body.source || body.utm_source || body.origem || 'api'

  // === Score ===
  if (body.score !== undefined) lead.score = Math.min(100, Math.max(0, Number(body.score) || 0))

  // === External ID ===
  lead.external_id = body.external_id || body.pipedrive_deal_id || null
  // body.id is the external system's UUID — save in custom_fields, not as external_id
  if (body.id && !body.external_id) customFields.external_system_id = body.id

  // === Tags ===
  if (body.tags && Array.isArray(body.tags)) tags.push(...body.tags)
  if (body.status === 'parcial') tags.push('lead-parcial')
  if (body.confirmou_participacao) tags.push('confirmou-participacao')
  if (body.deseja_contato_vendedor) tags.push('quer-contato-vendedor')

  // === UTM / Tracking → custom_fields ===
  const trackingFields = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
    'gclid', 'fbclid', 'gbraid', 'wbraid', 'ttclid', 'msclkid',
    'li_fat_id', 'sck', 'gad_campaignid', 'gad_source',
    'landing_page', 'origin_page', 'apex_session_id', 'session_attributes_encoded',
  ]
  for (const field of trackingFields) {
    if (body[field]) customFields[field] = body[field]
  }

  // === Pipedrive IDs → custom_fields ===
  if (body.pipedrive_deal_id) customFields.pipedrive_deal_id = body.pipedrive_deal_id
  if (body.pipedrive_person_id) customFields.pipedrive_person_id = body.pipedrive_person_id
  if (body.pipedrive_org_id) customFields.pipedrive_org_id = body.pipedrive_org_id
  if (body.etapa_pipedrive) customFields.deal_stage = body.etapa_pipedrive

  // === Business data → custom_fields ===
  if (body.oque_faz || body.segmento) customFields.segmento = body.oque_faz || body.segmento
  if (body.faturamento) customFields.faturamento = body.faturamento
  if (body.funcionarios) customFields.funcionarios = body.funcionarios
  if (body.prioridade) customFields.prioridade = body.prioridade
  if (body.software_gestao) customFields.software_gestao = body.software_gestao

  // === Reunion data → custom_fields ===
  if (body.data_reuniao) customFields.data_reuniao = body.data_reuniao
  if (body.horario_reuniao) customFields.horario_reuniao = body.horario_reuniao
  if (body.status_reuniao) customFields.status_reuniao = body.status_reuniao

  // === Other data → custom_fields ===
  if (body.copy_variant) customFields.copy_variant = body.copy_variant
  if (body.manychat_subscriber_id) customFields.manychat_subscriber_id = body.manychat_subscriber_id
  if (body.nps !== undefined && body.nps !== null) customFields.nps = body.nps
  if (body.status) customFields.lead_status_externo = body.status

  // === Any explicit custom_fields from body ===
  if (body.custom_fields && typeof body.custom_fields === 'object') {
    Object.assign(customFields, body.custom_fields)
  }

  return { lead, customFields, tags }
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const { success: rateLimitOk, remaining } = rateLimit(`webhook:${clientIp}`, 100, 60000) // 100 requests per minute
    if (!rateLimitOk) {
      return NextResponse.json({ error: 'Rate limit exceeded. Max 100 requests per minute.' }, { status: 429 })
    }

    const apiKey = request.headers.get('x-api-key')
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key. Send x-api-key header.' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const keyHash = await hashApiKey(apiKey)

    const { data: keyRecord, error: keyError } = await supabase
      .from('api_keys')
      .select('id, org_id')
      .eq('key_hash', keyHash)
      .single()

    if (keyError || !keyRecord) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyRecord.id)

    const orgId = keyRecord.org_id
    const rawBody = await request.json()

    // Support both single lead and array of leads
    const items = Array.isArray(rawBody) ? rawBody : [rawBody]
    const results: { email: string; success: boolean; error?: string }[] = []

    for (const item of items) {
      try {
        const { lead, customFields, tags } = mapLeadData(item)

        if (!lead.email) {
          results.push({ email: '', success: false, error: 'Email obrigatorio' })
          continue
        }

        // Fetch existing lead to detect create vs update + track changes
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id, first_name, last_name, phone, company, position, source, score, custom_fields')
          .eq('org_id', orgId)
          .eq('email', lead.email)
          .single()

        const isUpdate = !!existingLead
        const changedFields: { field: string; from: any; to: any }[] = []

        if (isUpdate) {
          // Track what changed
          const fieldsToTrack = ['first_name', 'last_name', 'phone', 'company', 'position', 'source'] as const
          for (const field of fieldsToTrack) {
            const oldVal = existingLead[field]
            const newVal = lead[field]
            if (newVal && newVal !== oldVal) {
              changedFields.push({ field, from: oldVal || null, to: newVal })
            }
          }
        }

        const mergedCustomFields = {
          ...(existingLead?.custom_fields as Record<string, any> || {}),
          ...customFields,
        }

        // Upsert lead
        const { data: savedLead, error: leadError } = await supabase
          .from('leads')
          .upsert(
            {
              org_id: orgId,
              email: lead.email,
              first_name: lead.first_name,
              last_name: lead.last_name,
              phone: lead.phone,
              company: lead.company,
              position: lead.position,
              source: lead.source,
              external_id: lead.external_id ? String(lead.external_id) : null,
              ...(lead.score !== undefined ? { score: lead.score } : {}),
              custom_fields: mergedCustomFields,
            },
            { onConflict: 'org_id,email' }
          )
          .select('id')
          .single()

        if (leadError || !savedLead) {
          results.push({ email: lead.email, success: false, error: leadError?.message || 'Erro ao salvar' })
          continue
        }

        // Handle tags
        for (const tagName of tags) {
          if (!tagName) continue
          let { data: tag } = await supabase
            .from('lead_tags')
            .select('id')
            .eq('org_id', orgId)
            .eq('name', tagName)
            .single()

          if (!tag) {
            const { data: newTag } = await supabase
              .from('lead_tags')
              .insert({ org_id: orgId, name: tagName, color: '#3B82F6' })
              .select('id')
              .single()
            tag = newTag
          }

          if (tag) {
            await supabase
              .from('lead_tag_assignments')
              .upsert({ lead_id: savedLead.id, tag_id: tag.id }, { onConflict: 'lead_id,tag_id' })
          }
        }

        // Log event — different for create vs update
        if (isUpdate && changedFields.length > 0) {
          const changedSummary = changedFields.map(c => `${c.field}: "${c.from || '-'}" → "${c.to}"`).join(', ')
          await supabase.from('lead_events').insert({
            org_id: orgId,
            lead_id: savedLead.id,
            event_type: 'custom',
            title: 'Lead atualizado via webhook',
            description: `Campos alterados: ${changedSummary}`,
            metadata: {
              action: 'update',
              source: lead.source,
              changed_fields: changedFields,
              utm_source: customFields.utm_source,
              utm_campaign: customFields.utm_campaign,
              webhook_source: 'api',
            },
          })
        } else if (isUpdate) {
          // Updated but no core fields changed (only custom_fields/tracking)
          await supabase.from('lead_events').insert({
            org_id: orgId,
            lead_id: savedLead.id,
            event_type: 'custom',
            title: 'Lead reprocessado via webhook',
            description: `Dados de tracking atualizados. Fonte: ${lead.source}`,
            metadata: {
              action: 'reprocess',
              source: lead.source,
              utm_source: customFields.utm_source,
              utm_campaign: customFields.utm_campaign,
              webhook_source: 'api',
            },
          })
        } else {
          // New lead created
          await supabase.from('lead_events').insert({
            org_id: orgId,
            lead_id: savedLead.id,
            event_type: 'custom',
            title: 'Lead criado via webhook',
            description: `Novo lead: ${lead.first_name || ''} ${lead.last_name || ''} — ${lead.company || lead.source || 'API'}`,
            metadata: {
              action: 'create',
              source: lead.source,
              utm_source: customFields.utm_source,
              utm_medium: customFields.utm_medium,
              utm_campaign: customFields.utm_campaign,
              utm_content: customFields.utm_content,
              utm_term: customFields.utm_term,
              webhook_source: 'api',
            },
          })
        }

        results.push({ email: lead.email, success: true })
      } catch (itemError: any) {
        results.push({ email: item.email || '', success: false, error: itemError.message })
      }
    }

    const successCount = results.filter(r => r.success).length
    const errorCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: errorCount === 0,
      received: items.length,
      created: successCount,
      errors: errorCount,
      results: items.length > 1 ? results : undefined,
      lead: items.length === 1 ? results[0] : undefined,
    })
  } catch (error: any) {
    console.error('Lead webhook error:', error)
    return NextResponse.json({ error: 'Internal error: ' + (error.message || '') }, { status: 500 })
  }
}
