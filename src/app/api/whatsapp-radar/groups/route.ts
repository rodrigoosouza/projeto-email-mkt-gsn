import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/whatsapp-radar/groups — List monitored groups for org
 * Query params: orgId
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const orgId = searchParams.get('orgId')
    if (!orgId) {
      return NextResponse.json({ error: 'orgId obrigatorio' }, { status: 400 })
    }

    const { data: groups, error } = await supabase
      .from('whatsapp_monitored_groups')
      .select('*')
      .eq('org_id', orgId)
      .order('added_at', { ascending: false })

    if (error) {
      console.error('Error fetching groups:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ groups: groups || [] })
  } catch (err) {
    console.error('Groups GET error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao buscar grupos'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/whatsapp-radar/groups — Add group to monitor
 * Body: { orgId, groupJid, groupName, participantCount }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const { orgId, groupJid, groupName, participantCount } = body

    if (!orgId || !groupJid || !groupName) {
      return NextResponse.json({ error: 'orgId, groupJid e groupName obrigatorios' }, { status: 400 })
    }

    const { data: group, error } = await supabase
      .from('whatsapp_monitored_groups')
      .insert({
        org_id: orgId,
        group_jid: groupJid,
        group_name: groupName,
        participant_count: participantCount || 0,
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding group:', error)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Grupo ja monitorado nesta organizacao' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ group }, { status: 201 })
  } catch (err) {
    console.error('Groups POST error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao adicionar grupo'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/whatsapp-radar/groups — Remove group
 * Body: { groupId }
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const { groupId } = body

    if (!groupId) {
      return NextResponse.json({ error: 'groupId obrigatorio' }, { status: 400 })
    }

    const { error } = await supabase
      .from('whatsapp_monitored_groups')
      .delete()
      .eq('id', groupId)

    if (error) {
      console.error('Error deleting group:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Groups DELETE error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao remover grupo'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
