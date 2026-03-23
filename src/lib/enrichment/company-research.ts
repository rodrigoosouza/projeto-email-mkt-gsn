/**
 * Company Research — enriches lead data with CNPJ lookup + AI analysis.
 * Works even when CNPJ is not found (falls back to AI-only research).
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
  municipio: string
  uf: string
  cep: string
  qsa: { nome_socio: string; qualificacao_socio: string }[]
  capital_social: number
}

/**
 * Look up CNPJ data from BrasilAPI.
 */
async function fetchCnpjData(cnpj: string): Promise<BrasilApiCnpjData | null> {
  try {
    const cleanCnpj = cnpj.replace(/[^\d]/g, '')
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      console.warn(`[Enrichment] BrasilAPI returned ${response.status} for CNPJ ${cleanCnpj}`)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('[Enrichment] BrasilAPI error:', error)
    return null
  }
}

/**
 * Use AI to find the CNPJ for a company name.
 */
async function findCnpjByName(companyName: string): Promise<string | null> {
  try {
    const { content } = await generateAI({
      messages: [
        {
          role: 'system',
          content: 'Voce e um assistente que ajuda a encontrar CNPJs de empresas brasileiras. Responda APENAS com o CNPJ no formato XX.XXX.XXX/XXXX-XX, ou "NAO_ENCONTRADO" se nao souber. Nao explique nada.',
        },
        {
          role: 'user',
          content: `Qual o CNPJ da empresa "${companyName}"? Responda apenas o CNPJ ou NAO_ENCONTRADO.`,
        },
      ],
      maxTokens: 100,
      temperature: 0,
    })

    const cnpjMatch = content.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/)
    return cnpjMatch ? cnpjMatch[0] : null
  } catch (error) {
    console.error('[Enrichment] AI CNPJ lookup error:', error)
    return null
  }
}

/**
 * Use AI to research the company and generate insights.
 */
async function aiResearchCompany(
  companyName: string,
  cnpjData: BrasilApiCnpjData | null
): Promise<Partial<EnrichmentData>> {
  const cnpjContext = cnpjData
    ? `
Dados oficiais da Receita Federal:
- Razao Social: ${cnpjData.razao_social}
- Nome Fantasia: ${cnpjData.nome_fantasia}
- CNAE: ${cnpjData.cnae_fiscal} - ${cnpjData.cnae_fiscal_descricao}
- Porte: ${cnpjData.porte}
- Abertura: ${cnpjData.data_inicio_atividade}
- UF: ${cnpjData.uf}
- Capital Social: R$ ${cnpjData.capital_social?.toLocaleString('pt-BR')}
- Socios: ${cnpjData.qsa?.map((s) => s.nome_socio).join(', ')}
`
    : 'Nao temos dados oficiais do CNPJ desta empresa.'

  const { content } = await generateAI({
    messages: [
      {
        role: 'system',
        content: `Voce e um analista de inteligencia comercial B2B. Analise a empresa informada e retorne um JSON com as seguintes informacoes.
Baseie-se no que voce sabe sobre a empresa e o segmento.
Se nao souber algo com certeza, faca estimativas razoaveis e marque como estimativa.
Responda APENAS com o JSON, sem explicacoes.

Formato esperado:
{
  "faturamento_estimado": "R$ X - R$ Y (faixa estimada)",
  "segmento_ia": "descricao curta do segmento de atuacao",
  "resumo_ia": "resumo de 2-3 frases sobre a empresa, o que faz, para quem vende",
  "dores_provaveis": ["dor 1 relevante ao segmento", "dor 2", "dor 3"],
  "oportunidades_abordagem": ["como abordar esta empresa", "angulo de venda", "argumento relevante"],
  "maturidade_digital": "baixa|media|alta (estimativa baseada no segmento e porte)",
  "website": "https://... (se souber, caso contrario null)",
  "linkedin_url": "https://linkedin.com/company/... (se souber, caso contrario null)"
}`,
      },
      {
        role: 'user',
        content: `Analise a empresa: "${companyName}"\n\n${cnpjContext}`,
      },
    ],
    maxTokens: 2000,
    temperature: 0.3,
  })

  try {
    const parsed = parseAIJson(content) as Partial<EnrichmentData>
    return parsed
  } catch (error) {
    console.error('[Enrichment] Failed to parse AI research:', error)
    return {
      segmento_ia: null,
      resumo_ia: `Nao foi possivel analisar a empresa "${companyName}" automaticamente.`,
      dores_provaveis: [],
      oportunidades_abordagem: [],
      maturidade_digital: null,
    }
  }
}

