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
  socios: { nome: string; qualificacao: string; linkedin_url?: string; descricao?: string }[]
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
 * Use AI to find company data with maximum precision.
 * Two-step approach: first find CNPJ, then research company.
 */
async function aiDeepResearch(
  companyName: string,
  personName?: string,
  personEmail?: string,
): Promise<{ cnpj: string | null; data: Partial<EnrichmentData> }> {
  const emailDomain = personEmail?.split('@')[1] || ''
  const context = [
    `Empresa: "${companyName}"`,
    personName ? `Contato: ${personName}` : '',
    personEmail ? `Email: ${personEmail}` : '',
    emailDomain && !emailDomain.includes('gmail') && !emailDomain.includes('hotmail') && !emailDomain.includes('yahoo') && !emailDomain.includes('outlook')
      ? `Dominio corporativo: ${emailDomain} (provavelmente o site da empresa)`
      : '',
  ].filter(Boolean).join('\n')

  // Step 1: Find CNPJ with dedicated prompt (more focused = more accurate)
  let foundCnpj: string | null = null
  try {
    const { content: cnpjContent } = await generateAI({
      messages: [
        {
          role: 'system',
          content: 'Voce e um especialista em dados empresariais brasileiros. Sua UNICA tarefa e encontrar o CNPJ de uma empresa. Responda SOMENTE com o CNPJ no formato XX.XXX.XXX/XXXX-XX. Se nao tiver CERTEZA ABSOLUTA do CNPJ correto, responda apenas: NULL',
        },
        {
          role: 'user',
          content: `Qual o CNPJ da empresa "${companyName}"?${emailDomain ? ` Site provavel: ${emailDomain}` : ''}${personName ? ` Socio/contato: ${personName}` : ''}`,
        },
      ],
      maxTokens: 50,
      temperature: 0,
    })
    const cnpjMatch = cnpjContent.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/)
    if (cnpjMatch) foundCnpj = cnpjMatch[0]
  } catch { /* ignore */ }

  // Step 2: Full company research
  const { content } = await generateAI({
    messages: [
      {
        role: 'system',
        content: `Voce e um analista de inteligencia comercial B2B brasileiro SENIOR. Sua missao e criar um dossie COMPLETO e PRECISO sobre empresas brasileiras para equipes de vendas.

REGRAS DE PRECISAO:
- CNPJ: so informe se tiver certeza ABSOLUTA. Verifique se os digitos verificadores batem. Um CNPJ errado e INACEITAVEL.
- Razao social: deve ser o nome EXATO registrado na Receita Federal.
- Use o dominio do email corporativo para encontrar o website real da empresa.
- Se o email e corporativo (nao gmail/hotmail/yahoo/outlook), o dominio provavelmente e o site da empresa.
- Analise o nome da empresa + segmento para gerar dores ESPECIFICAS (nao genericas).
- As oportunidades de abordagem devem ser ACTIONABLE para um vendedor.
- Se nao souber algo com certeza, use null. NUNCA invente dados factuais.

PESQUISA DE LINKEDIN (MUITO IMPORTANTE):
- Pesquise profundamente sobre esta empresa e seus socios/fundadores.
- Encontre o perfil do LinkedIn de CADA socio se possivel (formato: https://linkedin.com/in/username).
- Busque o LinkedIn da empresa: https://linkedin.com/company/nome-da-empresa
- Encontre o website real da empresa.
- Para cada socio, forneca uma breve descricao do background profissional.

Responda APENAS com JSON valido, sem markdown, sem explicacao.`,
      },
      {
        role: 'user',
        content: `Crie um dossie comercial completo desta empresa brasileira:

${context}

JSON esperado:
{
  "cnpj": "XX.XXX.XXX/XXXX-XX ou null",
  "razao_social": "nome oficial na Receita ou null",
  "nome_fantasia": "nome fantasia ou null",
  "segmento_ia": "segmento especifico de atuacao",
  "porte_estimado": "MEI/ME/EPP/MEDIO/GRANDE",
  "faturamento_estimado": "R$ X - R$ Y/ano",
  "resumo_ia": "Resumo de 3-4 frases: o que faz, mercado, diferenciais, porte. Util para vendedor que vai ligar.",
  "dores_provaveis": ["5 dores ESPECIFICAS do segmento e porte desta empresa, nao genericas"],
  "oportunidades_abordagem": ["5 angulos de abordagem CONCRETOS e personalizados"],
  "maturidade_digital": "baixa/media/alta",
  "website": "https://... ou null",
  "linkedin_url": "https://linkedin.com/company/... ou null",
  "socios_conhecidos": [{"nome": "Nome Completo", "cargo": "Cargo", "linkedin_url": "https://linkedin.com/in/username ou null", "descricao": "Breve descricao do background profissional"}]
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
          linkedin_url: s.linkedin_url && s.linkedin_url !== 'null' ? s.linkedin_url : undefined,
          descricao: s.descricao && s.descricao !== 'null' ? s.descricao : undefined,
        })),
      },
    }
  } catch (error) {
    console.error('[Enrichment] AI research parse error:', error)
    return { cnpj: null, data: {} }
  }
}

// ============= BrasilAPI Lookup =============

export async function fetchCnpjData(cnpj: string): Promise<BrasilApiCnpjData | null> {
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

  // Step 1: AI deep research (dedicated CNPJ search + full company analysis)
  const aiResult = await aiDeepResearch(companyName, personName, personEmail)

  // Step 2: Collect all possible CNPJs and validate each with BrasilAPI
  const cnpjCandidates = [
    cnpjHint,
    aiResult.cnpj,
    (aiResult.data as any)?.cnpj,
  ].filter(Boolean) as string[]

  console.log(`[Enrichment] "${companyName}" — CNPJ candidates: ${cnpjCandidates.length}`)

  let cnpjData: BrasilApiCnpjData | null = null
  let cnpj: string | null = null

  // Try each candidate until one validates with BrasilAPI
  for (const candidate of cnpjCandidates) {
    const cleaned = candidate.replace(/[^\d]/g, '')
    if (cleaned.length !== 14) continue

    const data = await fetchCnpjData(cleaned)
    if (data && data.razao_social) {
      cnpjData = data
      cnpj = cleaned
      console.log(`[Enrichment] CNPJ validated: ${cleaned} → ${data.razao_social}`)
      break
    }
  }

  // Step 3: If no CNPJ validated, try Casa dos Dados as last resort
  if (!cnpjData) {
    const casaCnpj = await searchCnpjCasaDados(companyName)
    if (casaCnpj) {
      cnpjData = await fetchCnpjData(casaCnpj)
      if (cnpjData) {
        cnpj = casaCnpj
        console.log(`[Enrichment] Casa dos Dados CNPJ validated: ${casaCnpj}`)
      }
    }
  }

  if (!cnpjData) {
    console.log(`[Enrichment] No CNPJ validated for "${companyName}" — using AI data only`)
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
      ? cnpjData.qsa.map((s) => {
          // Try to match with AI data to get LinkedIn URLs
          const aiMatch = (aiResult.data.socios || []).find(
            (ai) => ai.nome && s.nome_socio && ai.nome.toLowerCase().includes(s.nome_socio.toLowerCase().split(' ')[0])
          )
          return {
            nome: s.nome_socio,
            qualificacao: s.qualificacao_socio,
            linkedin_url: aiMatch?.linkedin_url,
            descricao: aiMatch?.descricao,
          }
        })
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
