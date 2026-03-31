import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateAI, parseAIJson } from '@/lib/ai-client'
import { fetchCnpjData } from '@/lib/enrichment/company-research'

export const maxDuration = 120

// ============= HTML Stripping =============

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ============= Pipedrive Notes Fetcher =============

async function fetchDealNotes(dealId: number, apiToken: string): Promise<string[]> {
  const notes: string[] = []
  let start = 0
  const limit = 100
  let hasMore = true

  while (hasMore) {
    const params = new URLSearchParams({
      api_token: apiToken,
      deal_id: String(dealId),
      start: String(start),
      limit: String(limit),
      sort: 'add_time DESC',
    })

    const response = await fetch(`https://api.pipedrive.com/v1/notes?${params}`)

    if (!response.ok) {
      console.warn(`[ParseNotes] Pipedrive notes API returned ${response.status}`)
      break
    }

    const json = await response.json()

    if (!json.success || !json.data || json.data.length === 0) {
      break
    }

    for (const note of json.data) {
      if (note.content) {
        const cleaned = stripHtml(note.content)
        if (cleaned.length > 10) {
          notes.push(cleaned)
        }
      }
    }

    hasMore = json.additional_data?.pagination?.more_items_in_collection || false
    start = json.additional_data?.pagination?.next_start || start + limit
  }

  return notes
}

// ============= AI Extraction =============

interface ParsedNoteData {
  company: string | null
  cargo: string | null
  segmento: string | null
  porte: string | null
  faturamento: string | null
  email: string | null
  phone: string | null
  cnpj: string | null
  score: number | null
  nivel: string | null
  funcionarios: string | null
  diagnostico: string | null
  first_name: string | null
  last_name: string | null
  website: string | null
  cidade: string | null
  estado: string | null
  prioridade: string | null
  data_reuniao: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  landing_page: string | null
  fbclid: string | null
  origem: string | null
  pilares_diagnostico: Record<string, any> | null
  dores: string[]
  interesses: string[]
  observacoes: string | null
}

