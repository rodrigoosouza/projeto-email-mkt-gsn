import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/blog — List blog posts for current org
 * Query params: status, category, search, page, limit
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = (page - 1) * limit

    let query = supabase
      .from('blog_posts')
      .select('*, blog_categories(id, name, slug, color)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (category) {
      query = query.eq('category_id', category)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`)
    }

    const { data: posts, error, count } = await query

    if (error) {
      console.error('Error fetching blog posts:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      posts: posts || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (err) {
    console.error('Blog GET error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao buscar posts'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/blog — Create a new blog post
 */
export async function POST(req: NextRequest) {
  try {
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
      org_id,
      ai_generated,
      ai_prompt,
      scheduled_at,
    } = body

    if (!title) {
      return NextResponse.json({ error: 'Titulo obrigatorio' }, { status: 400 })
    }

    if (!org_id) {
      return NextResponse.json({ error: 'org_id obrigatorio' }, { status: 400 })
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^a-z0-9\s-]/g, '') // remove special chars
      .replace(/\s+/g, '-') // spaces to hyphens
      .replace(/-+/g, '-') // collapse multiple hyphens
      .replace(/^-|-$/g, '') // trim hyphens

    // Get author name from user metadata
    const authorName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || ''

    const postData: Record<string, unknown> = {
      org_id,
      title,
      slug,
      content: content || '',
      content_html: content_html || content || '',
      excerpt: excerpt || null,
      featured_image: featured_image || null,
      author_id: user.id,
      author_name: authorName,
      status: status || 'draft',
      category_id: category_id || null,
      tags: tags || [],
      seo_title: seo_title || null,
      seo_description: seo_description || null,
      seo_keywords: seo_keywords || [],
      ai_generated: ai_generated || false,
      ai_prompt: ai_prompt || null,
      scheduled_at: scheduled_at || null,
    }

    // Set published_at if status is published
    if (status === 'published') {
      postData.published_at = new Date().toISOString()
    }

    const { data: post, error } = await supabase
      .from('blog_posts')
      .insert(postData)
      .select('*, blog_categories(id, name, slug, color)')
      .single()

    if (error) {
      console.error('Error creating blog post:', error)
      // Handle unique slug conflict
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ja existe um post com esse slug nesta organizacao' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ post }, { status: 201 })
  } catch (err) {
    console.error('Blog POST error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao criar post'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
