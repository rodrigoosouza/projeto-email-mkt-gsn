import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/whatsapp-radar/keywords — List keywords for org
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

    const { data: keywords, error } = await supabase
      .from('whatsapp_keywords')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching keywords:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ keywords: keywords || [] })
  } catch (err) {
    console.error('Keywords GET error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao buscar keywords'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/whatsapp-radar/keywords — Add keyword
 * Body: { orgId, keyword, category }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const { orgId, keyword, category } = body

    if (!orgId || !keyword) {
      return NextResponse.json({ error: 'orgId e keyword obrigatorios' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('whatsapp_keywords')
      .insert({
        org_id: orgId,
        keyword: keyword.toLowerCase().trim(),
        category: category || 'geral',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating keyword:', error)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Keyword ja existe para esta organizacao' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ keyword: data }, { status: 201 })
  } catch (err) {
    console.error('Keywords POST error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao criar keyword'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/whatsapp-radar/keywords — Remove keyword
 * Body: { keywordId }
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const { keywordId } = body

    if (!keywordId) {
      return NextResponse.json({ error: 'keywordId obrigatorio' }, { status: 400 })
    }

    const { error } = await supabase
      .from('whatsapp_keywords')
      .delete()
      .eq('id', keywordId)

    if (error) {
      console.error('Error deleting keyword:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Keywords DELETE error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao remover keyword'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
