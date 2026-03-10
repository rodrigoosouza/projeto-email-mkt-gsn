import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgContext } from '@/lib/supabase/org-context'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { orgId, platforms, objective } = await req.json()
    if (!orgId) {
      return NextResponse.json({ error: 'orgId obrigatorio' }, { status: 400 })
    }

    const orgContext = await getOrgContext(orgId)
    if (!orgContext) {
      return NextResponse.json({ error: 'Organizacao nao encontrada' }, { status: 404 })
    }

    const targetPlatforms = platforms || ['meta_ads', 'google_ads']
    const campaignObjective = objective || 'lead_generation'

    const prompt = buildAdsPrompt(orgContext.summary, targetPlatforms, campaignObjective)

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4',
        max_tokens: 10000,
        messages: [
          {
            role: 'system',
            content: 'Voce e um especialista em trafego pago (Meta Ads e Google Ads). Gere campanhas completas em JSON valido. Responda APENAS com o JSON.',
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

    let campaigns
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      campaigns = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content)
    } catch {
      return NextResponse.json({ error: 'Erro ao parsear resposta da IA', raw: content }, { status: 500 })
    }

    // Save to database
    const admin = createAdminClient()
    const rows = campaigns.map((c: any) => ({
      org_id: orgId,
      name: c.name,
      platform: c.platform,
      campaign_type: c.campaign_type || campaignObjective,
      status: 'draft',
      objective: c.objective,
      target_audience: c.target_audience || {},
      budget_daily: c.budget_daily || null,
      budget_total: c.budget_total || null,
      ad_creatives: c.ad_creatives || [],
      copy_variants: c.copy_variants || [],
      landing_page_url: c.landing_page_url || null,
      ai_generated: true,
      created_by: user.id,
    }))

    const { data: saved, error } = await admin
      .from('ad_campaigns')
      .insert(rows)
      .select()

    if (error) throw error

    return NextResponse.json({ campaigns: saved, count: saved?.length || 0 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Ads Generate] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function buildAdsPrompt(orgSummary: string, platforms: string[], objective: string): string {
  return `Crie campanhas de trafego pago para as plataformas ${platforms.join(' e ')} com objetivo de ${objective}.

CONTEXTO DA EMPRESA:
${orgSummary}

GERE UM JSON ARRAY com campanhas. Para cada plataforma, crie 3 campanhas:

1. **Campanha de Topo de Funil** (awareness/traffic): Atrair publico frio
2. **Campanha de Meio de Funil** (engagement/lead_generation): Converter interesse em lead
3. **Campanha de Fundo de Funil** (conversion/retargeting): Converter lead em cliente

Para cada campanha inclua:
{
  "name": "Nome descritivo da campanha",
  "platform": "meta_ads" ou "google_ads",
  "campaign_type": "awareness|traffic|engagement|lead_generation|conversion|retargeting",
  "objective": "Descricao do objetivo",
  "target_audience": {
    "age_min": 25,
    "age_max": 55,
    "gender": "all|male|female",
    "interests": ["interesse1", "interesse2"],
    "locations": ["Brasil"],
    "custom_audiences": "descricao do publico personalizado",
    "lookalike": "descricao do lookalike se aplicavel"
  },
  "budget_daily": 50.00,
  "ad_creatives": [
    {
      "headline": "Titulo do anuncio (max 40 chars)",
      "description": "Descricao do anuncio (max 125 chars)",
      "image_prompt": "Prompt detalhado para gerar imagem do anuncio",
      "cta": "Saiba Mais|Cadastre-se|Fale Conosco|Baixar|Comprar"
    }
  ],
  "copy_variants": [
    {
      "primary_text": "Texto principal do anuncio (max 250 chars, com emoji e CTA)",
      "headline": "Titulo alternativo",
      "description": "Descricao alternativa",
      "cta": "CTA alternativo"
    }
  ],
  "landing_page_url": "sugerir tipo de LP (ex: pagina de captura, webinar, trial)"
}

REGRAS:
- Adapte o tom, publico e copy ao contexto da empresa
- Para Meta Ads: foque em copy visual e emocional
- Para Google Ads: foque em palavras-chave e intencao de busca
- Budget sugerido realista para Brasil (R$ 30-100/dia)
- Pelo menos 2 variantes de copy por campanha
- CTAs claros e especificos

Retorne APENAS o JSON array.`
}
