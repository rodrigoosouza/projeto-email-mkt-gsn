import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { researchCompany } from '@/lib/enrichment/company-research'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { orgId, limit = 5 } = await req.json()
    if (!orgId) {
      return NextResponse.json({ error: 'orgId obrigatorio' }, { status: 400 })
    }

    // Verify user has access to this org
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Sem acesso a esta organizacao' }, { status: 403 })
    }

    const admin = createAdminClient()
    const batchLimit = Math.min(limit, 5) // Cap at 5 to avoid timeout

    // Find leads with company name but pending enrichment
    const { data: leads, error: queryError } = await admin
      .from('leads')
      .select('id, company, email')
      .eq('org_id', orgId)
      .eq('enrichment_status', 'pending')
      .not('company', 'is', null)
      .neq('company', '')
      .order('created_at', { ascending: false })
      .limit(batchLimit)

    if (queryError) {
      console.error('[Enrich Batch] Query error:', queryError)
      return NextResponse.json({ error: 'Erro ao buscar leads' }, { status: 500 })
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({
        success: true,
        enriched: 0,
        failed: 0,
        message: 'Nenhum lead pendente para enriquecimento',
      })
    }

    // Mark all as enriching
    const leadIds = leads.map((l) => l.id)
    await admin
      .from('leads')
      .update({
        enrichment_status: 'enriching',
        enrichment_updated_at: new Date().toISOString(),
      })
      .in('id', leadIds)

    // Enrich sequentially to avoid rate limits
    let enriched = 0
    let failed = 0
    const results: { leadId: string; email: string; status: string; company: string }[] = []

    for (const lead of leads) {
      try {
        const enrichmentData = await researchCompany(lead.company!)

        await admin
          .from('leads')
          .update({
            enrichment_data: enrichmentData,
            enrichment_status: 'enriched',
            enrichment_updated_at: new Date().toISOString(),
          })
          .eq('id', lead.id)

        // Log event
        await admin.from('lead_events').insert({
          org_id: orgId,
          lead_id: lead.id,
          event_type: 'custom',
          title: 'Enriquecimento em lote',
          description: `Empresa "${lead.company}" pesquisada automaticamente.`,
          metadata: {
            enrichment_source: enrichmentData.cnpj ? 'cnpj+ai' : 'ai_only',
            batch: true,
          },
        })

        enriched++
        results.push({ leadId: lead.id, email: lead.email, status: 'enriched', company: lead.company! })
      } catch (error) {
        console.error(`[Enrich Batch] Failed for lead ${lead.id}:`, error)

        await admin
          .from('leads')
          .update({
            enrichment_status: 'failed',
            enrichment_updated_at: new Date().toISOString(),
            enrichment_data: {
              error: error instanceof Error ? error.message : 'Erro desconhecido',
              enriched_at: new Date().toISOString(),
            },
          })
          .eq('id', lead.id)

        failed++
        results.push({ leadId: lead.id, email: lead.email, status: 'failed', company: lead.company! })
      }
    }

    return NextResponse.json({
      success: true,
      enriched,
      failed,
      total: leads.length,
      results,
    })
  } catch (error) {
    console.error('[Enrich Batch] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro interno', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
