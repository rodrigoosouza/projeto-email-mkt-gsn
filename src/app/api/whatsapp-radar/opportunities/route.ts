import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/whatsapp-radar/opportunities — List opportunities for org
 * Query params: orgId, status, keyword, group, limit, offset
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

    const status = searchParams.get('status')
    const keyword = searchParams.get('keyword')
    const group = searchParams.get('group')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('whatsapp_opportunities')
      .select('*', { count: 'exact' })
      .eq('org_id', orgId)
      .order('detected_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (keyword) {
      query = query.eq('keyword_matched', keyword)
    }

    if (group) {
      query = query.eq('group_jid', group)
    }

    const { data: opportunities, error, count } = await query

    if (error) {
      console.error('Error fetching opportunities:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      opportunities: opportunities || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (err) {
    console.error('Opportunities GET error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao buscar oportunidades'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/whatsapp-radar/opportunities — Create opportunity (used by Go service webhook)
 * Auth via x-internal-key header
 * Body: { orgId, phone, name, pushName, groupJid, groupName, messageText, keywordMatched, keywordCategory }
 */
export async function POST(req: NextRequest) {
  try {
    const internalKey = req.headers.get('x-internal-key')
    const expectedKey = process.env.INTERNAL_API_KEY

    if (!internalKey || internalKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      orgId,
      phone,
      name,
      pushName,
      groupJid,
      groupName,
      messageText,
      keywordMatched,
      keywordCategory,
    } = body

    if (!orgId || !phone || !groupJid || !groupName || !messageText || !keywordMatched) {
      return NextResponse.json({ error: 'Campos obrigatorios: orgId, phone, groupJid, groupName, messageText, keywordMatched' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Create opportunity
    const { data: opportunity, error } = await supabase
      .from('whatsapp_opportunities')
      .insert({
        org_id: orgId,
        phone,
        name: name || null,
        push_name: pushName || null,
        group_jid: groupJid,
        group_name: groupName,
        message_text: messageText,
        keyword_matched: keywordMatched,
        keyword_category: keywordCategory || 'geral',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating opportunity:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Increment keyword matches_count
    try {
      await supabase
      .from('whatsapp_keywords')
      .select('matches_count')
      .eq('org_id', orgId)
      .eq('keyword', keywordMatched)
      .single()
      .then(async ({ data: kw }) => {
        if (kw) {
          await supabase
            .from('whatsapp_keywords')
            .update({ matches_count: (kw.matches_count || 0) + 1 })
            .eq('org_id', orgId)
            .eq('keyword', keywordMatched)
        }
      })
    } catch { /* non-fatal */ }

    return NextResponse.json({ opportunity }, { status: 201 })
  } catch (err) {
    console.error('Opportunities POST error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao criar oportunidade'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
