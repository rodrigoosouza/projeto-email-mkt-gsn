import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 300 // 5 min timeout for Vercel

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { sceneId, videoPrompt } = body

    if (!sceneId || !videoPrompt) {
      return NextResponse.json({ error: 'sceneId e videoPrompt sao obrigatorios' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GOOGLE_GEMINI_API_KEY nao configurada' }, { status: 500 })
    }

    // Update scene status
    await supabase
      .from('video_scenes')
      .update({ status: 'generating_video' })
      .eq('id', sceneId)

    const ai = new GoogleGenAI({ apiKey })

    // Generate video with Veo — returns a long-running operation
    const operation = await ai.models.generateVideos({
      model: 'veo-2.0-generate-001',
      prompt: videoPrompt,
      config: {
        aspectRatio: '9:16',
        numberOfVideos: 1,
      },
    })

    // Poll using the operation name via REST API
    const operationName = operation.name
    if (!operationName) {
      await supabase.from('video_scenes').update({ status: 'pending' }).eq('id', sceneId)
      return NextResponse.json({ error: 'Operacao sem nome para polling' }, { status: 500 })
    }

    const maxAttempts = 20 // 20 * 15s = 5 min
    let attempts = 0
    let done = operation.done || false
    let pollResult: Record<string, unknown> | null = null

    while (!done && attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 15000))

      // Poll via REST
      const pollRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`
      )

      if (pollRes.ok) {
        const pollData = await pollRes.json()
        done = pollData.done === true
        if (done) {
          pollResult = pollData
        }
      }
      attempts++
    }

    if (!done) {
      await supabase.from('video_scenes').update({ status: 'pending' }).eq('id', sceneId)
      return NextResponse.json({ error: 'Timeout na geracao de video' }, { status: 504 })
    }

    // Extract videos from result
    const opResult = pollResult || {}
    const resultData = (opResult.result || opResult.response || {}) as Record<string, unknown>
    const genVideos = (resultData.generatedVideos ||
      resultData.generated_videos || []) as Array<Record<string, unknown>>

    const videoUrls: string[] = []

    for (const video of genVideos) {
      const videoData = (video.video || video) as Record<string, unknown>
      const uri = (videoData.uri || videoData.video_uri) as string | undefined
      if (!uri) continue

      try {
        const videoResponse = await fetch(uri)
        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer())
        const fileName = `videos/${sceneId}/video_${Date.now()}.mp4`

        const { error: uploadError } = await supabase.storage
          .from('video-assets')
          .upload(fileName, videoBuffer, {
            contentType: 'video/mp4',
            upsert: true,
          })

        if (uploadError) {
          console.error('Video upload error:', uploadError)
          continue
        }

        const { data: urlData } = supabase.storage
          .from('video-assets')
          .getPublicUrl(fileName)

        videoUrls.push(urlData.publicUrl)
      } catch (fetchErr) {
        console.error('Video fetch error:', fetchErr)
      }
    }

    if (videoUrls.length === 0) {
      await supabase.from('video_scenes').update({ status: 'pending' }).eq('id', sceneId)
      return NextResponse.json({ error: 'Nenhum video gerado' }, { status: 500 })
    }

    // Get existing video_urls and append
    const { data: scene } = await supabase
      .from('video_scenes')
      .select('video_urls')
      .eq('id', sceneId)
      .single()

    const existingUrls = (scene?.video_urls as string[]) || []
    const allUrls = [...existingUrls, ...videoUrls]

    await supabase
      .from('video_scenes')
      .update({ video_urls: allUrls, status: 'pending' })
      .eq('id', sceneId)

    return NextResponse.json({
      success: true,
      videoUrls,
      totalVideos: allUrls.length,
    })
  } catch (err) {
    console.error('Generate video error:', err)
    const message = err instanceof Error ? err.message : ''
    if (message.includes('billing') || message.includes('FAILED_PRECONDITION')) {
      return NextResponse.json({
        error: 'Veo 3 requer Google Cloud Billing ativado. Acesse console.cloud.google.com/billing para ativar ($300 credito gratis).'
      }, { status: 402 })
    }
    if (message.includes('quota') || message.includes('rate')) {
      return NextResponse.json({ error: 'Limite de quota da API atingido. Aguarde alguns minutos.' }, { status: 429 })
    }
    return NextResponse.json({ error: 'Erro ao gerar video' }, { status: 500 })
  }
}
