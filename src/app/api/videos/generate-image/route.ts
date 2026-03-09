import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { sceneId, imagePrompt } = body

    if (!sceneId || !imagePrompt) {
      return NextResponse.json({ error: 'sceneId e imagePrompt sao obrigatorios' }, { status: 400 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY nao configurada' }, { status: 500 })
    }

    // Update scene status
    await supabase
      .from('video_scenes')
      .update({ status: 'generating_image' })
      .eq('id', sceneId)

    // Generate image via OpenRouter (Nano Banana)
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://plataforma-email.vercel.app',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [{ role: 'user', content: imagePrompt }],
        modalities: ['image', 'text'],
        image_config: {
          aspect_ratio: '9:16',
          image_size: '1K',
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('OpenRouter image error:', errText)
      await supabase.from('video_scenes').update({ status: 'pending' }).eq('id', sceneId)
      return NextResponse.json({ error: 'Erro na API de geracao de imagem' }, { status: 500 })
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

      // Parse base64 data URL
      const matches = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/)
      if (!matches) continue

      const mimeType = matches[1]
      const base64Data = matches[2]
      const buffer = Buffer.from(base64Data, 'base64')
      const ext = mimeType.includes('png') ? 'png' : 'jpg'
      const fileName = `videos/${sceneId}/image_${Date.now()}_${i}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('video-assets')
        .upload(fileName, buffer, {
          contentType: mimeType,
          upsert: true,
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        continue
      }

      const { data: urlData } = supabase.storage
        .from('video-assets')
        .getPublicUrl(fileName)

      imageUrls.push(urlData.publicUrl)
    }

    if (imageUrls.length === 0) {
      await supabase.from('video_scenes').update({ status: 'pending' }).eq('id', sceneId)
      return NextResponse.json({ error: 'Nenhuma imagem gerada. Tente novamente.' }, { status: 500 })
    }

    // Get existing image_urls and append
    const { data: scene } = await supabase
      .from('video_scenes')
      .select('image_urls')
      .eq('id', sceneId)
      .single()

    const existingUrls = (scene?.image_urls as string[]) || []
    const allUrls = [...existingUrls, ...imageUrls]

    await supabase
      .from('video_scenes')
      .update({
        image_urls: allUrls,
        status: 'pending',
      })
      .eq('id', sceneId)

    return NextResponse.json({
      success: true,
      imageUrls,
      totalImages: allUrls.length,
    })
  } catch (err) {
    console.error('Generate image error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao gerar imagem'
    return NextResponse.json({ error: message.substring(0, 200) }, { status: 500 })
  }
}
