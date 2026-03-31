import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enrichProspect } from '@/lib/prospection/enricher'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { prospectId, orgId } = body

    // Single prospect enrichment
    if (prospectId) {
      const { data: prospect, error } = await supabase
        .from('prospects')
        .select('*')
        .eq('id', prospectId)
        .single()

      if (error || !prospect) {
        return NextResponse.json({ error: 'Prospecto nao encontrado' }, { status: 404 })
      }

      const enriched = await enrichProspect({
        name: prospect.name,
        website: prospect.website,
        address: prospect.address,
        phone: prospect.phone,
      })

      const { data: updated, error: updateError } = await supabase
        .from('prospects')
        .update({
          email: enriched.email || prospect.email,
          owner_name: enriched.owner_name || prospect.owner_name,
          instagram: enriched.instagram || prospect.instagram,
          facebook: enriched.facebook || prospect.facebook,
          linkedin: enriched.linkedin || prospect.linkedin,
          description: enriched.description || prospect.description,
          enriched: true,
          enriched_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', prospectId)
        .select()
        .single()

      if (updateError) {
        console.error('[Prospection] Enrich update error:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({ prospect: updated, enriched })
    }

    // Batch enrichment (up to 10 un-enriched prospects)
    if (orgId) {
      const { data: prospects, error } = await supabase
        .from('prospects')
        .select('*')
        .eq('org_id', orgId)
        .eq('enriched', false)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      if (!prospects || prospects.length === 0) {
        return NextResponse.json({ message: 'Nenhum prospecto para enriquecer', enriched: 0 })
      }

      const results = []

      for (const prospect of prospects) {
        try {
          const enriched = await enrichProspect({
            name: prospect.name,
            website: prospect.website,
            address: prospect.address,
            phone: prospect.phone,
          })

          await supabase
            .from('prospects')
            .update({
              email: enriched.email || prospect.email,
              owner_name: enriched.owner_name || prospect.owner_name,
              instagram: enriched.instagram || prospect.instagram,
              facebook: enriched.facebook || prospect.facebook,
              linkedin: enriched.linkedin || prospect.linkedin,
              description: enriched.description || prospect.description,
              enriched: true,
              enriched_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', prospect.id)

          results.push({ id: prospect.id, name: prospect.name, ...enriched })
        } catch (err) {
          console.warn(`[Prospection] Error enriching ${prospect.name}:`, err)
          results.push({ id: prospect.id, name: prospect.name, error: true })
        }
      }

      return NextResponse.json({
        enriched: results.filter((r) => !('error' in r)).length,
        total: prospects.length,
        results,
      })
    }

    return NextResponse.json(
      { error: 'prospectId ou orgId e obrigatorio' },
      { status: 400 }
    )
  } catch (err) {
    console.error('[Prospection] Enrich error:', err)
    return NextResponse.json(
      { error: 'Erro interno ao enriquecer prospectos' },
      { status: 500 }
    )
  }
}
