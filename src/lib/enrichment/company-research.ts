/**
 * Company Research — enriches lead data with CNPJ lookup + AI analysis.
 * Uses multiple sources for maximum accuracy:
 * 1. Casa dos Dados API (search by company name → CNPJ)
 * 2. BrasilAPI (CNPJ → full company data)
 * 3. AI research (web knowledge + analysis)
 * 4. Google Search → real LinkedIn profile URLs
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
  socios: { nome: string; qualificacao: string; linkedin_url?: string; descricao?: string; email_provavel?: string; tipo?: string }[]
  funcionarios_chave: { nome: string; cargo: string; linkedin_url?: string; departamento?: string }[]
  capital_social: number | null
  numero_funcionarios: string | null
  faturamento_estimado: string | null
  ano_fundacao: string | null
  segmento_ia: string | null
  resumo_ia: string | null
  produtos_servicos: string[]
  mercado_alvo: string | null
  concorrentes: string[]
  dores_provaveis: string[]
  oportunidades_abordagem: string[]
  maturidade_digital: string | null
  presenca_digital: string | null
  website: string | null
  linkedin_url: string | null
  instagram_url: string | null
  facebook_url: string | null
  tecnologias_usadas: string[]
  noticias_recentes: string | null
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

JSON esperado (pesquise profundamente e preencha o maximo possivel):
{
  "cnpj": "XX.XXX.XXX/XXXX-XX ou null",
  "razao_social": "nome oficial na Receita ou null",
  "nome_fantasia": "nome fantasia ou null",
  "segmento_ia": "segmento especifico de atuacao",
  "porte_estimado": "MEI/ME/EPP/MEDIO/GRANDE",
  "numero_funcionarios": "estimativa de funcionarios (ex: '50-100' ou '~200')",
  "faturamento_estimado": "R$ X - R$ Y/ano",
  "ano_fundacao": "ano de fundacao ou null",
  "resumo_ia": "Resumo de 4-5 frases DETALHADO: o que faz, mercado alvo, diferenciais, porte, presenca digital. Util para vendedor que vai ligar.",
  "produtos_servicos": ["lista dos principais produtos ou servicos da empresa"],
  "mercado_alvo": "descricao do mercado alvo da empresa",
  "concorrentes": ["3-5 concorrentes conhecidos no mesmo segmento"],
  "dores_provaveis": ["5 dores ESPECIFICAS do segmento e porte desta empresa"],
  "oportunidades_abordagem": ["5 angulos de abordagem CONCRETOS e personalizados para vendedor"],
  "maturidade_digital": "baixa/media/alta",
  "presenca_digital": "descricao da presenca online (tem site? redes sociais? blog? e-commerce?)",
  "website": "https://site-real.com.br ou null",
  "linkedin_company_url": "https://www.linkedin.com/company/nome-empresa/ ou null",
  "instagram_url": "https://instagram.com/perfil ou null",
  "facebook_url": "https://facebook.com/pagina ou null",
  "socios_e_decisores": [
    {
      "nome": "Nome Completo",
      "cargo": "CEO/Diretor/Socio/Gerente",
      "linkedin_url": "https://www.linkedin.com/in/nome-sobrenome/ ou null",
      "descricao": "Background: formacao, experiencia anterior, tempo na empresa",
      "email_provavel": "nome@empresa.com.br ou null",
      "tipo": "socio/diretor/gerente/decisor"
    }
  ],
  "funcionarios_chave": [
    {
      "nome": "Nome do funcionario relevante",
      "cargo": "Cargo na empresa",
      "linkedin_url": "https://www.linkedin.com/in/... ou null",
      "departamento": "comercial/marketing/operacoes/rh/financeiro/ti"
    }
  ],
  "tecnologias_usadas": ["ferramentas/sistemas que a empresa provavelmente usa"],
  "noticias_recentes": "alguma noticia ou evento recente sobre a empresa ou null"
}`,
      },
    ],
    maxTokens: 4000,
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
        numero_funcionarios: parsed.numero_funcionarios || null,
        faturamento_estimado: parsed.faturamento_estimado || null,
        ano_fundacao: parsed.ano_fundacao || null,
        resumo_ia: parsed.resumo_ia || null,
        produtos_servicos: parsed.produtos_servicos || [],
        mercado_alvo: parsed.mercado_alvo || null,
        concorrentes: parsed.concorrentes || [],
        dores_provaveis: parsed.dores_provaveis || [],
        oportunidades_abordagem: parsed.oportunidades_abordagem || [],
        maturidade_digital: parsed.maturidade_digital || null,
        presenca_digital: parsed.presenca_digital || null,
        website: parsed.website || null,
        linkedin_url: parsed.linkedin_company_url || parsed.linkedin_url || null,
        instagram_url: parsed.instagram_url || null,
        facebook_url: parsed.facebook_url || null,
        tecnologias_usadas: parsed.tecnologias_usadas || [],
        noticias_recentes: parsed.noticias_recentes || null,
        socios: (parsed.socios_e_decisores || parsed.socios_conhecidos || []).map((s: any) => ({
          nome: s.nome,
          qualificacao: s.cargo || 'Sócio',
          linkedin_url: s.linkedin_url && s.linkedin_url !== 'null' ? s.linkedin_url : undefined,
          email_provavel: s.email_provavel || undefined,
          tipo: s.tipo || undefined,
          descricao: s.descricao && s.descricao !== 'null' ? s.descricao : undefined,
        })),
        funcionarios_chave: (parsed.funcionarios_chave || []).map((f: any) => ({
          nome: f.nome,
          cargo: f.cargo,
          linkedin_url: f.linkedin_url && f.linkedin_url !== 'null' ? f.linkedin_url : undefined,
          departamento: f.departamento || undefined,
        })),
      },
    }
  } catch (error) {
    console.error('[Enrichment] AI research parse error:', error)
    return { cnpj: null, data: {} }
  }
}

// ============= LinkedIn Search via Google =============

/**
 * Search Google for a LinkedIn profile URL.
 * Uses Google's web search and parses the HTML results.
 */
