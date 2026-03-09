import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
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

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GOOGLE_GEMINI_API_KEY nao configurada' }, { status: 500 })
    }

    // Update scene status
    await supabase
      .from('video_scenes')
      .update({ status: 'generating_image' })
      .eq('id', sceneId)

    const ai = new GoogleGenAI({ apiKey })

    // Generate image with Nano Banana 2
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [{
        role: 'user',
        parts: [{ text: imagePrompt }],
      }],
      config: {
        responseModalities: ['image', 'text'],
      },
    })

    const parts = response.candidates?.[0]?.content?.parts || []
    const imageUrls: string[] = []

    for (const part of parts) {
      if (part.inlineData) {
        const { data: base64Data, mimeType } = part.inlineData
        if (!base64Data) continue

        // Upload to Supabase Storage
        const buffer = Buffer.from(base64Data, 'base64')
        const ext = mimeType?.includes('png') ? 'png' : 'jpg'
        const fileName = `videos/${sceneId}/image_${Date.now()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('video-assets')
          .upload(fileName, buffer, {
            contentType: mimeType || 'image/png',
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
    }

    if (imageUrls.length === 0) {
      await supabase
        .from('video_scenes')
        .update({ status: 'pending' })
        .eq('id', sceneId)
      return NextResponse.json({ error: 'Nenhuma imagem gerada' }, { status: 500 })
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
    return NextResponse.json({ error: 'Erro ao gerar imagem' }, { status: 500 })
  }
}
