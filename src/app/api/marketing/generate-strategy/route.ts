import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAI, parseAIJson } from '@/lib/ai-client'
import type { BriefingAnswers } from '@/lib/marketing/types'

function buildPrompt(answers: BriefingAnswers): string {
  return `
Voce e um estrategista de marketing digital senior. Com base no briefing abaixo, gere uma estrategia completa.

=== BRIEFING DO CLIENTE ===

**Segmento:** ${answers.segmento}
**Produto/Servico:** ${answers.produtoServico}
**Publico:** ${answers.publicoB2B}
**Decisor de compra:** ${answers.decisorCompra}
**Maior dor:** ${answers.maiorDor}
**Resultado esperado:** ${answers.resultadoEsperado}
**Preco medio:** ${answers.precoMedio}
**Diferenciais:** ${answers.diferenciais}
**Pagina de destino:** ${answers.paginaDestino}

=== DIAGNOSTICO ESTRATEGICO ===

**Numeros da operacao:** ${answers.numerosOperacao || 'Nao informado'}
**Indicadores criticos:** ${answers.indicadoresCriticos || 'Nao informado'}
**Objetivo 90 dias:** ${answers.objetivo90Dias || 'Nao informado'}
**Por que prioridade:** ${answers.porquePrioridade || 'Nao informado'}
**Impacto se nada mudar:** ${answers.impactoSemMudanca || 'Nao informado'}
**Dores urgentes:** ${answers.doresUrgentes || 'Nao informado'}
**Objecoes frequentes:** ${answers.objecoesFrequentes || 'Nao informado'}
**Maior gargalo:** ${answers.maiorGargalo || 'Nao informado'}
**Como atrai clientes:** ${answers.comoAtraiClientes || 'Nao informado'}
**Como se comunica:** ${answers.comoComunica || 'Nao informado'}
**Taxa conversao atual:** ${answers.taxaConversaoAtual || 'Nao informado'}
**Processo comercial:** ${answers.processoComercial || 'Nao informado'}
**Limite orcamento:** ${answers.limiteOrcamento || 'Nao informado'}

Retorne APENAS um JSON valido (sem markdown, sem texto extra) com esta estrutura:

{
  "persona": {
    "quemE": "descricao detalhada",
    "idade": "faixa etaria",
    "cargo": "cargo do decisor",
    "rotinaDiaria": "rotina tipica",
    "dorPrincipal": "maior dor",
    "doresSecundarias": ["5 dores"],
    "desejoPrimario": "resultado #1",
    "desejosSecundarios": ["5 desejos"],
    "medosObjecoes": ["7 medos/objecoes"],
    "gatilhosMentais": ["6 gatilhos"],
    "buscasGoogle": ["10 termos de busca"],
    "palavrasUsadas": ["10 expressoes"],
    "momentoConsciencia": "nivel",
    "jornada": "jornada de compra",
    "determinaConversao": "fator decisivo",
    "provaNecessaria": ["6 provas"],
    "influenciadores": ["6 influenciadores"],
    "ondeConsome": ["6 canais"]
  },
  "icp": {
    "tipoEmpresa": "tipo ideal",
    "segmentoMercado": "segmento",
    "faturamentoAnual": "faixa",
    "numeroFuncionarios": "tamanho",
    "ticketIdeal": "valor",
    "cargoComprador": "cargo",
    "influenciadoresDecisao": ["6 influenciadores"],
    "maturidadeCliente": "nivel",
    "momentoEntrada": "momento ideal",
    "gatilhosCompra": ["6 gatilhos"],
    "barreiras": ["6 barreiras"],
    "sinaisProntidao": ["6 sinais"],
    "ciclodeVenda": "tempo medio",
    "canaisAquisicao": ["6 canais"],
    "concorrentesPrincipais": ["5 concorrentes"]
  },
  "horarios": {
    "intencaoAlta": ["6 horarios"],
    "pesquisaEmocional": ["5 horarios"],
    "comercialB2B": ["6 horarios"],
    "recomendacaoOtimizacao": "recomendacao",
    "justificativas": {"07h-09h": "motivo", "12h-14h": "motivo", "19h-22h": "motivo"}
  },
  "palavrasChave": {
    "topo": ["10 palavras topo funil"],
    "dorContratacao": ["10 palavras dor"],
    "defesaMarca": ["6 palavras defesa"],
    "negativas": ["15 negativas"],
    "estrategiaCorrespondencia": "estrategia",
    "regrasSegmentacao": "regras",
    "insightsIntencao": "insights"
  },
  "anuncios": {
    "titulos": ["8 titulos ate 30 chars"],
    "descricoes": ["6 descricoes ate 90 chars"]
  },
  "paginaCRO": {
    "headlinePrincipal": "headline",
    "subheadline": "sub",
    "porqueImportaAgora": "urgencia",
    "beneficiosDiretos": ["5 beneficios"],
    "provaSocial": "prova",
    "urgencia": "elemento",
    "quebraObjecoes": ["5 quebras"],
    "comoFunciona": ["4 passos"],
    "ctaPrincipal": "CTA",
    "microcopyProva": "microcopy",
    "roteiroVideo": "roteiro"
  },
  "campanhas": {
    "topo": {"nome":"","estrategia":"","configuracoes":[],"segmentacoes":[],"lanceSugerido":"","ajusteOrcamento":"","objetivo":"","palavrasChave":[],"tiposAnuncio":[],"metricasEsperadas":[],"observacoes":""},
    "dorContratacao": {"nome":"","estrategia":"","configuracoes":[],"segmentacoes":[],"lanceSugerido":"","ajusteOrcamento":"","objetivo":"","palavrasChave":[],"tiposAnuncio":[],"metricasEsperadas":[],"observacoes":""},
    "defesaMarca": {"nome":"","estrategia":"","configuracoes":[],"segmentacoes":[],"lanceSugerido":"","ajusteOrcamento":"","objetivo":"","palavrasChave":[],"tiposAnuncio":[],"metricasEsperadas":[],"observacoes":""},
    "remarketing": {"nome":"","estrategia":"","configuracoes":[],"segmentacoes":[],"lanceSugerido":"","ajusteOrcamento":"","objetivo":"","palavrasChave":[],"tiposAnuncio":[],"metricasEsperadas":[],"observacoes":""}
  }
}

IMPORTANTE: Seja ESPECIFICO para o nicho "${answers.segmento}". Retorne APENAS o JSON.`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { orgId, answers } = await request.json() as { orgId: string; answers: BriefingAnswers }

    if (!orgId || !answers?.segmento) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const prompt = buildPrompt(answers)

    const result = await generateAI({
      messages: [
        { role: 'system', content: 'Voce e um estrategista de marketing digital. Responda APENAS em JSON valido, sem markdown.' },
        { role: 'user', content: prompt },
      ],
      maxTokens: 8000,
      temperature: 0.7,
    })

    const strategy = parseAIJson(result.content) as Record<string, unknown>

    return NextResponse.json({
      persona: strategy.persona,
      icp: strategy.icp,
      strategy: {
        horarios: strategy.horarios,
        palavrasChave: strategy.palavrasChave,
        anuncios: strategy.anuncios,
        paginaCRO: strategy.paginaCRO,
        campanhas: strategy.campanhas,
      },
      model: result.model,
    })
  } catch (error) {
    console.error('Strategy generation error:', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
