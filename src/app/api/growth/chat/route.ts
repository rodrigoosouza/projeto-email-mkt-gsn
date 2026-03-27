import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aggregateGrowthData } from '@/lib/growth/data-aggregator'
import { GROWTH_SYSTEM_PROMPT, buildDataContext } from '@/lib/growth/system-prompt'
import { generateAI } from '@/lib/ai-client'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orgId, messages, fromDate, toDate } = await request.json()

    if (!orgId || !messages || !fromDate || !toDate) {
      return NextResponse.json({ error: 'orgId, messages, fromDate, toDate required' }, { status: 400 })
    }

    // Aggregate all data for the period (with error handling)
    let snapshot
    try {
      snapshot = await aggregateGrowthData(orgId, fromDate, toDate)
    } catch (aggError) {
      console.error('Growth data aggregation error:', aggError)
      return NextResponse.json({ error: 'Erro ao carregar dados. Tente um periodo menor.' }, { status: 500 })
    }

    // Build context (limit size to avoid token overflow)
    const dataContext = buildDataContext(snapshot)
    const truncatedContext = dataContext.length > 15000 ? dataContext.slice(0, 15000) + '\n\n[... dados truncados por limite de tamanho]' : dataContext

    // Build messages for AI
    const systemMessage = GROWTH_SYSTEM_PROMPT + '\n\n' + truncatedContext

    const aiMessages = messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    }))

    // Call AI
    const result = await generateAI({
      messages: [
        { role: 'system', content: systemMessage },
        ...aiMessages,
      ],
      maxTokens: 4000,
      temperature: 0.3,
    })

    return NextResponse.json({
      response: result.content,
      model: result.model,
      provider: result.provider,
      dataSnapshot: {
        period: snapshot.period,
        metaAdsLeads: snapshot.metaAds.kpis.leads,
        crmDeals: snapshot.crm.kpis.total,
        trackingSessions: snapshot.tracking.kpis.sessions,
      },
    })
  } catch (error: any) {
    console.error('Growth chat error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
