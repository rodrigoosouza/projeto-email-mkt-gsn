import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 60

// Aspect ratio based on format
const FORMAT_ASPECT_RATIOS: Record<string, string> = {
  'carrossel': '1:1',
  'post-estatico': '1:1',
  'reels': '9:16',
  'stories': '9:16',
  'video-curto': '9:16',
  'video-longo': '16:9',
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { postId, imagePrompt, format } = await request.json()
    if (!postId || !imagePrompt) {
      return NextResponse.json({ error: 'postId e imagePrompt são obrigatórios' }, { status: 400 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY não configurada' }, { status: 500 })
    }

    const aspectRatio = FORMAT_ASPECT_RATIOS[format] || '1:1'

    // Enhanced prompt for professional social media visuals
    const enhancedPrompt = `Create a high-quality, professional social media image for Instagram.

STYLE REQUIREMENTS:
- Modern, clean, premium design aesthetic
- Dark theme with gold (#D4A017) accent color preferred, or use vibrant gradients
- NO text, NO words, NO letters, NO numbers on the image — the image must be purely visual
- Professional photography or 3D render quality
- Strong visual hierarchy and composition
- Suitable for Instagram ${format === 'reels' || format === 'stories' ? 'Stories/Reels (vertical)' : 'Feed (square)'}

CONCEPT TO VISUALIZE:
${imagePrompt}

IMPORTANT: Do NOT include any text, labels, titles, or watermarks. Create only a striking visual that conveys the concept through imagery, icons, or abstract representations. Think premium brand aesthetic like Apple, Tesla, or high-end consulting firms.`

    // Generate image via OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://plataforma-email.vercel.app',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [{ role: 'user', content: enhancedPrompt }],
        modalities: ['image', 'text'],
        image_config: {
          aspect_ratio: aspectRatio,
          image_size: '1K',
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('OpenRouter image error:', errText)
      return NextResponse.json({ error: 'Erro na API de geração de imagem' }, { status: 500 })
    }

    const data = await response.json()
    const message = data.choices?.[0]?.message
    const imageUrls: string[] = []

    // Extract images from response
    const images = message?.images || []
    for (let i = 0; i < images.length; i++) {
      const img = images[i]
      const dataUrl = img?.image_url?.url || img?.url
      if (!dataUrl || !dataUrl.startsWith('data:')) continue

      const matches = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/)
      if (!matches) continue

      const mimeType = matches[1]
      const base64Data = matches[2]
      const buffer = Buffer.from(base64Data, 'base64')
      const ext = mimeType.includes('png') ? 'png' : 'jpg'
      const fileName = `calendar/${postId}/${Date.now()}_${i}.${ext}`

      const admin = createAdminClient()
      const { error: uploadError } = await admin.storage
        .from('ad-creatives')
        .upload(fileName, buffer, { contentType: mimeType, upsert: true })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        continue
      }

      const { data: urlData } = admin.storage
        .from('ad-creatives')
        .getPublicUrl(fileName)

      imageUrls.push(urlData.publicUrl)
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
    })
  } catch (err) {
    console.error('Generate calendar image error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao gerar imagem'
    return NextResponse.json({ error: message.substring(0, 200) }, { status: 500 })
  }
}
