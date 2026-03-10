import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Orchestrates: for each scene, generate image via OpenRouter
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, sceneIds } = body

    if (!projectId) {
      return NextResponse.json({ error: 'projectId obrigatorio' }, { status: 400 })
    }

    // Verify project belongs to user's org (via RLS)
    const { data: project, error: projErr } = await supabase
      .from('video_projects')
      .select('id')
      .eq('id', projectId)
      .single()

    if (projErr || !project) {
      return NextResponse.json({ error: 'Projeto nao encontrado' }, { status: 404 })
    }

    // Get scenes to process
    let query = supabase
      .from('video_scenes')
      .select('id, image_prompt, video_prompt, image_urls')
      .eq('project_id', projectId)
      .order('scene_index', { ascending: true })

    if (sceneIds && sceneIds.length > 0) {
      query = query.in('id', sceneIds)
    }

    const { data: scenes, error } = await query

    if (error || !scenes || scenes.length === 0) {
      return NextResponse.json({ error: 'Nenhuma cena encontrada' }, { status: 404 })
    }

    // Update project status
    await supabase
      .from('video_projects')
      .update({ status: 'generating' })
      .eq('id', projectId)

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY nao configurada' }, { status: 500 })
    }

    const results: { sceneId: string; images: number; error?: string }[] = []

    // Process scenes sequentially to avoid rate limits
    for (const scene of scenes) {
      const sceneResult: { sceneId: string; images: number; error?: string } = {
        sceneId: scene.id,
        images: 0,
      }

      try {
        if (scene.image_prompt) {
          // Update scene status
          await supabase
            .from('video_scenes')
            .update({ status: 'generating_image' })
            .eq('id', scene.id)

          // Generate image via OpenRouter directly (same logic as generate-image route)
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://plataforma-email.vercel.app',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash-image',
              messages: [{ role: 'user', content: scene.image_prompt }],
              modalities: ['image', 'text'],
              image_config: { aspect_ratio: '9:16', image_size: '1K' },
            }),
          })

          if (!response.ok) {
            sceneResult.error = 'Erro na API de imagem'
            await supabase.from('video_scenes').update({ status: 'pending' }).eq('id', scene.id)
            results.push(sceneResult)
            continue
          }

          const data = await response.json()
          const images = data.choices?.[0]?.message?.images || []
          const imageUrls: string[] = []

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
            const fileName = `videos/${scene.id}/image_${Date.now()}_${i}.${ext}`

            const { error: uploadError } = await supabase.storage
              .from('video-assets')
              .upload(fileName, buffer, { contentType: mimeType, upsert: true })

            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from('video-assets')
                .getPublicUrl(fileName)
              imageUrls.push(urlData.publicUrl)
            }
          }

          const existingUrls = (scene.image_urls as string[]) || []
          const allUrls = [...existingUrls, ...imageUrls]

          await supabase
            .from('video_scenes')
            .update({ image_urls: allUrls, status: 'pending' })
            .eq('id', scene.id)

          sceneResult.images = imageUrls.length
        }
      } catch (err) {
        sceneResult.error = err instanceof Error ? err.message : 'Erro desconhecido'
        await supabase.from('video_scenes').update({ status: 'pending' }).eq('id', scene.id)
      }

      results.push(sceneResult)
    }

    // Update project status back to ready
    await supabase
      .from('video_projects')
      .update({ status: 'ready' })
      .eq('id', projectId)

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    })
  } catch (err) {
    console.error('Generate assets error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
