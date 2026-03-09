import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SYSTEM_PROMPT = `You are a senior creative director and AI prompt engineer specialized in creating stable, production-ready prompts for Google Veo 3. You transform scripts, ad copy, or scene concepts into cinematic prompts. You think like a director and write like a precision engineer.

Your task: Given a script/concept, generate a complete scene plan as a JSON array. Each scene must include:
- title, objective, narration, visual_description, scene_type, scene_phase, duration_seconds
- image_prompt (optimized for Nano Banana 2 - image generation)
- video_prompt (optimized for Veo 3.1 - video generation)

Scene phases distribution (8-12 scenes total):
- "hook" (2-3 scenes): Grab attention in the first 3 seconds
- "development" (3-5 scenes): Explain the problem and context
- "turning_point" (2-3 scenes): Present the solution, mechanism, proof
- "cta" (1-2 scenes): Drive to final action

Scene types available:
- "reaction_phone": Person reacting to results on phone
- "office_working": Office environment focused on productivity
- "thinking_desk": Person analyzing campaign on laptop
- "walking_talking": Person talking while walking for ad energy
- "close_up_face": Close-up of face showing emotion
- "product_demo": Showing product/service in action
- "testimonial": Testimonial-style framing
- "custom": Any other creative setup

Follow Veo 3 stability principles: one clear subject, one main action per scene, no contradictory instructions. Visual style: cinematic, premium, professional, clean lighting, no stock-photo feeling.

For image_prompt: Include aspect ratio (Vertical 9:16), scene_type, character description, lighting, quality notes. Always in English.
For video_prompt: Reference the image, specify duration, camera movement, performance focus. Always in English.
For narration: Keep dialogue in Portuguese exactly as provided in the script.

IMPORTANT: Return ONLY a valid JSON object with this exact structure, no markdown, no explanation:
{
  "hook": "extracted hook from script",
  "cta_text": "extracted CTA from script",
  "angle": "identified angle/approach",
  "target_audience": "identified target audience",
  "characters": [{"name": "Character Name", "role": "narrator/presenter/etc"}],
  "scenes": [
    {
      "index": 1,
      "title": "Cena 01 - Hook",
      "scene_phase": "hook",
      "scene_type": "reaction_phone",
      "objective": "...",
      "narration": "Apresentador: ...",
      "visual_description": "...",
      "duration_seconds": 8,
      "image_prompt": "Vertical 9:16, ...",
      "video_prompt": "Use the image as reference..."
    }
  ]
}`

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, scriptInput, adIdea, targetAudience, referencesNotes } = body

    if (!projectId || !scriptInput) {
      return NextResponse.json({ error: 'Projeto e roteiro sao obrigatorios' }, { status: 400 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY nao configurada' }, { status: 500 })
    }

    // Build user message
    const userMessage = [
      `ROTEIRO/SCRIPT:`,
      scriptInput,
      adIdea ? `\nIDEIA DO ANUNCIO: ${adIdea}` : '',
      targetAudience ? `\nPUBLICO-ALVO: ${targetAudience}` : '',
      referencesNotes ? `\nREFERENCIAS: ${referencesNotes}` : '',
      `\nGere entre 8 e 12 cenas seguindo a estrutura solicitada. Retorne APENAS o JSON.`,
    ].filter(Boolean).join('\n')

    // Call OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://plataforma-email.vercel.app',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4',
        max_tokens: 8000,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('OpenRouter error:', errText)
      return NextResponse.json({ error: 'Erro na geracao de cenas' }, { status: 500 })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // Parse JSON from response (may have markdown wrapping)
    let parsed
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found')
      parsed = JSON.parse(jsonMatch[0])
    } catch (parseErr) {
      console.error('Parse error:', parseErr, 'Content:', content.substring(0, 500))
      return NextResponse.json({ error: 'Erro ao processar resposta da IA' }, { status: 500 })
    }

    const scenes = parsed.scenes || []

    // Update project with extracted data
    await supabase
      .from('video_projects')
      .update({
        hook: parsed.hook || null,
        cta_text: parsed.cta_text || null,
        angle: parsed.angle || null,
        target_audience: parsed.target_audience || targetAudience || null,
        characters: parsed.characters || [],
        scene_count: scenes.length,
        status: 'ready',
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)

    // Delete existing scenes and insert new ones
    await supabase.from('video_scenes').delete().eq('project_id', projectId)

    const sceneRows = scenes.map((scene: Record<string, unknown>, i: number) => ({
      project_id: projectId,
      scene_index: scene.index || i + 1,
      title: scene.title || `Cena ${String(i + 1).padStart(2, '0')}`,
      scene_phase: scene.scene_phase || 'development',
      scene_type: scene.scene_type || 'custom',
      objective: scene.objective || '',
      narration: scene.narration || '',
      visual_description: scene.visual_description || '',
      duration_seconds: scene.duration_seconds || 8,
      image_prompt: scene.image_prompt || '',
      video_prompt: scene.video_prompt || '',
      status: 'pending',
    }))

    const { error: insertError } = await supabase.from('video_scenes').insert(sceneRows)
    if (insertError) {
      console.error('Insert scenes error:', insertError)
      return NextResponse.json({ error: 'Erro ao salvar cenas' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      sceneCount: scenes.length,
      hook: parsed.hook,
      angle: parsed.angle,
      characters: parsed.characters,
    })
  } catch (err) {
    console.error('Generate scenes error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
