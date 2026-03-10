import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/org-context'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })

    const { orgId, topic, currentKeywords } = await req.json()
    if (!orgId) return NextResponse.json({ error: 'orgId obrigatorio' }, { status: 400 })

    const orgContext = await getOrgContext(orgId)
    if (!orgContext) return NextResponse.json({ error: 'Org nao encontrada' }, { status: 404 })

    const prompt = `Sugira 15 palavras-chave estrategicas para SEO baseado no contexto da empresa abaixo.

CONTEXTO:
${orgContext.summary}

${topic ? `FOCO ESPECIFICO: ${topic}` : ''}
${currentKeywords?.length ? `KEYWORDS JA MONITORADAS (nao repetir): ${currentKeywords.join(', ')}` : ''}

Para cada keyword, estime:
- search_volume: volume mensal estimado no Brasil (numero)
- difficulty: dificuldade de 0-100 (numero)
- reasoning: por que essa keyword e relevante (texto curto)

Responda APENAS em JSON:
[{ "keyword": "...", "estimated_volume": 1000, "difficulty": 45, "reasoning": "..." }]`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4',
        max_tokens: 4000,
        messages: [
          { role: 'system', content: 'Voce e um especialista em SEO. Responda APENAS em JSON valido.' },
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text().catch(() => '')
      throw new Error(`OpenRouter error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0].message.content || ''

    let keywords
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      keywords = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content)
    } catch {
      return NextResponse.json({ error: 'Erro ao parsear resposta da IA', raw: content }, { status: 500 })
    }

    return NextResponse.json({ keywords })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[SEO Keywords] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
