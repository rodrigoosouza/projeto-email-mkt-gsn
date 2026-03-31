import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  publishPhoto,
  publishCarousel,
  publishReels,
  type InstagramConfig,
} from '@/lib/instagram/client'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    // 1. Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { postId, orgId } = await request.json()
    if (!postId || !orgId) {
      return NextResponse.json(
        { error: 'postId e orgId são obrigatórios' },
        { status: 400 }
      )
    }

    // 2. Verify user belongs to org
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Sem permissão para esta organização' },
        { status: 403 }
      )
    }

    const admin = createAdminClient()

    // 3. Fetch the post from content_calendar
    const { data: post, error: postError } = await admin
      .from('content_calendar')
      .select('*')
      .eq('id', postId)
      .eq('org_id', orgId)
      .single()

    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post não encontrado' },
        { status: 404 }
      )
    }

    if (post.published_to_instagram) {
      return NextResponse.json(
        { error: 'Post já foi publicado no Instagram', permalink: post.instagram_permalink },
        { status: 400 }
      )
    }

    // 4. Fetch Instagram account
    const { data: igAccount, error: igError } = await admin
      .from('org_instagram_accounts')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .single()

    if (igError || !igAccount) {
      return NextResponse.json(
        { error: 'Conta Instagram não conectada para esta organização' },
        { status: 400 }
      )
    }

    const config: InstagramConfig = {
      access_token: igAccount.access_token,
      instagram_business_id: igAccount.instagram_business_id,
    }

    // 5. Build caption (title + description, max 2200 chars)
    const captionParts = [post.title]
    if (post.caption) {
      captionParts.push(post.caption)
    }
    if (post.hashtags && post.hashtags.length > 0) {
      captionParts.push(post.hashtags.map((h: string) => (h.startsWith('#') ? h : `#${h}`)).join(' '))
    }
    const caption = captionParts.join('\n\n').slice(0, 2200)

    // 6. Publish based on format
    let result: { id: string; permalink: string | null } | null = null
    const format = post.format as string
    const imageUrls: string[] = post.image_urls || []
    const videoUrls: string[] = post.video_urls || []

    if (format === 'static_post' || format === 'post-estatico') {
      if (imageUrls.length === 0) {
        return NextResponse.json(
          { error: 'Post estático precisa de pelo menos uma imagem' },
          { status: 400 }
        )
      }
      result = await publishPhoto(config, imageUrls[0], caption)
    } else if (format === 'carousel' || format === 'carrossel') {
      if (imageUrls.length < 2) {
        return NextResponse.json(
          { error: 'Carrossel precisa de pelo menos 2 imagens' },
          { status: 400 }
        )
      }
      result = await publishCarousel(config, imageUrls, caption)
    } else if (format === 'reels' || format === 'video-curto') {
      const videoUrl = videoUrls[0] || imageUrls[0]
      if (!videoUrl) {
        return NextResponse.json(
          { error: 'Reels precisa de um vídeo ou imagem' },
          { status: 400 }
        )
      }
      const coverUrl = imageUrls[0] && videoUrls[0] ? imageUrls[0] : undefined
      result = await publishReels(config, videoUrl, caption, coverUrl)
    } else {
      return NextResponse.json(
        { error: `Formato "${format}" não suportado para publicação no Instagram` },
        { status: 400 }
      )
    }

    if (!result) {
      // Update status to failed
      await admin
        .from('content_calendar')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', postId)

      return NextResponse.json(
        { error: 'Falha ao publicar no Instagram. Verifique os logs.' },
        { status: 500 }
      )
    }

    // 7. Update content_calendar with published data
    await admin
      .from('content_calendar')
      .update({
        instagram_media_id: result.id,
        instagram_permalink: result.permalink,
        published_to_instagram: true,
        instagram_published_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        status: 'published',
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)

    return NextResponse.json({
      success: true,
      media_id: result.id,
      permalink: result.permalink,
      message: 'Post publicado no Instagram com sucesso!',
    })
  } catch (error: any) {
    console.error('Instagram publish error:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno ao publicar no Instagram' },
      { status: 500 }
    )
  }
}
