import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')

    if (!orgId) {
      return NextResponse.json({ error: 'orgId e obrigatorio' }, { status: 400 })
    }

    // Fetch all prospects for this org
    const { data: prospects, error } = await supabase
      .from('prospects')
      .select('id, status, search_segment, enriched, created_at')
      .eq('org_id', orgId)

    if (error) {
      console.error('[Prospection] Dashboard error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const all = prospects || []

    // Count by status
    const statusCounts: Record<string, number> = {}
    for (const p of all) {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1
    }

    // Count by segment
    const segmentCounts: Record<string, number> = {}
    for (const p of all) {
      const seg = p.search_segment || 'Sem segmento'
      segmentCounts[seg] = (segmentCounts[seg] || 0) + 1
    }

    // Enrichment rate
    const enrichedCount = all.filter((p) => p.enriched).length
    const enrichmentRate = all.length > 0 ? Math.round((enrichedCount / all.length) * 100) : 0

    // Conversion rate
    const convertedCount = statusCounts['converteu'] || 0
    const conversionRate = all.length > 0 ? Math.round((convertedCount / all.length) * 100) : 0

    // Recent searches
    const { data: recentSearches } = await supabase
      .from('prospect_searches')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      total: all.length,
      statusCounts,
      segmentCounts,
      enrichedCount,
      enrichmentRate,
      convertedCount,
      conversionRate,
      abordadosCount: statusCounts['abordado'] || 0,
      recentSearches: recentSearches || [],
    })
  } catch (err) {
    console.error('[Prospection] Dashboard error:', err)
    return NextResponse.json(
      { error: 'Erro interno ao buscar dashboard' },
      { status: 500 }
    )
  }
}
