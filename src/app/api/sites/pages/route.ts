import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/sites/pages — List pages for the org's site
 * Query params: siteId
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const siteId = searchParams.get('siteId')
    if (!siteId) {
      return NextResponse.json({ error: 'siteId obrigatorio' }, { status: 400 })
    }

    const { data: pages, error } = await supabase
      .from('site_pages')
      .select('*')
      .eq('site_id', siteId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching site pages:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ pages: pages || [] })
  } catch (err) {
    console.error('Site pages GET error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao buscar paginas'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/sites/pages — Create a new page
 * Body: { siteId, orgId, slug, title, description, sections, seo, sort_order }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const { siteId, orgId, slug, title, description, sections, seo, sort_order } = body

    if (!siteId || !orgId || !slug || !title) {
      return NextResponse.json({ error: 'siteId, orgId, slug e title sao obrigatorios' }, { status: 400 })
    }

    // Normalize slug
    const normalizedSlug = slug
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    const admin = createAdminClient()

    const { data: page, error } = await admin
      .from('site_pages')
      .insert({
        site_id: siteId,
        org_id: orgId,
        slug: normalizedSlug,
        title,
        description: description || '',
        sections: sections || [],
        seo: seo || {},
        status: 'draft',
        sort_order: sort_order ?? 0,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating site page:', error)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ja existe uma pagina com esse slug neste site' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ page }, { status: 201 })
  } catch (err) {
    console.error('Site pages POST error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao criar pagina'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * PUT /api/sites/pages — Update a page
 * Body: { pageId, ...fields }
 */
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const { pageId, ...updates } = body

    if (!pageId) {
      return NextResponse.json({ error: 'pageId obrigatorio' }, { status: 400 })
    }

    // Only allow updating specific fields
    const allowedFields = [
      'slug', 'title', 'description', 'sections', 'seo', 'status', 'sort_order',
    ]

    const safeUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowedFields) {
      if (key in updates) {
        safeUpdates[key] = updates[key]
      }
    }

    // Normalize slug if being updated
    if (typeof safeUpdates.slug === 'string') {
      safeUpdates.slug = (safeUpdates.slug as string)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    }

    const { data: page, error } = await supabase
      .from('site_pages')
      .update(safeUpdates)
      .eq('id', pageId)
      .select()
      .single()

    if (error) {
      console.error('Error updating site page:', error)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ja existe uma pagina com esse slug neste site' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ page })
  } catch (err) {
    console.error('Site pages PUT error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao atualizar pagina'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
