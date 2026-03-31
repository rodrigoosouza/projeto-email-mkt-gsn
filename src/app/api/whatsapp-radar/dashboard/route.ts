import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/whatsapp-radar/dashboard — Stats for org
 * Query params: orgId
 * Returns: totals by status, opportunities per day (30d), top keywords, top groups, conversion rate
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const orgId = searchParams.get('orgId')
    if (!orgId) {
      return NextResponse.json({ error: 'orgId obrigatorio' }, { status: 400 })
    }

    // Fetch all opportunities for org
    const { data: allOpportunities, error: oppError } = await supabase
      .from('whatsapp_opportunities')
      .select('id, status, keyword_matched, keyword_category, group_jid, group_name, detected_at')
      .eq('org_id', orgId)

    if (oppError) {
      console.error('Error fetching opportunities for dashboard:', oppError)
      return NextResponse.json({ error: oppError.message }, { status: 500 })
    }

    const opportunities = allOpportunities || []

    // Total by status
    const statusCounts: Record<string, number> = {
      novo: 0,
      abordado: 0,
      respondeu: 0,
      converteu: 0,
      ignorado: 0,
    }
    for (const opp of opportunities) {
      if (opp.status in statusCounts) {
        statusCounts[opp.status]++
      }
    }

    const total = opportunities.length
    const conversionRate = total > 0 ? (statusCounts.converteu / total) * 100 : 0

    // Opportunities per day (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const perDay: Record<string, number> = {}
    for (const opp of opportunities) {
      const date = new Date(opp.detected_at)
      if (date >= thirtyDaysAgo) {
        const dayKey = date.toISOString().split('T')[0]
        perDay[dayKey] = (perDay[dayKey] || 0) + 1
      }
    }

    // Fill missing days with 0
    const opportunitiesPerDay: { date: string; count: number }[] = []
    const cursor = new Date(thirtyDaysAgo)
    const today = new Date()
    while (cursor <= today) {
      const dayKey = cursor.toISOString().split('T')[0]
      opportunitiesPerDay.push({ date: dayKey, count: perDay[dayKey] || 0 })
      cursor.setDate(cursor.getDate() + 1)
    }

    // Top keywords by matches
    const keywordCounts: Record<string, number> = {}
    for (const opp of opportunities) {
      keywordCounts[opp.keyword_matched] = (keywordCounts[opp.keyword_matched] || 0) + 1
    }
    const topKeywords = Object.entries(keywordCounts)
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Top groups by opportunities
    const groupCounts: Record<string, { name: string; count: number }> = {}
    for (const opp of opportunities) {
      if (!groupCounts[opp.group_jid]) {
        groupCounts[opp.group_jid] = { name: opp.group_name, count: 0 }
      }
      groupCounts[opp.group_jid].count++
    }
    const topGroups = Object.entries(groupCounts)
      .map(([groupJid, data]) => ({ groupJid, groupName: data.name, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return NextResponse.json({
      total,
      statusCounts,
      conversionRate: Math.round(conversionRate * 100) / 100,
      opportunitiesPerDay,
      topKeywords,
      topGroups,
    })
  } catch (err) {
    console.error('Dashboard GET error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao buscar dashboard'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
