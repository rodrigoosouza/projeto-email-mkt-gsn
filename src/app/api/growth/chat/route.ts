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

    // Aggregate all data for the period
    const snapshot = await aggregateGrowthData(orgId, fromDate, toDate)

    // Build context
    const dataContext = buildDataContext(snapshot)

    // Build messages for AI
    const systemMessage = GROWTH_SYSTEM_PROMPT + '\n\n' + dataContext

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
