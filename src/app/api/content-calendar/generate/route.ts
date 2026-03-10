import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/org-context'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { orgId, month, platform } = await req.json()
    if (!orgId || !month) {
      return NextResponse.json({ error: 'orgId e month sao obrigatorios' }, { status: 400 })
    }

    // Load org context
    const orgContext = await getOrgContext(orgId)
    if (!orgContext) {
      return NextResponse.json({ error: 'Organizacao nao encontrada' }, { status: 404 })
    }

    const prompt = buildCalendarPrompt(orgContext.summary, month, platform || 'instagram')

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4',
        max_tokens: 8000,
        messages: [
          {
            role: 'system',
            content: 'Voce e um estrategista de conteudo digital especializado no Metodo Hyesser. Responda APENAS em JSON valido, sem markdown, sem explicacoes.'
          },
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!response.ok) {
      const errBody = await response.text().catch(() => '')
      throw new Error(`OpenRouter error: ${response.status} - ${errBody.substring(0, 200)}`)
    }

    const data = await response.json()
    const content = data.choices[0].message.content || ''

    // Parse JSON from response
    let posts
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      posts = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content)
    } catch {
      return NextResponse.json({ error: 'Erro ao parsear resposta da IA', raw: content }, { status: 500 })
    }

    return NextResponse.json({ posts, model: data.model })
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[Content Calendar] Error:', errMsg)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

function buildCalendarPrompt(orgSummary: string, month: string, platform: string): string {
  return `Gere um calendario de conteudo para o mes ${month} na plataforma ${platform}, seguindo o Metodo Hyesser.

CONTEXTO DA EMPRESA:
${orgSummary}

METODO HYESSER - 4 PILARES:
1. CRESCIMENTO (44% - 4 posts/semana): Dicas, tutoriais, reels envolventes, carrosseis informativos, frases motivacionais
2. CONEXAO (22% - 2 posts/semana): Historia pessoal, valores, bastidores, dia-a-dia
3. QUEBRA DE OBJECOES (22% - 2 posts/semana): Depoimentos, cases, resultados, antes/depois, FAQ
4. AUTORIDADE (12% - 1 post/semana): Eventos, certificacoes, colaboracoes, entrevistas

REGRAS:
- Gere posts para cada dia util do mes (segunda a sexta) + 2 bonus no sabado/domingo
- Total: ~30 posts no mes
- Distribua proporcionalmente pelos 4 pilares
- Para cada post inclua: titulo, pilar, tipo, formato, copy completa com hashtags e CTA, prompt para gerar imagem, horario sugerido
- Adapte o tom ao contexto da empresa
- CTAs devem direcionar para acoes relevantes (link bio, DM, site, etc.)

FORMATO DE RESPOSTA (JSON array):
[
  {
    "title": "Titulo do post",
    "pillar": "growth|connection|objection_breaking|authority",
    "content_type": "tip|tutorial|reels|carousel|motivational_quote|personal_story|behind_scenes|values|testimonial|case_study|results|event|certification|collaboration",
    "format": "reels|carousel|static_post|stories|article",
    "platform": "${platform}",
    "scheduled_for": "YYYY-MM-DDTHH:MM:00Z",
    "caption": "Copy completa com emojis, hashtags e CTA",
    "hashtags": ["hashtag1", "hashtag2"],
    "image_prompt": "Prompt detalhado para gerar imagem com IA"
  }
]

Retorne APENAS o JSON array, sem texto adicional.`
}
