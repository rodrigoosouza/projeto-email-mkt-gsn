import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 120

// Aspect ratio based on format
const FORMAT_ASPECT_RATIOS: Record<string, string> = {
  'carrossel': '1:1',
  'post-estatico': '1:1',
  'reels': '9:16',
  'stories': '9:16',
  'video-curto': '9:16',
  'video-longo': '16:9',
}

// How many images to generate per format
const FORMAT_IMAGE_COUNT: Record<string, number> = {
  'carrossel': 5,  // 5 cards by default
  'post-estatico': 1,
  'reels': 1,
  'stories': 1,
  'video-curto': 1,
  'video-longo': 1,
}

function buildPrompt(imagePrompt: string, aspectRatio: string, format: string, cardIndex?: number, totalCards?: number): string {
  const isVertical = aspectRatio === '9:16'
  const isWide = aspectRatio === '16:9'
  const orientation = isVertical ? 'Vertical 9:16' : isWide ? 'Horizontal 16:9' : 'Square 1:1'

  const isCarousel = format === 'carrossel'
  const isReels = format === 'reels' || format === 'video-curto'

  let contextLine = ''
  if (isCarousel && cardIndex !== undefined && totalCards) {
    if (cardIndex === 0) {
      contextLine = `\nThis is CARD 1 of ${totalCards} (COVER CARD) — must be the most eye-catching, hook the viewer to swipe. Bold visual, create curiosity.`
    } else if (cardIndex === totalCards - 1) {
      contextLine = `\nThis is CARD ${cardIndex + 1} of ${totalCards} (LAST CARD / CTA) — conclusion card, should feel like a satisfying ending or call to action visually. Use warm tones, gold accents.`
    } else {
      contextLine = `\nThis is CARD ${cardIndex + 1} of ${totalCards} — content card, should maintain visual consistency with the series. Each card explores a different aspect of the topic.`
    }
  }

  if (isReels) {
    contextLine = `\nThis is a BASE PHOTO for a Reels/short video. It will be animated later. Create a dynamic, cinematic composition that suggests movement and energy.`
  }

  return `${orientation}, cinematic social media image, ultra high quality, 8K render.
${contextLine}
Scene concept: ${imagePrompt}

Style direction: Premium corporate aesthetic, dark moody background (#0D1117), selective gold (#D4A017) accent lighting. Clean composition with strong focal point. Depth of field, volumetric lighting, subtle lens flare. Professional color grading — deep blacks, rich contrast, warm gold highlights.

Technical: Shot on Sony A7IV, 35mm f/1.4 lens, shallow depth of field. Studio lighting setup with key light at 45 degrees, rim light for separation. Post-processed in Lightroom with cinematic LUT.

CRITICAL RULES:
- ABSOLUTELY NO text, words, letters, numbers, labels, watermarks, or any written content in the image
- No stock photo look — must feel authentic and premium
- One clear subject/focal point per card
- Rich detail and texture
- Professional business/corporate context
- If showing people: confident, professional, diverse, natural expressions
${isCarousel ? '- Keep consistent color palette and visual style across all cards in the carousel' : ''}`
}

async function generateSingleImage(
  apiKey: string,
  prompt: string,
  aspectRatio: string,
  postId: string,
  index: number
): Promise<string | null> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://plataforma-email.vercel.app',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-image',
      messages: [{ role: 'user', content: prompt }],
      modalities: ['image', 'text'],
      image_config: {
        aspect_ratio: aspectRatio,
        image_size: '1K',
      },
    }),
  })

  if (!response.ok) {
    console.error(`Image generation ${index} failed:`, await response.text())
    return null
  }

  const data = await response.json()
  const images = data.choices?.[0]?.message?.images || []

  for (const img of images) {
    const dataUrl = img?.image_url?.url || img?.url
    if (!dataUrl || !dataUrl.startsWith('data:')) continue

    const matches = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/)
    if (!matches) continue

    const mimeType = matches[1]
    const base64Data = matches[2]
    const buffer = Buffer.from(base64Data, 'base64')
    const ext = mimeType.includes('png') ? 'png' : 'jpg'
    const fileName = `calendar/${postId}/${Date.now()}_card${String(index + 1).padStart(2, '0')}.${ext}`

    const admin = createAdminClient()
    const { error: uploadError } = await admin.storage
      .from('ad-creatives')
      .upload(fileName, buffer, { contentType: mimeType, upsert: true })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return null
    }

    const { data: urlData } = admin.storage
      .from('ad-creatives')
      .getPublicUrl(fileName)

    return urlData.publicUrl
  }

  return null
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { postId, imagePrompt, format, cardCount } = await request.json()
    if (!postId || !imagePrompt) {
      return NextResponse.json({ error: 'postId e imagePrompt são obrigatórios' }, { status: 400 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY não configurada' }, { status: 500 })
    }

    const aspectRatio = FORMAT_ASPECT_RATIOS[format] || '1:1'
    const isCarousel = format === 'carrossel'
    const numImages = isCarousel ? (cardCount || FORMAT_IMAGE_COUNT[format] || 5) : 1

    const imageUrls: string[] = []

    if (isCarousel) {
      // Generate carousel cards sequentially (to maintain consistency)
      for (let i = 0; i < numImages; i++) {
        const prompt = buildPrompt(imagePrompt, aspectRatio, format, i, numImages)
        const url = await generateSingleImage(apiKey, prompt, aspectRatio, postId, i)
        if (url) imageUrls.push(url)
      }
    } else {
      // Single image (post, reels base photo, story)
      const prompt = buildPrompt(imagePrompt, aspectRatio, format)
      const url = await generateSingleImage(apiKey, prompt, aspectRatio, postId, 0)
      if (url) imageUrls.push(url)
    }

    if (imageUrls.length === 0) {
      return NextResponse.json({ error: 'Nenhuma imagem gerada. Tente novamente.' }, { status: 500 })
    }

    // Update post with generated image URLs
    const admin = createAdminClient()
    const { data: post } = await admin
      .from('content_calendar')
      .select('image_urls')
      .eq('id', postId)
      .single()

    const existingUrls = (post?.image_urls as string[]) || []
    const allUrls = [...existingUrls, ...imageUrls]

    await admin
      .from('content_calendar')
      .update({ image_urls: allUrls })
      .eq('id', postId)

    return NextResponse.json({
      success: true,
      imageUrls,
      totalImages: allUrls.length,
      cardsGenerated: imageUrls.length,
    })
  } catch (err) {
    console.error('Generate calendar image error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao gerar imagem'
    return NextResponse.json({ error: message.substring(0, 200) }, { status: 500 })
  }
}
