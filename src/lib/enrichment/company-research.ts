/**
 * Company Research — enriches lead data with CNPJ lookup + AI analysis.
 * Uses multiple sources for maximum accuracy:
 * 1. Casa dos Dados API (search by company name → CNPJ)
 * 2. BrasilAPI (CNPJ → full company data)
 * 3. AI research (web knowledge + analysis)
 */

import { generateAI, parseAIJson } from '@/lib/ai-client'

export interface EnrichmentData {
  cnpj: string | null
  razao_social: string | null
  nome_fantasia: string | null
  cnae_principal: { codigo: string; descricao: string } | null
  porte: string | null
  abertura: string | null
  anos_atividade: number | null
  situacao: string | null
  endereco: {
    logradouro: string
    municipio: string
    uf: string
    cep: string
  } | null
  socios: { nome: string; qualificacao: string }[]
  capital_social: number | null
  faturamento_estimado: string | null
  segmento_ia: string | null
  resumo_ia: string | null
  dores_provaveis: string[]
  oportunidades_abordagem: string[]
  maturidade_digital: string | null
  website: string | null
  linkedin_url: string | null
  enriched_at: string
}

interface BrasilApiCnpjData {
  cnpj: string
  razao_social: string
  nome_fantasia: string
  cnae_fiscal: number
  cnae_fiscal_descricao: string
  porte: string
  data_inicio_atividade: string
  situacao_cadastral: number
  descricao_situacao_cadastral: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  municipio: string
  uf: string
  cep: string
  qsa: { nome_socio: string; qualificacao_socio: string }[]
  capital_social: number
}

// ============= CNPJ Search by Company Name =============

/**
 * Search for CNPJ using Casa dos Dados API (free, searches by name)
 */
async function searchCnpjCasaDados(companyName: string): Promise<string | null> {
  try {
    const response = await fetch('https://api.casadosdados.com.br/v2/cnpj', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: {
          termo: [companyName],
          situacao_cadastral: 'ATIVA',
        },
        range: { pagina: 1, quantidade: 3 },
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) return null

    const data = await response.json()
    const results = data?.data?.cnpj || []

    if (results.length > 0) {
      // Return the best match (first result)
      return results[0].cnpj || null
    }
    return null
  } catch (error) {
    console.warn('[Enrichment] Casa dos Dados search failed:', error)
    return null
  }
}

/**
 * Search CNPJ using CNPJ.ws API (alternative)
 */