/**
 * Calculate years of activity from opening date string (dd/mm/yyyy or yyyy-mm-dd).
 */
function calculateYearsActive(dateStr: string | undefined): number | null {
  if (!dateStr) return null
  try {
    const parts = dateStr.includes('/') ? dateStr.split('/').reverse() : dateStr.split('-')
    const year = parseInt(parts[0])
    if (isNaN(year)) return null
    return new Date().getFullYear() - year
  } catch {
    return null
  }
}

/**
 * Map situacao_cadastral code to readable string.
 */
function mapSituacao(code: number | undefined): string | null {
  if (!code) return null
  const map: Record<number, string> = {
    1: 'NULA',
    2: 'ATIVA',
    3: 'SUSPENSA',
    4: 'INAPTA',
    8: 'BAIXADA',
  }
  return map[code] || `CODIGO_${code}`
}

/**
 * Map porte code to readable string.
 */
function mapPorte(porte: string | undefined): string | null {
  if (!porte) return null
  const porteNum = parseInt(porte)
  if (isNaN(porteNum)) return porte // Already a string description
  const map: Record<number, string> = {
    0: 'NAO_INFORMADO',
    1: 'ME',
    3: 'EPP',
    5: 'MEDIO/GRANDE',
  }
  return map[porteNum] || porte
}

/**
 * Main enrichment function — researches a company by name.
 * Tries CNPJ lookup first, then AI research. Works even without CNPJ.
 */
export async function researchCompany(companyName: string, cnpjHint?: string): Promise<EnrichmentData> {
  // Step 1: Try to find CNPJ
  let cnpj = cnpjHint || null
  if (!cnpj) {
    cnpj = await findCnpjByName(companyName)
  }

  // Step 2: If we have CNPJ, fetch official data
  let cnpjData: BrasilApiCnpjData | null = null
  if (cnpj) {
    cnpjData = await fetchCnpjData(cnpj)
  }

  // Step 3: AI research (uses CNPJ data as context if available)
  const aiData = await aiResearchCompany(companyName, cnpjData)

  // Step 4: Merge data (CNPJ data takes priority for factual fields)
  const enrichment: EnrichmentData = {
    cnpj: cnpjData?.cnpj ? formatCnpj(cnpjData.cnpj) : cnpj,
    razao_social: cnpjData?.razao_social || null,
    nome_fantasia: cnpjData?.nome_fantasia || null,
    cnae_principal: cnpjData?.cnae_fiscal
      ? { codigo: String(cnpjData.cnae_fiscal), descricao: cnpjData.cnae_fiscal_descricao || '' }
      : null,
    porte: mapPorte(cnpjData?.porte),
    abertura: cnpjData?.data_inicio_atividade || null,
    anos_atividade: calculateYearsActive(cnpjData?.data_inicio_atividade),
    situacao: mapSituacao(cnpjData?.situacao_cadastral),
    endereco: cnpjData?.logradouro
      ? {
          logradouro: cnpjData.logradouro,
          municipio: cnpjData.municipio,
          uf: cnpjData.uf,
          cep: cnpjData.cep,
        }
      : null,
    socios: cnpjData?.qsa?.map((s) => ({
      nome: s.nome_socio,
      qualificacao: s.qualificacao_socio,
    })) || [],
    capital_social: cnpjData?.capital_social || null,
    // AI-generated fields
    faturamento_estimado: aiData.faturamento_estimado || null,
    segmento_ia: aiData.segmento_ia || null,
    resumo_ia: aiData.resumo_ia || null,
    dores_provaveis: aiData.dores_provaveis || [],
    oportunidades_abordagem: aiData.oportunidades_abordagem || [],
    maturidade_digital: aiData.maturidade_digital || null,
    website: aiData.website || null,
    linkedin_url: aiData.linkedin_url || null,
    enriched_at: new Date().toISOString(),
  }

  return enrichment
}

/**
 * Format a raw CNPJ string (digits only) into XX.XXX.XXX/XXXX-XX.
 */
function formatCnpj(cnpj: string): string {
  const digits = cnpj.replace(/[^\d]/g, '')
  if (digits.length !== 14) return cnpj
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}
