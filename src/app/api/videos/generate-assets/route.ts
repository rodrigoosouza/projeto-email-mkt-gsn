import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Orchestrates: for each scene, generate image then video
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

    const baseUrl = request.url.replace('/api/videos/generate-assets', '')
    const cookies = request.headers.get('cookie') || ''

    const results: { sceneId: string; images: number; videos: number; error?: string }[] = []

    // Process scenes sequentially to avoid rate limits
    for (const scene of scenes) {
      const sceneResult: { sceneId: string; images: number; videos: number; error?: string } = {
        sceneId: scene.id,
        images: 0,
        videos: 0,
      }

      try {
        // Step 1: Generate image
        if (scene.image_prompt) {
          const imgRes = await fetch(`${baseUrl}/api/videos/generate-image`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': cookies,
            },
            body: JSON.stringify({
              sceneId: scene.id,
              imagePrompt: scene.image_prompt,
            }),
          })

          if (imgRes.ok) {
            const imgData = await imgRes.json()
            sceneResult.images = imgData.totalImages || 0

            // Step 2: Generate video using the generated image as reference
            if (scene.video_prompt && imgData.imageUrls?.[0]) {
              const vidRes = await fetch(`${baseUrl}/api/videos/generate-video`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Cookie': cookies,
                },
                body: JSON.stringify({
                  sceneId: scene.id,
                  videoPrompt: scene.video_prompt,
                  referenceImageUrl: imgData.imageUrls[0],
                }),
              })

              if (vidRes.ok) {
                const vidData = await vidRes.json()
                sceneResult.videos = vidData.totalVideos || 0
              } else {
                sceneResult.error = 'Erro ao gerar video'
              }
            }
          } else {
            sceneResult.error = 'Erro ao gerar imagem'
          }
        }
      } catch (err) {
        sceneResult.error = err instanceof Error ? err.message : 'Erro desconhecido'
      }

      results.push(sceneResult)
    }

    // Update project status
    const hasErrors = results.some(r => r.error)
    await supabase
      .from('video_projects')
      .update({ status: hasErrors ? 'ready' : 'ready' })
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
