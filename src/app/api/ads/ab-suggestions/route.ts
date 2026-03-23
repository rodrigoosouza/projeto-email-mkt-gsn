import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAI } from '@/lib/ai-client'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { creatives, mode, creativeName } = await request.json()

    if (mode === 'variation' && creativeName) {
      // Generate a copy variation for a specific creative
      const result = await generateAI({
        messages: [
          {
            role: 'system',
            content: `Voce e um especialista em performance de anuncios digitais (Meta Ads / Google Ads).
Responda SEMPRE em portugues do Brasil.
Gere variacoes de copy para teste A/B. Responda em JSON valido.`,
          },
          {
            role: 'user',
            content: `Gere 3 variacoes de copy para o criativo "${creativeName}".

Para cada variacao, sugira:
- headline (titulo curto, max 40 chars)
- primaryText (texto principal do anuncio, max 200 chars)
- cta (call to action)
- rationale (por que essa variacao pode performar melhor)

Responda em JSON:
{
  "variations": [
    { "headline": "...", "primaryText": "...", "cta": "...", "rationale": "..." }
  ]
}`,
          },
        ],
        maxTokens: 2000,
        temperature: 0.8,
      })

      try {
        const jsonMatch = result.content.match(/\{[\s\S]*\}/)
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { variations: [] }
        return NextResponse.json({ success: true, variations: parsed.variations })
      } catch {
        return NextResponse.json({ success: true, variations: [], raw: result.content })
      }
    }

    // Mode: suggest A/B tests based on creative ranking
    if (!creatives || !Array.isArray(creatives) || creatives.length === 0) {
      return NextResponse.json({ error: 'creatives array required' }, { status: 400 })
    }

    const top10 = creatives.slice(0, 10)
    const creativeSummary = top10.map((c: any, i: number) =>
      `${i + 1}. "${c.name}" — CTR: ${c.ctr?.toFixed(2)}%, CPL: R$${c.cpl?.toFixed(2)}, Conv: ${c.convRate?.toFixed(2)}%, WinRate: ${c.winRate?.toFixed(0)}%, Score: ${c.score?.toFixed(2)}, Spend: R$${c.spend?.toFixed(2)}, Leads: ${c.leads}, Deals: ${c.deals}, Won: ${c.won}`
    ).join('\n')

    const result = await generateAI({
      messages: [
        {
          role: 'system',
          content: `Voce e um Growth Strategist especializado em Meta Ads e Google Ads para empresas B2B.
Analise os criativos e sugira testes A/B inteligentes.
Responda SEMPRE em portugues do Brasil.
Responda em JSON valido.`,
        },
        {
          role: 'user',
          content: `Aqui estao os top criativos rankeados por performance (combinando metricas de ads + CRM):

${creativeSummary}

Analise e sugira:
1. Quais criativos testar entre si (pares de teste A/B)
2. Que variacoes tentar (mudancas de copy, formato, publico)
3. Recomendacoes de budget para os testes

Responda em JSON:
{
  "tests": [
    {
      "title": "Titulo do teste",
      "creativeA": "Nome do criativo A",
      "creativeB": "Nome do criativo B",
      "hypothesis": "Hipotese do teste",
      "variations": ["variacao 1", "variacao 2"],
      "budgetRecommendation": "R$ X/dia por Y dias",
      "expectedImpact": "Descricao do impacto esperado",
      "priority": "alta|media|baixa"
    }
  ],
  "generalInsights": ["insight 1", "insight 2", "insight 3"]
}`,
        },
      ],
      maxTokens: 3000,
      temperature: 0.7,
    })

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/)
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { tests: [], generalInsights: [] }
      return NextResponse.json({ success: true, ...parsed })
    } catch {
      return NextResponse.json({ success: true, tests: [], generalInsights: [], raw: result.content })
    }
  } catch (error: any) {
    console.error('AB suggestions error:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
