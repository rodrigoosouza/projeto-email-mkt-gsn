import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateAI, parseAIJson } from '@/lib/ai-client'

export const maxDuration = 120

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || ''

async function scrapeWithFirecrawl(url: string): Promise<string> {
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
    }),
  })

  if (!response.ok) {
    throw new Error(`Firecrawl error: ${response.status}`)
  }

  const data = await response.json()
  return data.data?.markdown || ''
}

async function scrapeWithFetch(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; SEOAuditBot/1.0)',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    throw new Error(`Fetch error: ${response.status}`)
  }

  const html = await response.text()

  // Basic HTML to text extraction
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()

  return text.slice(0, 30000)
}

async function scrapeUrl(url: string): Promise<string> {
  if (FIRECRAWL_API_KEY) {
    try {
      return await scrapeWithFirecrawl(url)
    } catch (err) {
      console.warn('Firecrawl failed, falling back to fetch:', err)
    }
  }
  return scrapeWithFetch(url)
}

const AUDIT_PROMPT = `You are an AIEO/GEO audit expert. Analyze this webpage content and score it on 4 categories.

Score each item 0-3 (0=inexistente, 1=basico, 2=bom, 3=excelente).

Category A - Citabilidade (8 items, max 24 points, weighted to 35):
- statistics_data: Has specific numbers, percentages, research data
- external_citations: Cites external sources, studies, reports
- expert_quotes: Contains quotes from experts or authorities
- authoritative_tone: Written with authority and expertise
- fluency: Well-written, clear, professional language
- technical_terms: Uses relevant industry terminology
- citable_blocks_130_170_words: Has focused paragraphs of 130-170 words ideal for AI citation
- direct_answers_after_heading: H2/H3 followed immediately by a direct answer

Category B - Estrutura Tecnica (7 items, max 21 points, weighted to 25):
- schema_markup: Has structured data / schema.org markup
- heading_hierarchy: Proper H1 > H2 > H3 hierarchy
- meta_descriptions: Has meta description and title tags
- robots_ai_crawlers: Allows AI crawlers (no blocking in robots.txt)
- llms_txt: Has llms.txt file
- sitemap_xml: Has sitemap.xml
- core_web_vitals: Page appears fast and well-structured

Category C - Autoridade de Entidade (6 items, max 18 points, weighted to 25):
- google_business_profile: Evidence of Google Business Profile
- nap_consistency: Consistent Name, Address, Phone across page
- wikidata_presence: Evidence of Wikidata/Wikipedia presence
- platform_profiles: Links to social media / professional profiles
- brand_mentions: Brand name mentioned consistently
- authoritative_backlinks: Evidence of links from authoritative sources

Category D - Formato AI-Friendly (6 items, max 18 points, weighted to 15):
- tldr_summary: Has TL;DR or summary section at top
- faq_with_schema: Has FAQ section
- comparison_tables: Has comparison or data tables
- structured_lists: Has well-organized bullet/numbered lists
- glossary_definitions: Has definitions or glossary terms
- structured_ctas: Has clear calls-to-action

Return ONLY valid JSON (no markdown):
{
  "scores": {
    "A": { "statistics_data": 0, "external_citations": 0, "expert_quotes": 0, "authoritative_tone": 0, "fluency": 0, "technical_terms": 0, "citable_blocks_130_170_words": 0, "direct_answers_after_heading": 0 },
    "B": { "schema_markup": 0, "heading_hierarchy": 0, "meta_descriptions": 0, "robots_ai_crawlers": 0, "llms_txt": 0, "sitemap_xml": 0, "core_web_vitals": 0 },
    "C": { "google_business_profile": 0, "nap_consistency": 0, "wikidata_presence": 0, "platform_profiles": 0, "brand_mentions": 0, "authoritative_backlinks": 0 },
    "D": { "tldr_summary": 0, "faq_with_schema": 0, "comparison_tables": 0, "structured_lists": 0, "glossary_definitions": 0, "structured_ctas": 0 }
  },
  "score_citability": 0,
  "score_technical": 0,
  "score_authority": 0,
  "score_ai_friendly": 0,
  "score_total": 0,
  "classification": "critico",
  "top_problems": ["problem 1", "problem 2"],
  "top_strengths": ["strength 1"],
  "quick_wins": [
    { "action": "description", "impact": "alto", "effort": "baixo", "priority": 1 }
  ]
}

Scoring weights:
- score_citability: (sum of A scores / 24) * 35
- score_technical: (sum of B scores / 21) * 25
- score_authority: (sum of C scores / 18) * 25
- score_ai_friendly: (sum of D scores / 18) * 15
- score_total: sum of 4 weighted scores (0-100)

Classification:
- 0-20: critico
- 21-40: em_desenvolvimento
- 41-60: bom
- 61-80: avancado
- 81-100: excelente

Provide 5 top_problems, 3 top_strengths, and 5-8 quick_wins sorted by priority (highest impact + lowest effort first).`

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { orgId, url } = body

  if (!orgId || !url) {
    return NextResponse.json(
      { error: 'orgId e url sao obrigatorios' },
      { status: 400 }
    )
  }

  try {
    new URL(url)
  } catch {
    return NextResponse.json({ error: 'URL invalida' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Create audit record with status running
  const { data: audit, error: createError } = await admin
    .from('seo_audits')
    .insert({
      org_id: orgId,
      url,
      status: 'running',
    })
    .select('id')
    .single()

  if (createError || !audit) {
    console.error('Error creating audit:', createError)
    return NextResponse.json(
      { error: 'Erro ao criar auditoria' },
      { status: 500 }
    )
  }

  try {
    // Scrape the URL
    const pageContent = await scrapeUrl(url)

    if (!pageContent || pageContent.length < 100) {
      await admin
        .from('seo_audits')
        .update({ status: 'failed' })
        .eq('id', audit.id)

      return NextResponse.json(
        { error: 'Nao foi possivel extrair conteudo da pagina' },
        { status: 422 }
      )
    }

    // Send to AI for analysis
    const aiResponse = await generateAI({
      messages: [
        { role: 'system', content: AUDIT_PROMPT },
        {
          role: 'user',
          content: `Analyze this webpage (URL: ${url}):\n\n${pageContent.slice(0, 25000)}`,
        },
      ],
      maxTokens: 4000,
      temperature: 0.3,
    })

    const result = parseAIJson(aiResponse.content) as {
      scores: Record<string, Record<string, number>>
      score_citability: number
      score_technical: number
      score_authority: number
      score_ai_friendly: number
      score_total: number
      classification: string
      top_problems: string[]
      top_strengths: string[]
      quick_wins: Array<{
        action: string
        impact: string
        effort: string
        priority: number
      }>
    }

    // Update audit record with results
    const { data: updatedAudit, error: updateError } = await admin
      .from('seo_audits')
      .update({
        score_total: result.score_total,
        score_citability: result.score_citability,
        score_technical: result.score_technical,
        score_authority: result.score_authority,
        score_ai_friendly: result.score_ai_friendly,
        classification: result.classification,
        audit_data: {
          scores: result.scores,
          top_problems: result.top_problems,
          top_strengths: result.top_strengths,
        },
        quick_wins: result.quick_wins,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', audit.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating audit:', updateError)
      return NextResponse.json(
        { error: 'Erro ao salvar resultado da auditoria' },
        { status: 500 }
      )
    }

    return NextResponse.json({ audit: updatedAudit })
  } catch (err) {
    console.error('Audit failed:', err)

    await admin
      .from('seo_audits')
      .update({ status: 'failed' })
      .eq('id', audit.id)

    return NextResponse.json(
      { error: 'Erro ao executar auditoria' },
      { status: 500 }
    )
  }
}
