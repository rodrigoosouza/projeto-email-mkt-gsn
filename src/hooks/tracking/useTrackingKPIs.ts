'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { countMultiOrg, queryMultiOrg } from '@/lib/tracking/query-helpers'
import type { OrgTables } from '@/lib/tracking/organizations'
import type { KPIData } from '@/lib/tracking/types'
import { LEAD_EVENTS } from '@/lib/tracking/constants'

interface UseTrackingKPIsReturn {
  data: KPIData | null
  loading: boolean
  error: string | null
  retry: () => void
}

export function useTrackingKPIs(startDate: string, endDate: string, orgTablesList: OrgTables[]): UseTrackingKPIsReturn {
  const [data, setData] = useState<KPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const retry = useCallback(() => setRetryCount(c => c + 1), [])

  useEffect(() => {
    const supabase = createClient()

    async function fetchKPIs() {
      setLoading(true)
      setError(null)

      try {
        const totalVisitors = await countMultiOrg(orgTablesList, t => t.events, (table) =>
          supabase.from(table).select('*', { count: 'exact', head: true })
            .in('event_name', ['page_view', 'custom_page_view'])
            .gte('created_at', startDate).lte('created_at', endDate)
        )

        const sessionData = await queryMultiOrg(orgTablesList, t => t.events, (table) =>
          supabase.from(table).select('session_id')
            .in('event_name', ['page_view', 'custom_page_view'])
            .gte('created_at', startDate).lte('created_at', endDate)
        )
        const uniqueSessions = new Set(sessionData.map(s => s.session_id).filter(Boolean)).size

        const totalLeads = await countMultiOrg(orgTablesList, t => t.events, (table) =>
          supabase.from(table).select('*', { count: 'exact', head: true })
            .in('event_name', LEAD_EVENTS)
            .gte('created_at', startDate).lte('created_at', endDate)
        )

        const conversions = await queryMultiOrg(orgTablesList, t => t.conversions, (table) =>
          supabase.from(table).select('deal_value, deal_status, lead_temperature, lead_score')
            .gte('created_at', startDate).lte('created_at', endDate)
        )

        const totalConversions = conversions.filter(c => c.deal_status === 'won').length
        const totalRevenue = conversions
          .filter(c => c.deal_status === 'won')
          .reduce((sum, c) => sum + (c.deal_value || 0), 0)
        const conversionRate = totalLeads ? (totalConversions / totalLeads) * 100 : 0

        const tempDist: Record<string, number> = {}
        conversions.forEach(c => {
          const temp = c.lead_temperature || 'frio'
          tempDist[temp] = (tempDist[temp] || 0) + 1
        })

        const total = conversions.length || 1
        const hotLeads = (tempDist['quente'] || 0) + (tempDist['muito quente'] || 0)
        const hotLeadsPercent = (hotLeads / total) * 100

        const scores = conversions.filter(c => c.lead_score !== null).map(c => c.lead_score!) || []
        const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0

        setData({
          totalVisitors,
          totalSessions: uniqueSessions,
          totalLeads,
          totalConversions,
          conversionRate,
          totalRevenue,
          avgScore,
          hotLeadsPercent,
          temperatureDistribution: tempDist,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar KPIs')
      } finally {
        setLoading(false)
      }
    }

    fetchKPIs()
  }, [startDate, endDate, orgTablesList, retryCount])

  return { data, loading, error, retry }
}
