import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 120

function buildBlogImagePrompt(title: string, excerpt?: string): string {
  const context = excerpt ? `\nArticle summary: ${excerpt}` : ''

  return `Horizontal 16:9, editorial blog featured image, ultra high quality, 8K render.
${context}
Scene concept: Visual representation of "${title}" — create an evocative, editorial-quality image that captures the essence of this article topic.

Style direction: Modern editorial aesthetic, clean and sophisticated. Soft gradient backgrounds with subtle depth. Professional color palette — deep blues, warm neutrals, selective accent colors. Elegant composition with clear focal point. Soft, diffused lighting creating a premium feel.

Technical: Shot on Canon EOS R5, 50mm f/1.8 lens, medium depth of field. Natural window lighting mixed with soft fill. Post-processed with clean, editorial color grading — balanced exposure, natural skin tones if people present, subtle vignetting.

CRITICAL RULES:
- ABSOLUTELY NO text, words, letters, numbers, labels, watermarks, or any written content in the image
- No stock photo look — must feel authentic and premium
- One clear subject/focal point
- Rich detail and texture
- Professional, editorial blog context
- If showing people: confident, professional, natural expressions
- Clean, uncluttered composition suitable for a blog header`
}

/**
 * POST /api/blog/generate-image — Generate featured image for a blog post
 * Body: { title, excerpt, orgId }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { title, excerpt, orgId } = await req.json()

    if (!title) {
      return NextResponse.json({ error: 'Titulo obrigatorio' }, { status: 400 })
    }

    if (!orgId) {
      return NextResponse.json({ error: 'orgId obrigatorio' }, { status: 400 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY nao configurada' }, { status: 500 })
    }

    const prompt = buildBlogImagePrompt(title, excerpt)

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
          aspect_ratio: '16:9',
          image_size: '1K',
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Image generation failed:', errText)
      return NextResponse.json({ error: 'Falha ao gerar imagem. Tente novamente.' }, { status: 500 })
    }

    const data = await response.json()
    const images = data.choices?.[0]?.message?.images || []

    let imageUrl: string | null = null

    for (const img of images) {
      const dataUrl = img?.image_url?.url || img?.url
      if (!dataUrl || !dataUrl.startsWith('data:')) continue

      const matches = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/)
      if (!matches) continue

      const mimeType = matches[1]
      const base64Data = matches[2]
      const buffer = Buffer.from(base64Data, 'base64')
      const ext = mimeType.includes('png') ? 'png' : 'jpg'
      const fileName = `blog/${orgId}/${Date.now()}.${ext}`

      const admin = createAdminClient()
      const { error: uploadError } = await admin.storage
        .from('ad-creatives')
        .upload(fileName, buffer, { contentType: mimeType, upsert: true })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return NextResponse.json({ error: 'Erro ao fazer upload da imagem' }, { status: 500 })
      }

      const { data: urlData } = admin.storage
        .from('ad-creatives')
        .getPublicUrl(fileName)

      imageUrl = urlData.publicUrl
      break
    }

    if (!imageUrl) {
      return NextResponse.json({ error: 'Nenhuma imagem gerada. Tente novamente.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      imageUrl,
    })
  } catch (err) {
    console.error('Blog generate-image error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao gerar imagem'
    return NextResponse.json({ error: message.substring(0, 200) }, { status: 500 })
  }
}