async function extractDataFromNotes(notesContent: string): Promise<ParsedNoteData> {
  const { content } = await generateAI({
    messages: [
      {
        role: 'system',
        content: `Voce e um extrator de dados estruturados. Sua tarefa e analisar notas de CRM (Pipedrive) e extrair TODOS os dados estruturados encontrados.

REGRAS:
- Extraia TODOS os campos que encontrar nas notas, mesmo se estiverem em formatos diferentes
- Notas podem ter emojis como indicadores (ex: empresa, telefone, email, etc)
- Se um campo nao for encontrado, use null
- Para nomes, separe em first_name e last_name
- Para CNPJ, extraia no formato XX.XXX.XXX/XXXX-XX
- Para telefone, inclua DDD e codigo do pais se disponivel
- Para score, extraia o numero (ex: "62/100" → 62)
- Dores e interesses podem estar em formato lista ou texto corrido
- Responda APENAS com JSON valido, sem markdown, sem explicacao.`,
      },
      {
        role: 'user',
        content: `Extraia dados estruturados destas notas de CRM:

---
${notesContent}
---

JSON esperado (extraia TODOS os campos que encontrar):
{
  "company": "nome da empresa ou null",
  "cargo": "cargo/posicao do contato ou null",
  "segmento": "segmento/setor/o que faz a empresa ou null",
  "porte": "porte da empresa (micro/pequena/media/grande) ou descricao ou null",
  "faturamento": "faturamento mencionado ou null",
  "email": "email encontrado ou null",
  "phone": "telefone/whatsapp encontrado ou null",
  "cnpj": "CNPJ encontrado ou null",
  "score": numero_score_ou_null,
  "nivel": "nivel de maturidade/qualificacao ou null",
  "funcionarios": "numero de funcionarios ou faixa ou null",
  "diagnostico": "resumo do diagnostico/avaliacao se houver ou null",
  "first_name": "primeiro nome do contato ou null",
  "last_name": "sobrenome do contato ou null",
  "website": "site da empresa ou null",
  "cidade": "cidade ou null",
  "estado": "UF ou null",
  "prioridade": "urgencia/prioridade mencionada ou null",
  "data_reuniao": "data/hora de reuniao agendada ou null",
  "utm_source": "fonte de trafego (facebook, google, etc) ou null",
  "utm_medium": "midia (cpc, organic, etc) ou null",
  "utm_campaign": "nome da campanha ou null",
  "utm_content": "conteudo/publico do anuncio ou null",
  "utm_term": "termo/criativo do anuncio ou null",
  "landing_page": "URL da landing page ou null",
  "fbclid": "Facebook click ID ou null",
  "origem": "origem do lead (facebook, google, organico, indicacao, etc) ou null",
  "dores": ["lista de dores/problemas mencionados"],
  "interesses": ["lista de interesses/necessidades mencionados"],
  "pilares_diagnostico": {"processos": null, "pessoas": null, "clientes": null, "controle": null, "crescimento": null},
  "observacoes": "outras observacoes relevantes ou null"
}`,
      },
    ],
    maxTokens: 2000,
    temperature: 0.1,
  })

  try {
    const parsed = parseAIJson(content) as ParsedNoteData
    return {
      company: parsed.company || null,
      cargo: parsed.cargo || null,
      segmento: parsed.segmento || null,
      porte: parsed.porte || null,
      faturamento: parsed.faturamento || null,
      email: parsed.email || null,
      phone: parsed.phone || null,
      cnpj: parsed.cnpj || null,
      score: typeof parsed.score === 'number' ? parsed.score : null,
      nivel: parsed.nivel || null,
      funcionarios: parsed.funcionarios || null,
      diagnostico: parsed.diagnostico || null,
      first_name: parsed.first_name || null,
      last_name: parsed.last_name || null,
      website: parsed.website || null,
      cidade: parsed.cidade || null,
      estado: parsed.estado || null,
      prioridade: parsed.prioridade || null,
      data_reuniao: parsed.data_reuniao || null,
      utm_source: parsed.utm_source || null,
      utm_medium: parsed.utm_medium || null,
      utm_campaign: parsed.utm_campaign || null,
      utm_content: parsed.utm_content || null,
      utm_term: parsed.utm_term || null,
      landing_page: parsed.landing_page || null,
      fbclid: parsed.fbclid || null,
      origem: parsed.origem || null,
      pilares_diagnostico: parsed.pilares_diagnostico || null,
      dores: Array.isArray(parsed.dores) ? parsed.dores : [],
      interesses: Array.isArray(parsed.interesses) ? parsed.interesses : [],
      observacoes: parsed.observacoes || null,
    }
  } catch (error) {
    console.error('[ParseNotes] AI parse error:', error)
    throw new Error('Falha ao interpretar resposta da IA')
  }
}

// ============= Core Logic: Parse notes for a single lead =============

