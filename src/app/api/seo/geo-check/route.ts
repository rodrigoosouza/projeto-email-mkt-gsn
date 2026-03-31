import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAI, parseAIJson } from '@/lib/ai-client'

export const maxDuration = 60

const GEO_CHECK_PROMPT = `You are a GEO (Generative Engine Optimization) content evaluator.

Analyze the provided content against the 9 GEO optimization methods. Score each method 0-10.

The 9 GEO Methods:
1. cite_sources (0-10): Does the content cite external sources, studies, reports, or research? Are sources credible and relevant?
2. quotation_addition (0-10): Does it include quotes from experts, industry leaders, or authoritative figures?
3. statistics_addition (0-10): Does it include specific numbers, percentages, data points, and statistics?
4. fluency_optimization (0-10): Is the writing fluid, professional, well-structured, and easy to read?
5. authoritative_tone (0-10): Does it convey expertise and authority on the subject? First-person experience?
6. easy_to_understand (0-10): Is complex information presented in an accessible way? Good use of analogies and examples?
7. technical_terms (0-10): Does it use relevant industry/domain terminology appropriately?
8. unique_words (0-10): Does it use varied vocabulary, avoiding repetition? Rich and diverse word choice?
9. keyword_optimization (0-10): Are relevant keywords naturally integrated? Good keyword density without stuffing?

Also evaluate:
- Count the number of "citable blocks" (focused paragraphs of 130-170 words that make a complete, standalone point)
- Check if content has a FAQ section
- Check if content has a TL;DR or summary
- Count total words
- Estimate reading time (avg 200 words/min)

For each method scoring below 7, provide a specific, actionable suggestion to improve it.

Return ONLY valid JSON (no markdown):
{
  "scores": {
    "cite_sources": 0,
    "quotation_addition": 0,
    "statistics_addition": 0,
    "fluency_optimization": 0,
    "authoritative_tone": 0,
    "easy_to_understand": 0,
    "technical_terms": 0,
    "unique_words": 0,
    "keyword_optimization": 0
  },
  "total_score": 0,
  "max_score": 90,
  "percentage": 0,
  "suggestions": {
    "cite_sources": "Add 2-3 external references from industry reports...",
    "quotation_addition": "Include a quote from a recognized expert..."
  },
  "estimated_citable_blocks": 0,
  "has_faq": false,
  "has_tldr": false,
  "word_count": 0,
  "reading_time": 0
}`

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { content, title } = body as { content: string; title?: string }

  if (!content || content.trim().length < 50) {
    return NextResponse.json(
      { error: 'Conteudo deve ter pelo menos 50 caracteres' },
      { status: 400 }
    )
  }

  try {
    const aiResponse = await generateAI({
      messages: [
        { role: 'system', content: GEO_CHECK_PROMPT },
        {
          role: 'user',
          content: `${title ? `Title: ${title}\n\n` : ''}Content:\n\n${content.slice(0, 20000)}`,
        },
      ],
      maxTokens: 3000,
      temperature: 0.3,
    })

    const result = parseAIJson(aiResponse.content) as {
      scores: Record<string, number>
      total_score: number
      max_score: number
      percentage: number
      suggestions: Record<string, string>
      estimated_citable_blocks: number
      has_faq: boolean
      has_tldr: boolean
      word_count: number
      reading_time: number
    }

    return NextResponse.json({ geoCheck: result })
  } catch (err) {
    console.error('GEO check failed:', err)
    return NextResponse.json(
      { error: 'Erro ao avaliar conteudo GEO' },
      { status: 500 }
    )
  }
}