async function searchCnpjWs(companyName: string): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(companyName)
    const response = await fetch(
      `https://open.cnpja.com/office/${encoded}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!response.ok) return null
    const data = await response.json()
    if (data?.taxId) return data.taxId
    return null
  } catch {
    return null
  }
}

/**
 * Use AI with web search capability to find company data.
 * More reliable than simple CNPJ lookup — uses broader knowledge.
 */
async function aiDeepResearch(
  companyName: string,
  personName?: string,
  personEmail?: string,
): Promise<{ cnpj: string | null; data: Partial<EnrichmentData> }> {
  const context = [
    `Empresa: "${companyName}"`,
    personName ? `Contato: ${personName}` : '',
    personEmail ? `Email: ${personEmail}` : '',
  ].filter(Boolean).join('\n')

  const { content } = await generateAI({
    messages: [
      {
        role: 'system',
        content: `Voce e um analista de inteligencia comercial B2B brasileiro. Sua missao e encontrar informacoes PRECISAS e VERIFICAVEIS sobre empresas brasileiras.

REGRAS CRITICAS:
- So inclua dados que voce tem CERTEZA. Se nao souber, use null.
- CNPJ: so informe se tiver certeza absoluta. Um CNPJ errado e pior que nenhum.
- Use o dominio do email para inferir o website da empresa.
- Analise o nome da empresa para inferir o segmento.
- Baseie dores e oportunidades no segmento REAL da empresa.
- Para faturamento, use faixas amplas baseadas no porte provavel.

Responda APENAS com JSON valido, sem markdown, sem explicacao.`,
      },
      {
        role: 'user',
        content: `Pesquise e analise esta empresa brasileira:

${context}

Retorne este JSON:
{
  "cnpj": "XX.XXX.XXX/XXXX-XX ou null se nao tiver certeza",
  "razao_social": "razao social oficial ou null",
  "nome_fantasia": "nome fantasia ou null",
  "segmento_ia": "segmento de atuacao da empresa",
  "porte_estimado": "MEI/ME/EPP/MEDIO/GRANDE",
  "faturamento_estimado": "faixa estimada ex: R$ 1M - R$ 5M/ano",
  "resumo_ia": "Resumo de 3-4 frases sobre a empresa: o que faz, para quem vende, diferenciais, tamanho aproximado. Seja especifico e util para um vendedor.",
  "dores_provaveis": ["5 dores especificas e relevantes para o segmento desta empresa"],
  "oportunidades_abordagem": ["5 angulos de abordagem comercial personalizados para esta empresa"],
  "maturidade_digital": "baixa/media/alta - baseado no segmento e porte",
  "website": "https://site.com.br ou inferido do email, ou null",
  "linkedin_url": "https://linkedin.com/company/xxx ou null",
  "socios_conhecidos": [{"nome": "Nome do Socio", "cargo": "Cargo/Funcao"}]
}`,
      },
    ],
    maxTokens: 3000,
    temperature: 0.2,
  })

  try {
    const parsed = parseAIJson(content) as any
    return {
      cnpj: parsed.cnpj && parsed.cnpj !== 'null' ? parsed.cnpj : null,
      data: {
        razao_social: parsed.razao_social || null,
        nome_fantasia: parsed.nome_fantasia || null,
        segmento_ia: parsed.segmento_ia || null,
        porte: parsed.porte_estimado || null,
        faturamento_estimado: parsed.faturamento_estimado || null,
        resumo_ia: parsed.resumo_ia || null,
        dores_provaveis: parsed.dores_provaveis || [],
        oportunidades_abordagem: parsed.oportunidades_abordagem || [],
        maturidade_digital: parsed.maturidade_digital || null,
        website: parsed.website || null,
        linkedin_url: parsed.linkedin_url || null,
        socios: (parsed.socios_conhecidos || []).map((s: any) => ({
          nome: s.nome,
          qualificacao: s.cargo || 'Sócio',
        })),
      },
    }
  } catch (error) {
    console.error('[Enrichment] AI research parse error:', error)
    return { cnpj: null, data: {} }
  }
}

// ============= BrasilAPI Lookup =============

async function fetchCnpjData(cnpj: string): Promise<BrasilApiCnpjData | null> {
  try {
    const cleanCnpj = cnpj.replace(/[^\d]/g, '')
    if (cleanCnpj.length !== 14) return null

    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      console.warn(`[Enrichment] BrasilAPI ${response.status} for CNPJ ${cleanCnpj}`)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('[Enrichment] BrasilAPI error:', error)
    return null
  }
}

// ============= Helpers =============

function calculateYearsActive(dateStr: string | undefined): number | null {
  if (!dateStr) return null
  try {
    const parts = dateStr.includes('/') ? dateStr.split('/').reverse() : dateStr.split('-')
    const year = parseInt(parts[0])
    if (isNaN(year)) return null
    return new Date().getFullYear() - year
  } catch { return null }
}

function mapSituacao(code: number | undefined): string | null {
  if (!code) return null
  const map: Record<number, string> = { 1: 'NULA', 2: 'ATIVA', 3: 'SUSPENSA', 4: 'INAPTA', 8: 'BAIXADA' }
  return map[code] || `CODIGO_${code}`
}

function formatCnpj(cnpj: string): string {
  const digits = cnpj.replace(/[^\d]/g, '')
  if (digits.length !== 14) return cnpj
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

// ============= Main Function =============

/**
 * Research a company using multiple sources for maximum accuracy.
 *
 * Strategy:
 * 1. AI deep research (finds CNPJ + company data + insights)
 * 2. If AI found CNPJ, validate with BrasilAPI (official data)
 * 3. If AI didn't find CNPJ, try Casa dos Dados search
 * 4. Merge all data: BrasilAPI (official) > AI research (insights)
 */
export async function researchCompany(
  companyName: string,
  cnpjHint?: string,
  personName?: string,
  personEmail?: string,
): Promise<EnrichmentData> {
  console.log(`[Enrichment] Researching: "${companyName}"`)

  // Step 1: AI deep research (gets CNPJ + insights in one call)
  const aiResult = await aiDeepResearch(companyName, personName, personEmail)
  console.log(`[Enrichment] AI found CNPJ: ${aiResult.cnpj || 'no'}`)

  // Step 2: Find CNPJ from multiple sources
  let cnpj = cnpjHint || aiResult.cnpj || null

  if (!cnpj) {
    // Try Casa dos Dados
    cnpj = await searchCnpjCasaDados(companyName)
    console.log(`[Enrichment] Casa dos Dados CNPJ: ${cnpj || 'not found'}`)
  }

  if (!cnpj) {
    // Try CNPJ.ws
    cnpj = await searchCnpjWs(companyName)
    console.log(`[Enrichment] CNPJ.ws: ${cnpj || 'not found'}`)
  }

  // Step 3: If we have CNPJ, get official data from BrasilAPI
  let cnpjData: BrasilApiCnpjData | null = null
  if (cnpj) {
    cnpjData = await fetchCnpjData(cnpj)
    console.log(`[Enrichment] BrasilAPI data: ${cnpjData ? 'found' : 'not found'}`)
  }

  // Step 4: Merge — BrasilAPI (official) takes priority, AI fills gaps
  const enrichment: EnrichmentData = {
    // Official data (BrasilAPI) > AI data
    cnpj: cnpjData?.cnpj ? formatCnpj(cnpjData.cnpj) : cnpj ? formatCnpj(cnpj) : null,
    razao_social: cnpjData?.razao_social || aiResult.data.razao_social || null,
    nome_fantasia: cnpjData?.nome_fantasia || aiResult.data.nome_fantasia || null,
    cnae_principal: cnpjData?.cnae_fiscal
      ? { codigo: String(cnpjData.cnae_fiscal), descricao: cnpjData.cnae_fiscal_descricao || '' }
      : null,
    porte: cnpjData?.porte || aiResult.data.porte || null,
    abertura: cnpjData?.data_inicio_atividade || null,
    anos_atividade: calculateYearsActive(cnpjData?.data_inicio_atividade),
    situacao: mapSituacao(cnpjData?.situacao_cadastral),
    endereco: cnpjData?.logradouro
      ? {
          logradouro: [cnpjData.logradouro, cnpjData.numero, cnpjData.complemento].filter(Boolean).join(', '),
          municipio: cnpjData.municipio,
          uf: cnpjData.uf,
          cep: cnpjData.cep,
        }
      : null,
    socios: cnpjData?.qsa?.length
      ? cnpjData.qsa.map((s) => ({ nome: s.nome_socio, qualificacao: s.qualificacao_socio }))
      : (aiResult.data.socios || []),
    capital_social: cnpjData?.capital_social || null,

    // AI-generated insights
    faturamento_estimado: aiResult.data.faturamento_estimado || null,
    segmento_ia: aiResult.data.segmento_ia || null,
    resumo_ia: aiResult.data.resumo_ia || null,
    dores_provaveis: aiResult.data.dores_provaveis || [],
    oportunidades_abordagem: aiResult.data.oportunidades_abordagem || [],
    maturidade_digital: aiResult.data.maturidade_digital || null,
    website: aiResult.data.website || null,
    linkedin_url: aiResult.data.linkedin_url || null,
    enriched_at: new Date().toISOString(),
  }

  return enrichment
}