async function parseNotesForLead(
  admin: ReturnType<typeof createAdminClient>,
  leadId: string,
): Promise<{ updated_fields: string[]; parsed_data: ParsedNoteData | null; error?: string }> {
  // 1. Fetch the lead
  const { data: lead, error: leadError } = await admin
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (leadError || !lead) {
    return { updated_fields: [], parsed_data: null, error: 'Lead nao encontrado' }
  }

  // 2. Get Pipedrive connection for this org
  const { data: connection } = await admin
    .from('pipedrive_connections')
    .select('api_token')
    .eq('org_id', lead.org_id)
    .eq('status', 'active')
    .single()

  if (!connection) {
    return { updated_fields: [], parsed_data: null, error: 'Nenhuma conexao Pipedrive ativa para esta organizacao' }
  }

  // 3. Find matching Pipedrive deal
  let dealQuery = admin
    .from('pipedrive_deals')
    .select('deal_id, person_email, person_name, person_phone, org_name')
    .eq('org_id', lead.org_id)

  // Try matching by email first, then by name
  const { data: dealsByEmail } = await dealQuery.eq('person_email', lead.email)

  let deal = dealsByEmail?.[0]

  if (!deal && lead.first_name) {
    const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ')
    const { data: dealsByName } = await admin
      .from('pipedrive_deals')
      .select('deal_id, person_email, person_name, person_phone, org_name')
      .eq('org_id', lead.org_id)
      .ilike('person_name', `%${fullName}%`)

    deal = dealsByName?.[0]
  }

  if (!deal) {
    return { updated_fields: [], parsed_data: null, error: 'Nenhum deal do Pipedrive encontrado para este lead' }
  }

  // 4. Fetch notes from Pipedrive API
  const notes = await fetchDealNotes(deal.deal_id, connection.api_token)

  if (notes.length === 0) {
    return { updated_fields: [], parsed_data: null, error: 'Nenhuma nota encontrada neste deal do Pipedrive' }
  }

  // 5. Send all notes to AI for extraction
  const allNotesText = notes.join('\n\n---\n\n')
  const parsedData = await extractDataFromNotes(allNotesText)

  // 6. Update lead fields that are empty (don't overwrite existing data)
  const leadUpdates: Record<string, any> = {}
  const updatedFields: string[] = []

  if (!lead.company && parsedData.company) {
    leadUpdates.company = parsedData.company
    updatedFields.push('company')
  }
  if (!lead.position && parsedData.cargo) {
    leadUpdates.position = parsedData.cargo
    updatedFields.push('position')
  }
  if (!lead.phone && parsedData.phone) {
    leadUpdates.phone = parsedData.phone
    updatedFields.push('phone')
  }
  if (!lead.first_name && parsedData.first_name) {
    leadUpdates.first_name = parsedData.first_name
    updatedFields.push('first_name')
  }
  if (!lead.last_name && parsedData.last_name) {
    leadUpdates.last_name = parsedData.last_name
    updatedFields.push('last_name')
  }
  if (parsedData.score !== null && (!lead.score || lead.score === 0)) {
    leadUpdates.score = parsedData.score
    updatedFields.push('score')
  }

  // Store parsed notes data in custom_fields
  const existingCustom = lead.custom_fields || {}
  const noteFields: Record<string, any> = {}

  if (parsedData.segmento) noteFields.segmento = parsedData.segmento
  if (parsedData.porte) noteFields.porte = parsedData.porte
  if (parsedData.faturamento) noteFields.faturamento = parsedData.faturamento
  if (parsedData.funcionarios) noteFields.funcionarios = parsedData.funcionarios
  if (parsedData.cnpj) noteFields.cnpj = parsedData.cnpj
  if (parsedData.nivel) noteFields.nivel_qualificacao = parsedData.nivel
  if (parsedData.diagnostico) noteFields.diagnostico_pipedrive = parsedData.diagnostico
  if (parsedData.cidade) noteFields.cidade = parsedData.cidade
  if (parsedData.estado) noteFields.estado = parsedData.estado
  if (parsedData.website) noteFields.website = parsedData.website
  if (parsedData.prioridade) noteFields.prioridade = parsedData.prioridade
  if (parsedData.data_reuniao) noteFields.data_reuniao = parsedData.data_reuniao
  if (parsedData.utm_source) noteFields.utm_source = parsedData.utm_source
  if (parsedData.utm_medium) noteFields.utm_medium = parsedData.utm_medium
  if (parsedData.utm_campaign) noteFields.utm_campaign = parsedData.utm_campaign
  if (parsedData.utm_content) noteFields.utm_content = parsedData.utm_content
  if (parsedData.utm_term) noteFields.utm_term = parsedData.utm_term
  if (parsedData.landing_page) noteFields.landing_page = parsedData.landing_page
  if (parsedData.fbclid) noteFields.fbclid = parsedData.fbclid
  if (parsedData.origem) noteFields.origem = parsedData.origem
  if (parsedData.pilares_diagnostico) noteFields.pilares_diagnostico = parsedData.pilares_diagnostico
  if (parsedData.dores.length > 0) noteFields.dores = parsedData.dores
  if (parsedData.interesses.length > 0) noteFields.interesses = parsedData.interesses
  if (parsedData.observacoes) noteFields.observacoes_pipedrive = parsedData.observacoes

  if (Object.keys(noteFields).length > 0) {
    leadUpdates.custom_fields = { ...existingCustom, ...noteFields }
    updatedFields.push('custom_fields')
  }

  // 7. Update enrichment_data (merge with existing)
  const existingEnrichment = (lead.enrichment_data as Record<string, any>) || {}
  const enrichmentUpdates: Record<string, any> = {}

  if (parsedData.segmento && !existingEnrichment.segmento_ia) {
    enrichmentUpdates.segmento_ia = parsedData.segmento
  }
  if (parsedData.porte && !existingEnrichment.porte) {
    enrichmentUpdates.porte = parsedData.porte
  }
  if (parsedData.faturamento && !existingEnrichment.faturamento_estimado) {
    enrichmentUpdates.faturamento_estimado = parsedData.faturamento
  }
  if (parsedData.website && !existingEnrichment.website) {
    enrichmentUpdates.website = parsedData.website
  }
  if (parsedData.dores.length > 0 && (!existingEnrichment.dores_provaveis || existingEnrichment.dores_provaveis.length === 0)) {
    enrichmentUpdates.dores_provaveis = parsedData.dores
  }
  if (parsedData.diagnostico && !existingEnrichment.resumo_ia) {
    enrichmentUpdates.resumo_ia = parsedData.diagnostico
  }

  if (Object.keys(enrichmentUpdates).length > 0) {
    leadUpdates.enrichment_data = {
      ...existingEnrichment,
      ...enrichmentUpdates,
      pipedrive_notes_parsed_at: new Date().toISOString(),
    }
    if (!updatedFields.includes('enrichment_data')) {
      updatedFields.push('enrichment_data')
    }
  }

  // 8. If CNPJ found, validate with BrasilAPI and enrich
  if (parsedData.cnpj) {
    try {
      const cnpjData = await fetchCnpjData(parsedData.cnpj)
      if (cnpjData) {
        const cnpjEnrichment: Record<string, any> = {
          cnpj: parsedData.cnpj,
          razao_social: cnpjData.razao_social || null,
          nome_fantasia: cnpjData.nome_fantasia || null,
          situacao: cnpjData.descricao_situacao_cadastral || null,
          capital_social: cnpjData.capital_social || null,
        }
        if (cnpjData.cnae_fiscal) {
          cnpjEnrichment.cnae_principal = {
            codigo: String(cnpjData.cnae_fiscal),
            descricao: cnpjData.cnae_fiscal_descricao || '',
          }
        }
        if (cnpjData.logradouro) {
          cnpjEnrichment.endereco = {
            logradouro: [cnpjData.logradouro, cnpjData.numero, cnpjData.complemento].filter(Boolean).join(', '),
            municipio: cnpjData.municipio,
            uf: cnpjData.uf,
            cep: cnpjData.cep,
          }
        }
        if (cnpjData.qsa?.length) {
          cnpjEnrichment.socios = cnpjData.qsa.map((s: any) => ({
            nome: s.nome_socio,
            qualificacao: s.qualificacao_socio,
          }))
        }
        if (cnpjData.data_inicio_atividade) {
          cnpjEnrichment.abertura = cnpjData.data_inicio_atividade
        }
        if (cnpjData.porte) {
          cnpjEnrichment.porte = cnpjData.porte
        }

        leadUpdates.enrichment_data = {
          ...(leadUpdates.enrichment_data || existingEnrichment),
          ...cnpjEnrichment,
          cnpj_validated: true,
          pipedrive_notes_parsed_at: new Date().toISOString(),
        }
        updatedFields.push('cnpj_validated')
      }
    } catch (cnpjError) {
      console.warn('[ParseNotes] CNPJ validation failed:', cnpjError)
    }
  }

  // 9. Apply updates
  if (Object.keys(leadUpdates).length > 0) {
    leadUpdates.updated_at = new Date().toISOString()
    await admin.from('leads').update(leadUpdates).eq('id', leadId)
  }

  // 10. Log event
  await admin.from('lead_events').insert({
    org_id: lead.org_id,
    lead_id: leadId,
    event_type: 'custom',
    title: 'Dados importados do Pipedrive',
    description: updatedFields.length > 0
      ? `Campos atualizados: ${updatedFields.join(', ')}. ${notes.length} nota(s) analisada(s).`
      : `${notes.length} nota(s) analisada(s), nenhum campo novo encontrado.`,
    metadata: {
      source: 'pipedrive_notes',
      deal_id: deal.deal_id,
      notes_count: notes.length,
      updated_fields: updatedFields,
      parsed_data: parsedData,
    },
  })

  return { updated_fields: updatedFields, parsed_data: parsedData }
}

