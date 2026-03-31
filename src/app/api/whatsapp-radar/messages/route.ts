import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/whatsapp-radar/messages — Messages for a group or chat
 * Query params: orgId, groupJid or chatJid, limit (default 50), before (timestamp for pagination)
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
    const groupJid = searchParams.get('groupJid')
    const chatJid = searchParams.get('chatJid')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const before = searchParams.get('before')

    if (!orgId) {
      return NextResponse.json({ error: 'orgId obrigatorio' }, { status: 400 })
    }

    if (!groupJid && !chatJid) {
      return NextResponse.json({ error: 'groupJid ou chatJid obrigatorio' }, { status: 400 })
    }

    let query = supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('org_id', orgId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (groupJid) {
      query = query.eq('group_jid', groupJid)
    }

    if (chatJid) {
      query = query.eq('chat_jid', chatJid)
    }

    if (before) {
      query = query.lt('timestamp', before)
    }

    const { data: messages, error } = await query

    if (error) {
      console.error('Error fetching messages:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ messages: messages || [] })
  } catch (err) {
    console.error('Messages GET error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao buscar mensagens'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/whatsapp-radar/messages — Send message (stores in DB)
 * Actual sending will be done by Go service polling or webhook
 * Body: { orgId, chatJid, messageText }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const { orgId, chatJid, messageText } = body

    if (!orgId || !chatJid || !messageText) {
      return NextResponse.json({ error: 'orgId, chatJid e messageText obrigatorios' }, { status: 400 })
    }

    const { data: message, error } = await supabase
      .from('whatsapp_messages')
      .insert({
        org_id: orgId,
        chat_jid: chatJid,
        message_text: messageText,
        is_from_me: true,
        message_type: 'text',
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving message:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message }, { status: 201 })
  } catch (err) {
    console.error('Messages POST error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao salvar mensagem'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
