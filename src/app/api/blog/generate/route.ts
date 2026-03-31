import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAI, parseAIJson } from '@/lib/ai-client'

export const maxDuration = 60

const LENGTH_MAP: Record<string, string> = {
  short: '~500 palavras',
  medium: '~1000 palavras',
  long: '~2000 palavras',
}

const TONE_MAP: Record<string, string> = {
  professional: 'profissional e corporativo',
  conversational: 'conversacional e acessivel',
  educational: 'educativo e didatico',
  persuasive: 'persuasivo e envolvente',
}

/**
 * POST /api/blog/generate — AI article generation
 * Body: { topic, keywords, tone, length, orgId }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { topic, keywords, tone, length, orgId } = await req.json()

    if (!topic) {
      return NextResponse.json({ error: 'Topico obrigatorio' }, { status: 400 })
    }

    if (!orgId) {
      return NextResponse.json({ error: 'orgId obrigatorio' }, { status: 400 })
    }

    const toneDesc = TONE_MAP[tone] || TONE_MAP.professional
    const lengthDesc = LENGTH_MAP[length] || LENGTH_MAP.medium
    const keywordsStr = Array.isArray(keywords) ? keywords.join(', ') : (keywords || '')

    const systemPrompt = `Voce e um redator de blog especialista em SEO e marketing de conteudo.
Escreva artigos em portugues brasileiro com alta qualidade editorial.
Retorne APENAS um JSON valido (sem markdown code blocks) no formato especificado.`

    const userPrompt = `Escreva um artigo completo de blog sobre o seguinte topico:

**Topico:** ${topic}
${keywordsStr ? `**Palavras-chave para incluir:** ${keywordsStr}` : ''}
**Tom:** ${toneDesc}
**Tamanho:** ${lengthDesc}

Retorne um JSON com esta estrutura exata:
{
  "title": "Titulo SEO-otimizado (max 60 caracteres)",
  "content": "Artigo completo em markdown. Use ## para secoes, paragrafos bem desenvolvidos, bullet points quando apropriado. Inclua introducao, desenvolvimento com subtopicos e conclusao.",
  "excerpt": "Resumo em 2 frases (max 200 caracteres)",
  "seo_title": "Titulo SEO (max 60 caracteres)",
  "seo_description": "Meta description (max 160 caracteres)",
  "seo_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "tags": ["tag1", "tag2", "tag3"]
}

Regras:
- O artigo deve ter ${lengthDesc}
- Inclua dados, exemplos praticos e insights acionaveis
- Otimize para SEO naturalmente (sem keyword stuffing)
- Use subtitulos (##) a cada 200-300 palavras
- O tom deve ser ${toneDesc}
- Retorne APENAS o JSON, sem texto antes ou depois`

    const { content: aiContent } = await generateAI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      maxTokens: 8000,
      temperature: 0.7,
    })

    const parsed = parseAIJson(aiContent) as {
      title: string
      content: string
      excerpt: string
      seo_title: string
      seo_description: string
      seo_keywords: string[]
      tags: string[]
    }

    // Validate required fields
    if (!parsed.title || !parsed.content) {
      console.error('AI returned incomplete response:', aiContent.substring(0, 500))
      return NextResponse.json({ error: 'IA retornou resposta incompleta. Tente novamente.' }, { status: 500 })
    }

    return NextResponse.json({
      title: parsed.title,
      content: parsed.content,
      excerpt: parsed.excerpt || '',
      seo_title: parsed.seo_title || parsed.title.substring(0, 60),
      seo_description: parsed.seo_description || parsed.excerpt?.substring(0, 160) || '',
      seo_keywords: parsed.seo_keywords || [],
      tags: parsed.tags || [],
      ai_generated: true,
    })
  } catch (err) {
    console.error('Blog generate error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao gerar artigo'
    return NextResponse.json({ error: message.substring(0, 200) }, { status: 500 })
  }
}