// ============= API Route =============

export async function POST(req: NextRequest) {
  try {
    // Auth check — allow internal calls via x-internal-key header or authenticated users
    const isInternal = req.headers.get('x-internal-key') === (process.env.INTERNAL_API_SECRET || '')
    let userId: string | null = null

    if (!isInternal) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
      }
      userId = user.id
    }

    const body = await req.json()
    const { leadId, orgId } = body

    if (!leadId && !orgId) {
      return NextResponse.json({ error: 'leadId ou orgId obrigatorio' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Single lead mode
    if (leadId) {
      // Verify user has access (skip for internal calls)
      const { data: lead } = await admin.from('leads').select('org_id').eq('id', leadId).single()
      if (!lead) {
        return NextResponse.json({ error: 'Lead nao encontrado' }, { status: 404 })
      }

      if (!isInternal && userId) {
        const supabase = await createClient()
        const { data: membership } = await supabase
          .from('organization_members')
          .select('id')
          .eq('org_id', lead.org_id)
          .eq('user_id', userId)
          .single()

        if (!membership) {
          return NextResponse.json({ error: 'Sem acesso a esta organizacao' }, { status: 403 })
        }
      }

      const result = await parseNotesForLead(admin, leadId)

      if (result.error) {
        return NextResponse.json({
          success: false,
          error: result.error,
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        updated_fields: result.updated_fields,
        parsed_data: result.parsed_data,
        message: result.updated_fields.length > 0
          ? `${result.updated_fields.length} campo(s) atualizado(s) com dados do Pipedrive.`
          : 'Notas analisadas, mas nenhum campo novo encontrado.',
      })
    }

    // Batch mode (by orgId)
    if (orgId) {
      // Verify user has access (skip for internal calls)
      if (!isInternal && userId) {
        const supabase = await createClient()
        const { data: membership } = await supabase
          .from('organization_members')
          .select('id')
          .eq('org_id', orgId)
          .eq('user_id', userId)
          .single()

        if (!membership) {
          return NextResponse.json({ error: 'Sem acesso a esta organizacao' }, { status: 403 })
        }
      }

      // Get all leads with empty fields that have matching Pipedrive deals
      const { data: leads } = await admin
        .from('leads')
        .select('id, email, first_name, company')
        .eq('org_id', orgId)
        .or('company.is.null,position.is.null,phone.is.null')
        .limit(50) // Process max 50 at a time

      if (!leads || leads.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'Nenhum lead com campos vazios encontrado.',
          processed: 0,
        })
      }

      const results: { leadId: string; email: string; updated_fields: string[]; error?: string }[] = []

      for (const lead of leads) {
        try {
          const result = await parseNotesForLead(admin, lead.id)
          results.push({
            leadId: lead.id,
            email: lead.email,
            updated_fields: result.updated_fields,
            error: result.error,
          })
        } catch (error: any) {
          results.push({
            leadId: lead.id,
            email: lead.email,
            updated_fields: [],
            error: error.message,
          })
        }
      }

      const successful = results.filter(r => r.updated_fields.length > 0)
      const failed = results.filter(r => r.error)

      return NextResponse.json({
        success: true,
        processed: results.length,
        updated: successful.length,
        failed: failed.length,
        results,
        message: `${successful.length} de ${results.length} leads atualizados com dados do Pipedrive.`,
      })
    }
  } catch (error: any) {
    console.error('[ParseNotes] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro interno', details: error.message },
      { status: 500 }
    )
  }
}
