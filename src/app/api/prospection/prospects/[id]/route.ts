import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PUT: Update status/notes
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { status, notes } = body

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (status) updates.status = status
    if (notes !== undefined) updates.notes = notes

    const { data, error } = await supabase
      .from('prospects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Prospection] Update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ prospect: data })
  } catch (err) {
    console.error('[Prospection] PUT error:', err)
    return NextResponse.json(
      { error: 'Erro interno ao atualizar prospecto' },
      { status: 500 }
    )
  }
}

// POST: Convert to lead
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params

    // Get prospect
    const { data: prospect, error: fetchError } = await supabase
      .from('prospects')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !prospect) {
      return NextResponse.json({ error: 'Prospecto nao encontrado' }, { status: 404 })
    }

    if (prospect.converted_to_lead_id) {
      return NextResponse.json(
        { error: 'Prospecto ja foi convertido em lead' },
        { status: 400 }
      )
    }

    // Split name into first/last
    const nameParts = prospect.name.trim().split(/\s+/)
    const firstName = prospect.owner_name
      ? prospect.owner_name.split(/\s+/)[0]
      : nameParts[0]
    const lastName = prospect.owner_name
      ? prospect.owner_name.split(/\s+/).slice(1).join(' ')
      : nameParts.slice(1).join(' ')

    // Create lead
    const email = prospect.email || `${prospect.place_id || prospect.id}@prospeccao.local`

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        org_id: prospect.org_id,
        email,
        first_name: firstName || prospect.name,
        last_name: lastName || null,
        phone: prospect.phone,
        company: prospect.name,
        source: 'prospeccao-google',
        status: 'active',
        custom_fields: {
          address: prospect.address,
          website: prospect.website,
          rating: prospect.rating,
          segment: prospect.search_segment,
          instagram: prospect.instagram,
          facebook: prospect.facebook,
          linkedin: prospect.linkedin,
          description: prospect.description,
        },
      })
      .select()
      .single()

    if (leadError) {
      // Possibly duplicate email
      if (leadError.code === '23505') {
        return NextResponse.json(
          { error: 'Ja existe um lead com esse email nesta organizacao' },
          { status: 409 }
        )
      }
      console.error('[Prospection] Create lead error:', leadError)
      return NextResponse.json({ error: leadError.message }, { status: 500 })
    }

    // Update prospect status
    await supabase
      .from('prospects')
      .update({
        status: 'converteu',
        converted_to_lead_id: lead.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    // Add tags to lead
    const tags = ['prospeccao-google']
    if (prospect.search_segment) {
      tags.push(prospect.search_segment.toLowerCase().replace(/\s+/g, '-'))
    }

    for (const tag of tags) {
      await supabase.from('lead_tag_assignments').insert({
        lead_id: lead.id,
        tag: tag,
      }).select().maybeSingle()
    }

    return NextResponse.json({ lead, prospect: { ...prospect, status: 'converteu' } })
  } catch (err) {
    console.error('[Prospection] Convert error:', err)
    return NextResponse.json(
      { error: 'Erro interno ao converter prospecto' },
      { status: 500 }
    )
  }
}
