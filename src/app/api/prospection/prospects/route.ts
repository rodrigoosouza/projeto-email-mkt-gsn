import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')
    const status = searchParams.get('status')
    const segment = searchParams.get('segment')
    const search = searchParams.get('search')
    const enriched = searchParams.get('enriched')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    if (!orgId) {
      return NextResponse.json({ error: 'orgId e obrigatorio' }, { status: 400 })
    }

    let query = supabase
      .from('prospects')
      .select('*', { count: 'exact' })
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (segment && segment !== 'all') {
      query = query.eq('search_segment', segment)
    }

    if (enriched === 'true') {
      query = query.eq('enriched', true)
    } else if (enriched === 'false') {
      query = query.eq('enriched', false)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[Prospection] List error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      prospects: data || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (err) {
    console.error('[Prospection] Prospects GET error:', err)
    return NextResponse.json(
      { error: 'Erro interno ao listar prospectos' },
      { status: 500 }
    )
  }
}