async function searchLinkedInProfile(personName: string, companyName?: string): Promise<string | null> {
  try {
    const query = companyName
      ? `"${personName}" "${companyName}" site:linkedin.com/in`
      : `"${personName}" site:linkedin.com/in`

    const encoded = encodeURIComponent(query)
    const response = await fetch(
      `https://www.google.com/search?q=${encoded}&num=3&hl=pt-BR`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(8000),
      }
    )

    if (!response.ok) return null

    const html = await response.text()

    // Extract LinkedIn URLs from Google results
    const linkedinMatches = html.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_%]+/g)

    if (linkedinMatches && linkedinMatches.length > 0) {
      // Clean up and return the first unique LinkedIn URL
      const cleanUrl = linkedinMatches[0].split('&')[0].split('%3F')[0].replace(/\/+$/, '')
      // Basic validation: must have a username after /in/
      const username = cleanUrl.split('/in/')[1]
      if (username && username.length > 2 && username.length < 80) {
        return cleanUrl
      }
    }

    return null
  } catch (error) {
    console.warn(`[Enrichment] LinkedIn search failed for "${personName}":`, error)
    return null
  }
}

/**
 * Search Google for a company LinkedIn page.
 */
async function searchLinkedInCompany(companyName: string): Promise<string | null> {
  try {
    const query = `"${companyName}" site:linkedin.com/company`
    const encoded = encodeURIComponent(query)
    const response = await fetch(
      `https://www.google.com/search?q=${encoded}&num=3&hl=pt-BR`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(8000),
      }
    )

    if (!response.ok) return null

    const html = await response.text()
    const matches = html.match(/https?:\/\/(?:www\.)?linkedin\.com\/company\/[a-zA-Z0-9\-_%]+/g)

    if (matches && matches.length > 0) {
      const cleanUrl = matches[0].split('&')[0].split('%3F')[0].replace(/\/+$/, '')
      const slug = cleanUrl.split('/company/')[1]
      if (slug && slug.length > 1 && slug.length < 80) {
        return cleanUrl
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Enrich sócios and funcionários with real LinkedIn URLs from Google.
 * Runs in parallel with a concurrency limit to avoid rate limiting.
 */
async function enrichLinkedInUrls(
  companyName: string,
  socios: EnrichmentData['socios'],
  funcionarios: EnrichmentData['funcionarios_chave'],
): Promise<{
  socios: EnrichmentData['socios']
  funcionarios: EnrichmentData['funcionarios_chave']
  companyLinkedin: string | null
}> {
  // Search company LinkedIn
  const companyLinkedin = await searchLinkedInCompany(companyName)

  // Search LinkedIn for each person (with small delay to avoid Google blocking)
  const enrichedSocios = [...socios]
  for (let i = 0; i < enrichedSocios.length && i < 5; i++) {
    const socio = enrichedSocios[i]
    if (socio.linkedin_url) continue // already has URL

    const url = await searchLinkedInProfile(socio.nome, companyName)
    if (url) {
      enrichedSocios[i] = { ...socio, linkedin_url: url }
      console.log(`[Enrichment] LinkedIn found for ${socio.nome}: ${url}`)
    }

    // Small delay between requests to avoid rate limiting
    if (i < enrichedSocios.length - 1) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  const enrichedFuncionarios = [...funcionarios]
  for (let i = 0; i < enrichedFuncionarios.length && i < 5; i++) {
    const func = enrichedFuncionarios[i]
    if (func.linkedin_url) continue

    const url = await searchLinkedInProfile(func.nome, companyName)
    if (url) {
      enrichedFuncionarios[i] = { ...func, linkedin_url: url }
      console.log(`[Enrichment] LinkedIn found for ${func.nome}: ${url}`)
    }

    if (i < enrichedFuncionarios.length - 1) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  return {
    socios: enrichedSocios,
    funcionarios: enrichedFuncionarios,
    companyLinkedin,
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
    numero_funcionarios: aiResult.data.numero_funcionarios || null,
    faturamento_estimado: aiResult.data.faturamento_estimado || null,
    ano_fundacao: aiResult.data.ano_fundacao || null,
    segmento_ia: aiResult.data.segmento_ia || null,
    resumo_ia: aiResult.data.resumo_ia || null,
    produtos_servicos: aiResult.data.produtos_servicos || [],
    mercado_alvo: aiResult.data.mercado_alvo || null,
    concorrentes: aiResult.data.concorrentes || [],
    dores_provaveis: aiResult.data.dores_provaveis || [],
    oportunidades_abordagem: aiResult.data.oportunidades_abordagem || [],
    maturidade_digital: aiResult.data.maturidade_digital || null,
    presenca_digital: aiResult.data.presenca_digital || null,
    website: aiResult.data.website || null,
    linkedin_url: aiResult.data.linkedin_url || null,
    instagram_url: aiResult.data.instagram_url || null,
    facebook_url: aiResult.data.facebook_url || null,
    funcionarios_chave: aiResult.data.funcionarios_chave || [],
    tecnologias_usadas: aiResult.data.tecnologias_usadas || [],
    noticias_recentes: aiResult.data.noticias_recentes || null,
    enriched_at: new Date().toISOString(),
  }

  // Step 5: Enrich with REAL LinkedIn URLs from Google Search
  try {
    console.log(`[Enrichment] Searching real LinkedIn profiles for "${companyName}"...`)
    const linkedinResults = await enrichLinkedInUrls(
      companyName,
      enrichment.socios,
      enrichment.funcionarios_chave,
    )

    enrichment.socios = linkedinResults.socios
    enrichment.funcionarios_chave = linkedinResults.funcionarios
    if (linkedinResults.companyLinkedin && !enrichment.linkedin_url) {
      enrichment.linkedin_url = linkedinResults.companyLinkedin
    }

    const totalLinkedins = [
      ...linkedinResults.socios.filter(s => s.linkedin_url),
      ...linkedinResults.funcionarios.filter(f => f.linkedin_url),
      linkedinResults.companyLinkedin ? 'company' : null,
    ].filter(Boolean).length

    console.log(`[Enrichment] LinkedIn search done — ${totalLinkedins} profile(s) found`)
  } catch (linkedinError) {
    // Non-critical: enrichment still works without LinkedIn
    console.warn('[Enrichment] LinkedIn search failed (non-fatal):', linkedinError)
  }

  return enrichment
}
