import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/sites — Get the site for current org
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

    const { data: site, error } = await supabase
      .from('org_sites')
      .select('*')
      .eq('org_id', orgId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching site:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!site) {
      return NextResponse.json({ site: null })
    }

    // Also fetch pages
    const { data: pages, error: pagesError } = await supabase
      .from('site_pages')
      .select('*')
      .eq('site_id', site.id)
      .order('sort_order', { ascending: true })

    if (pagesError) {
      console.error('Error fetching site pages:', pagesError)
    }

    return NextResponse.json({
      site: { ...site, pages: pages || [] },
    })
  } catch (err) {
    console.error('Sites GET error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao buscar site'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * PUT /api/sites — Update site (global_styles, navigation, footer, seo_global, etc.)
 * Body: { siteId, ...fields }
 */
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const { siteId, ...updates } = body

    if (!siteId) {
      return NextResponse.json({ error: 'siteId obrigatorio' }, { status: 400 })
    }

    // Only allow updating specific fields
    const allowedFields = [
      'name', 'domain', 'custom_domain', 'template',
      'global_styles', 'navigation', 'footer', 'seo_global',
      'gtm_id', 'ga4_id', 'meta_pixel_id', 'status',
      'published_url', 'vercel_deployment_id', 'vercel_project_id',
    ]

    const safeUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowedFields) {
      if (key in updates) {
        safeUpdates[key] = updates[key]
      }
    }

    const { data: site, error } = await supabase
      .from('org_sites')
      .update(safeUpdates)
      .eq('id', siteId)
      .select()
      .single()

    if (error) {
      console.error('Error updating site:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ site })
  } catch (err) {
    console.error('Sites PUT error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao atualizar site'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
