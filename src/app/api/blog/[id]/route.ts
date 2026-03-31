import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/blog/[id] — Get a single blog post by ID
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { data: post, error } = await supabase
      .from('blog_posts')
      .select('*, blog_categories(id, name, slug, color)')
      .eq('id', id)
      .single()

    if (error || !post) {
      return NextResponse.json({ error: 'Post nao encontrado' }, { status: 404 })
    }

    return NextResponse.json({ post })
  } catch (err) {
    console.error('Blog GET [id] error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao buscar post'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * PUT /api/blog/[id] — Update a blog post
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const {
      title,
      content,
      content_html,
      excerpt,
      featured_image,
      status,
      category_id,
      tags,
      seo_title,
      seo_description,
      seo_keywords,
      canonical_url,
      og_image,
      ai_generated,
      ai_prompt,
      scheduled_at,
    } = body

    const updateData: Record<string, unknown> = {}

    // Only set fields that were provided
    if (title !== undefined) {
      updateData.title = title
      // Regenerate slug when title changes
      updateData.slug = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    }
    if (content !== undefined) {
      updateData.content = content
      updateData.content_html = content_html || content
    }
    if (excerpt !== undefined) updateData.excerpt = excerpt
    if (featured_image !== undefined) updateData.featured_image = featured_image
    if (category_id !== undefined) updateData.category_id = category_id || null
    if (tags !== undefined) updateData.tags = tags
    if (seo_title !== undefined) updateData.seo_title = seo_title
    if (seo_description !== undefined) updateData.seo_description = seo_description
    if (seo_keywords !== undefined) updateData.seo_keywords = seo_keywords
    if (canonical_url !== undefined) updateData.canonical_url = canonical_url
    if (og_image !== undefined) updateData.og_image = og_image
    if (ai_generated !== undefined) updateData.ai_generated = ai_generated
    if (ai_prompt !== undefined) updateData.ai_prompt = ai_prompt
    if (scheduled_at !== undefined) updateData.scheduled_at = scheduled_at

    if (status !== undefined) {
      updateData.status = status
      // Set published_at when first published
      if (status === 'published') {
        const { data: existing } = await supabase
          .from('blog_posts')
          .select('published_at')
          .eq('id', id)
          .single()

        if (!existing?.published_at) {
          updateData.published_at = new Date().toISOString()
        }
      }
    }

    const { data: post, error } = await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('id', id)
      .select('*, blog_categories(id, name, slug, color)')
      .single()

    if (error) {
      console.error('Error updating blog post:', error)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ja existe um post com esse slug nesta organizacao' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!post) {
      return NextResponse.json({ error: 'Post nao encontrado' }, { status: 404 })
    }

    return NextResponse.json({ post })
  } catch (err) {
    console.error('Blog PUT error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao atualizar post'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/blog/[id] — Delete a blog post (hard delete)
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting blog post:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Blog DELETE error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao deletar post'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
