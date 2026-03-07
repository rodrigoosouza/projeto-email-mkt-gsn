'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { queryMultiOrg, countMultiOrg } from '@/lib/tracking/query-helpers'
import type { OrgTables } from '@/lib/tracking/organizations'
import { LEAD_EVENTS } from '@/lib/tracking/constants'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ChartPoint {
  date: string
  label: string
  value: number
}

interface ChannelData {
  channel: string
  leads: number
  conversions: number
}

interface TempData {
  temperature: string
  count: number
}

interface FunnelStep {
  name: string
  value: number
}

interface UseTrackingChartsReturn {
  leadsOverTime: ChartPoint[]
  channelBreakdown: ChannelData[]
  temperatureDistribution: TempData[]
  funnelData: FunnelStep[]
  loading: boolean
  error: string | null
  retry: () => void
}

export function useTrackingCharts(startDate: string, endDate: string, orgTablesList: OrgTables[]): UseTrackingChartsReturn {
  const [leadsOverTime, setLeadsOverTime] = useState<ChartPoint[]>([])
  const [channelBreakdown, setChannelBreakdown] = useState<ChannelData[]>([])
  const [temperatureDistribution, setTemperatureDistribution] = useState<TempData[]>([])
  const [funnelData, setFunnelData] = useState<FunnelStep[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const retry = useCallback(() => setRetryCount(c => c + 1), [])

  useEffect(() => {
    const supabase = createClient()

    async function fetchCharts() {
      setLoading(true)
      setError(null)

      try {
        // Leads over time
        const leads = await queryMultiOrg(orgTablesList, t => t.events, (table) =>
          supabase.from(table).select('created_at')
            .in('event_name', LEAD_EVENTS)
            .gte('created_at', startDate).lte('created_at', endDate)
            .order('created_at', { ascending: true })
        )

        const dailyMap: Record<string, number> = {}
        leads.forEach(l => {
          const day = format(parseISO(l.created_at), 'yyyy-MM-dd')
          dailyMap[day] = (dailyMap[day] || 0) + 1
        })
        setLeadsOverTime(
          Object.entries(dailyMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, value]) => ({
              date,
              label: format(parseISO(date), 'dd/MM', { locale: ptBR }),
              value,
            }))
        )

        // Channel breakdown
        const channelLeads = await queryMultiOrg(orgTablesList, t => t.events, (table) =>
          supabase.from(table).select('utm_source')
            .in('event_name', LEAD_EVENTS)
            .gte('created_at', startDate).lte('created_at', endDate)
        )

        const channelConversions = await queryMultiOrg(orgTablesList, t => t.conversions, (table) =>
          supabase.from(table).select('utm_source, deal_status')
            .gte('created_at', startDate).lte('created_at', endDate)
        )

        const channelMap: Record<string, { leads: number; conversions: number }> = {}
        channelLeads.forEach(l => {
          const ch = l.utm_source || 'direct'
          if (!channelMap[ch]) channelMap[ch] = { leads: 0, conversions: 0 }
          channelMap[ch].leads++
        })
        channelConversions.forEach(c => {
          const ch = c.utm_source || 'direct'
          if (!channelMap[ch]) channelMap[ch] = { leads: 0, conversions: 0 }
          if (c.deal_status === 'won') channelMap[ch].conversions++
        })
        setChannelBreakdown(
          Object.entries(channelMap)
            .map(([channel, data]) => ({ channel, ...data }))
            .sort((a, b) => b.leads - a.leads)
        )

        // Temperature distribution
        const tempData = await queryMultiOrg(orgTablesList, t => t.conversions, (table) =>
          supabase.from(table).select('lead_temperature')
            .gte('created_at', startDate).lte('created_at', endDate)
        )

        const tempMap: Record<string, number> = {}
        tempData.forEach(t => {
          const temp = t.lead_temperature || 'frio'
          tempMap[temp] = (tempMap[temp] || 0) + 1
        })
        setTemperatureDistribution(
          Object.entries(tempMap).map(([temperature, count]) => ({ temperature, count }))
        )

        // Funnel data
        const pageViews = await countMultiOrg(orgTablesList, t => t.events, (table) =>
          supabase.from(table).select('*', { count: 'exact', head: true })
            .in('event_name', ['page_view', 'custom_page_view'])
            .gte('created_at', startDate).lte('created_at', endDate)
        )

        const formLeads = await countMultiOrg(orgTablesList, t => t.events, (table) =>
          supabase.from(table).select('*', { count: 'exact', head: true })
            .in('event_name', LEAD_EVENTS)
            .gte('created_at', startDate).lte('created_at', endDate)
        )

        const allConversions = await countMultiOrg(orgTablesList, t => t.conversions, (table) =>
          supabase.from(table).select('*', { count: 'exact', head: true })
            .gte('created_at', startDate).lte('created_at', endDate)
        )

        const wonDeals = await countMultiOrg(orgTablesList, t => t.conversions, (table) =>
          supabase.from(table).select('*', { count: 'exact', head: true })
            .eq('deal_status', 'won')
            .gte('created_at', startDate).lte('created_at', endDate)
        )

        setFunnelData([
          { name: 'Pageviews', value: pageViews },
          { name: 'Leads', value: formLeads },
          { name: 'Oportunidades', value: allConversions },
          { name: 'Vendas', value: wonDeals },
        ])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar graficos')
      } finally {
        setLoading(false)
      }
    }

    fetchCharts()
  }, [startDate, endDate, orgTablesList, retryCount])

  return { leadsOverTime, channelBreakdown, temperatureDistribution, funnelData, loading, error, retry }
}
