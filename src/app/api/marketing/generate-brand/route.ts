import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAI, parseAIJson } from '@/lib/ai-client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { orgId, briefing, persona, icp } = await request.json()

    if (!orgId) {
      return NextResponse.json({ error: 'orgId obrigatorio' }, { status: 400 })
    }

    let context = ''

    if (briefing && Object.keys(briefing).length > 0) {
      const filled = Object.entries(briefing)
        .filter(([, v]) => v && String(v).trim())
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n')
      if (filled) {
        context += `=== BRIEFING ===\n${filled}\n\n`
      }
    }

    if (persona && Object.keys(persona).length > 0) {
      context += `=== PERSONA ===\n${JSON.stringify(persona, null, 2)}\n\n`
    }

    if (icp && Object.keys(icp).length > 0) {
      context += `=== ICP ===\n${JSON.stringify(icp, null, 2)}\n\n`
    }

    if (!context.trim()) {
      return NextResponse.json({ error: 'Preencha o briefing antes de gerar a identidade da marca' }, { status: 400 })
    }

    const prompt = `Voce e um especialista em branding e identidade visual. Com base nas informacoes do cliente abaixo, gere uma identidade de marca completa.

${context}

Retorne APENAS um JSON valido (sem markdown, sem texto extra) com esta estrutura:

{
  "brand_archetype": "valor do arquetipo (um de: heroi, sabio, explorador, criador, governante, mago, amante, bobo, cuidador, inocente, rebelde, cara_comum)",
  "brand_archetype_description": "explicacao detalhada de por que esse arquetipo representa a marca, com exemplos praticos de como aplicar",
  "primary_color": "#hexcolor - cor principal da marca",
  "secondary_color": "#hexcolor - cor secundaria complementar",
  "accent_color": "#hexcolor - cor de destaque/CTA",
  "tone_of_voice": "descricao detalhada do tom de voz ideal para a marca (2-3 frases)",
  "brand_values": ["5-7 valores da marca"],
  "visual_style": "descricao do estilo visual ideal (2-3 frases)",
  "brand_personality": ["5-7 tracos de personalidade da marca"],
  "brand_promise": "promessa central da marca em uma frase impactante",
  "tagline_suggestions": ["5 sugestoes de tagline/slogan"],
  "target_audience_summary": "resumo do publico-alvo em 2-3 frases"
}

REGRAS:
- Escolha cores que combinem com o segmento e transmitam os valores da marca
- O arquetipo deve ser coerente com o posicionamento e publico
- O tom de voz deve ser especifico e acionavel (nao generico)
- As taglines devem ser memoraveis e refletir a promessa da marca
- Seja ESPECIFICO para o nicho do cliente, nao generico
- Retorne APENAS o JSON valido`

    const result = await generateAI({
      messages: [
        { role: 'system', content: 'Voce e um especialista em branding. Responda APENAS em JSON valido, sem markdown.' },
        { role: 'user', content: prompt },
      ],
      maxTokens: 2000,
      temperature: 0.7,
    })

    const brand = parseAIJson(result.content)

    return NextResponse.json({ brand })
  } catch (error) {
    console.error('Brand generation error:', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
