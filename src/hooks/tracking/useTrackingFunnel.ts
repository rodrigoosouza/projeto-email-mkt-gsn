'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { countMultiOrg } from '@/lib/tracking/query-helpers'
import type { OrgTables } from '@/lib/tracking/organizations'
import { LEAD_EVENTS } from '@/lib/tracking/constants'

export interface TrackingFunnelStep {
  name: string
  value: number
  rate: number | null
}

interface UseTrackingFunnelReturn {
  steps: TrackingFunnelStep[]
  loading: boolean
  error: string | null
  retry: () => void
}

export function useTrackingFunnel(startDate: string, endDate: string, orgTablesList: OrgTables[]): UseTrackingFunnelReturn {
  const [steps, setSteps] = useState<TrackingFunnelStep[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const retry = useCallback(() => setRetryCount(c => c + 1), [])

  useEffect(() => {
    const supabase = createClient()

    async function fetchFunnel() {
      setLoading(true)
      setError(null)

      try {
        const pv = await countMultiOrg(orgTablesList, t => t.events, (table) =>
          supabase.from(table).select('*', { count: 'exact', head: true })
            .in('event_name', ['page_view', 'custom_page_view'])
            .gte('created_at', startDate).lte('created_at', endDate)
        )

        const ld = await countMultiOrg(orgTablesList, t => t.events, (table) =>
          supabase.from(table).select('*', { count: 'exact', head: true })
            .in('event_name', LEAD_EVENTS)
            .gte('created_at', startDate).lte('created_at', endDate)
        )

        const op = await countMultiOrg(orgTablesList, t => t.conversions, (table) =>
          supabase.from(table).select('*', { count: 'exact', head: true })
            .gte('created_at', startDate).lte('created_at', endDate)
        )

        const wn = await countMultiOrg(orgTablesList, t => t.conversions, (table) =>
          supabase.from(table).select('*', { count: 'exact', head: true })
            .eq('deal_status', 'won')
            .gte('created_at', startDate).lte('created_at', endDate)
        )

        setSteps([
          { name: 'Visitantes', value: pv, rate: null },
          { name: 'Leads', value: ld, rate: pv > 0 ? (ld / pv) * 100 : 0 },
          { name: 'Oportunidades', value: op, rate: ld > 0 ? (op / ld) * 100 : 0 },
          { name: 'Vendas', value: wn, rate: op > 0 ? (wn / op) * 100 : 0 },
        ])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar funil')
      } finally {
        setLoading(false)
      }
    }

    fetchFunnel()
  }, [startDate, endDate, orgTablesList, retryCount])

  return { steps, loading, error, retry }
}
