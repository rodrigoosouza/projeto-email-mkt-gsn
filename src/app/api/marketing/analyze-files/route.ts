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

    const { orgId, files, context, existingBriefing } = await request.json()

    if (!orgId) {
      return NextResponse.json({ error: 'orgId obrigatorio' }, { status: 400 })
    }

    const systemPrompt = `Voce e um consultor de marketing estrategico senior. Analise os materiais fornecidos pelo cliente e extraia informacoes para construir o perfil de marketing dele.

Retorne APENAS um JSON valido (sem markdown, sem texto extra) com esta estrutura:

{
  "briefing_updates": {
    "segmento": "segmento identificado",
    "produtoServico": "produto/servico identificado",
    "publicoB2B": "B2B, B2C ou ambos",
    "decisorCompra": "decisor identificado",
    "maiorDor": "principal dor identificada",
    "resultadoEsperado": "resultado que o cliente busca",
    "precoMedio": "preco medio identificado",
    "diferenciais": "diferenciais identificados"
  },
  "persona_insights": {
    "quemE": "descricao do publico identificado",
    "cargo": "cargo/perfil do comprador",
    "dorPrincipal": "principal dor",
    "doresSecundarias": ["dores secundarias identificadas"],
    "desejoPrimario": "principal desejo",
    "buscasGoogle": ["termos de busca provaveis"],
    "ondeConsome": ["canais onde consome conteudo"]
  },
  "icp_insights": {
    "tipoEmpresa": "tipo de empresa ideal",
    "segmentoMercado": "segmento de mercado",
    "ticketIdeal": "valor ideal",
    "barreiras": ["barreiras identificadas"]
  },
  "brand_insights": {
    "primary_color": "#hexcolor ou null",
    "secondary_color": "#hexcolor ou null",
    "accent_color": "#hexcolor ou null",
    "tone_of_voice": "tom de voz identificado",
    "brand_values": ["valores da marca"],
    "visual_style": "estilo visual identificado",
    "brand_archetype": "arquetipo da marca (ex: Heroi, Sabio, Criador...)",
    "brand_archetype_description": "descricao do porque esse arquetipo"
  },
  "summary": "Resumo da analise em 3-5 paragrafos descrevendo o que foi identificado"
}

REGRAS:
- Extraia apenas o que REALMENTE esta nos materiais, nao invente
- Se nao identificar algo, omita o campo ou use null
- Para cores, tente identificar a paleta nos materiais visuais
- Para arquetipo, use os 12 arquetipos de marca classicos
- Se houver briefing existente, complemente (nao substitua) as informacoes`

    // Build user message with files and context
    let userContent = ''

    if (existingBriefing && Object.keys(existingBriefing).length > 0) {
      const filled = Object.entries(existingBriefing)
        .filter(([, v]) => v && String(v).trim())
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n')
      if (filled) {
        userContent += `=== BRIEFING EXISTENTE ===\n${filled}\n\n`
      }
    }

    if (context?.trim()) {
      userContent += `=== CONTEXTO ADICIONAL ===\n${context}\n\n`
    }

    if (files && files.length > 0) {
      userContent += '=== ARQUIVOS ENVIADOS ===\n'
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          userContent += `\n[Imagem: ${file.name}] - Analise as cores, estilo visual e elementos da marca.\n`
          userContent += `(Tipo: ${file.type}, Tamanho: ${file.content.length} chars em base64)\n`
        } else {
          const truncated = file.content.length > 15000
            ? file.content.substring(0, 15000) + '\n... [truncado]'
            : file.content
          userContent += `\n--- Arquivo: ${file.name} ---\n${truncated}\n`
        }
      }
    }

    if (!userContent.trim()) {
      return NextResponse.json({ error: 'Nenhum conteudo para analisar' }, { status: 400 })
    }

    userContent += '\n\nAnalise tudo acima e retorne o JSON com os insights extraidos.'

    const result = await generateAI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      maxTokens: 4000,
      temperature: 0.5,
    })

    const insights = parseAIJson(result.content) as Record<string, unknown>

    // Save to database
    const updates: Record<string, unknown> = {}

    // Merge briefing updates
    if (insights.briefing_updates) {
      const merged = { ...existingBriefing }
      for (const [key, value] of Object.entries(insights.briefing_updates as Record<string, string>)) {
        if (value && String(value).trim() && !merged[key]?.trim()) {
          merged[key] = value
        }
      }
      updates.briefing = merged
    }

    // Save brand insights
    if (insights.brand_insights) {
      const brand: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(insights.brand_insights as Record<string, unknown>)) {
        if (value !== null && value !== undefined) {
          brand[key] = value
        }
      }
      if (Object.keys(brand).length > 0) {
        updates.brand_identity = brand
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('org_marketing_profiles')
        .upsert(
          { org_id: orgId, created_by: user.id, ...updates },
          { onConflict: 'org_id' }
        )

      if (error) {
        console.error('DB save error:', error)
      }
    }

    return NextResponse.json({
      insights,
      summary: (insights.summary as string) || 'Analise concluida.',
    })
  } catch (error) {
    console.error('File analysis error:', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
