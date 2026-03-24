import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { researchCompany } from '@/lib/enrichment/company-research'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    // Auth check — allow internal calls via x-internal header or authenticated users
    const isInternal = req.headers.get('x-internal-key') === (process.env.SUPABASE_SERVICE_ROLE_KEY || '').slice(0, 20)
    if (!isInternal) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
      }
    }

    const { leadId, companyName } = await req.json()
    if (!leadId) {
      return NextResponse.json({ error: 'leadId obrigatorio' }, { status: 400 })
    }

    // Fetch the lead
    const admin = createAdminClient()
    const { data: lead, error: leadError } = await admin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead nao encontrado' }, { status: 404 })
    }

    // Verify user has access to this org (skip for internal calls)
    if (!isInternal) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: membership } = await supabase
          .from('organization_members')
          .select('id')
          .eq('org_id', lead.org_id)
          .eq('user_id', user.id)
          .single()
        if (!membership) {
          return NextResponse.json({ error: 'Sem acesso a esta organizacao' }, { status: 403 })
        }
      }
    }

    // Determine company name to research
    const nameToResearch = companyName || lead.company
    if (!nameToResearch) {
      return NextResponse.json(
        { error: 'Lead nao possui empresa associada. Informe companyName no body.' },
        { status: 400 }
      )
    }

    // Mark as enriching
    await admin
      .from('leads')
      .update({
        enrichment_status: 'enriching',
        enrichment_updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)

    try {
      // Run enrichment
      const personName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || undefined
      const enrichmentData = await researchCompany(nameToResearch, undefined, personName, lead.email || undefined)

      // Save enrichment data
      const { data: updatedLead, error: updateError } = await admin
        .from('leads')
        .update({
          enrichment_data: enrichmentData,
          enrichment_status: 'enriched',
          enrichment_updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      // Log lead event
      await admin.from('lead_events').insert({
        org_id: lead.org_id,
        lead_id: leadId,
        event_type: 'custom',
        title: 'Enriquecimento realizado',
        description: `Empresa "${nameToResearch}" pesquisada. ${enrichmentData.cnpj ? `CNPJ: ${enrichmentData.cnpj}` : 'CNPJ nao encontrado.'}`,
        metadata: {
          enrichment_source: enrichmentData.cnpj ? 'cnpj+ai' : 'ai_only',
          segmento: enrichmentData.segmento_ia,
        },
      })

      return NextResponse.json({
        success: true,
        lead: updatedLead,
        enrichment_data: enrichmentData,
      })
    } catch (enrichError) {
      // Mark as failed
      await admin
        .from('leads')
        .update({
          enrichment_status: 'failed',
          enrichment_updated_at: new Date().toISOString(),
          enrichment_data: {
            error: enrichError instanceof Error ? enrichError.message : 'Erro desconhecido',
            enriched_at: new Date().toISOString(),
          },
        })
        .eq('id', leadId)

      console.error('[Enrich] Error enriching lead:', enrichError)
      return NextResponse.json(
        { error: 'Erro ao enriquecer lead', details: enrichError instanceof Error ? enrichError.message : 'Erro desconhecido' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[Enrich] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro interno', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
