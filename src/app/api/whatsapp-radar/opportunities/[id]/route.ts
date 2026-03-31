import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * PUT /api/whatsapp-radar/opportunities/[id] — Update opportunity status/notes
 * Body: { status, notes, lastApproachAt }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { status, notes, lastApproachAt } = body

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    if (lastApproachAt) updateData.last_approach_at = lastApproachAt

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const { data: opportunity, error } = await supabase
      .from('whatsapp_opportunities')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating opportunity:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!opportunity) {
      return NextResponse.json({ error: 'Oportunidade nao encontrada' }, { status: 404 })
    }

    return NextResponse.json({ opportunity })
  } catch (err) {
    console.error('Opportunity PUT error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao atualizar oportunidade'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/whatsapp-radar/opportunities/[id] — Convert opportunity to lead
 * Creates a lead from opportunity data, tags it, and links back
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params

    // Fetch the opportunity
    const { data: opportunity, error: fetchError } = await supabase
      .from('whatsapp_opportunities')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !opportunity) {
      return NextResponse.json({ error: 'Oportunidade nao encontrada' }, { status: 404 })
    }

    if (opportunity.converted_to_lead_id) {
      return NextResponse.json({ error: 'Oportunidade ja convertida em lead' }, { status: 409 })
    }

    // Create lead from opportunity data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        org_id: opportunity.org_id,
        first_name: opportunity.name || opportunity.push_name || null,
        phone: opportunity.phone,
        source: 'whatsapp-radar',
        custom_fields: {
          whatsapp_group: opportunity.group_name,
          whatsapp_group_jid: opportunity.group_jid,
          whatsapp_keyword: opportunity.keyword_matched,
          whatsapp_message: opportunity.message_text,
          whatsapp_opportunity_id: opportunity.id,
        },
      })
      .select('id')
      .single()

    if (leadError || !lead) {
      console.error('Error creating lead from opportunity:', leadError)
      return NextResponse.json({ error: leadError?.message || 'Erro ao criar lead' }, { status: 500 })
    }

    // Tag the lead with "radar-whatsapp" and keyword_category
    const tagNames = ['radar-whatsapp']
    if (opportunity.keyword_category && opportunity.keyword_category !== 'geral') {
      tagNames.push(opportunity.keyword_category)
    }

    for (const tagName of tagNames) {
      // Find or create tag
      let { data: tag } = await supabase
        .from('lead_tags')
        .select('id')
        .eq('org_id', opportunity.org_id)
        .eq('name', tagName)
        .single()

      if (!tag) {
        const { data: newTag } = await supabase
          .from('lead_tags')
          .insert({ org_id: opportunity.org_id, name: tagName, color: '#10B981' })
          .select('id')
          .single()
        tag = newTag
      }

      if (tag) {
        await supabase
          .from('lead_tag_assignments')
          .upsert({ lead_id: lead.id, tag_id: tag.id }, { onConflict: 'lead_id,tag_id' })
      }
    }

    // Update opportunity with converted lead reference
    await supabase
      .from('whatsapp_opportunities')
      .update({
        converted_to_lead_id: lead.id,
        status: 'converteu',
      })
      .eq('id', id)

    // Log lead event
    await supabase.from('lead_events').insert({
      org_id: opportunity.org_id,
      lead_id: lead.id,
      event_type: 'custom',
      title: 'Lead criado via Radar WhatsApp',
      description: `Detectado no grupo "${opportunity.group_name}" pela keyword "${opportunity.keyword_matched}"`,
      metadata: {
        source: 'whatsapp-radar',
        group_name: opportunity.group_name,
        keyword: opportunity.keyword_matched,
        original_message: opportunity.message_text,
      },
    })

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      opportunity: {
        ...opportunity,
        converted_to_lead_id: lead.id,
        status: 'converteu',
      },
    }, { status: 201 })
  } catch (err) {
    console.error('Opportunity convert error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao converter oportunidade'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
