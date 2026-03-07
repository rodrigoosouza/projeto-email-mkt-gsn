'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { queryMultiOrg } from '@/lib/tracking/query-helpers'
import type { OrgTables } from '@/lib/tracking/organizations'
import { LEAD_EVENTS } from '@/lib/tracking/constants'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface TrackingCampaignData {
  utm_source: string
  utm_medium: string
  utm_campaign: string
  leads: number
  conversions: number
  revenue: number
  conversionRate: number
}

export interface TrackingCampaignTimeline {
  date: string
  label: string
  leads: number
}

interface UseTrackingCampaignsReturn {
  campaigns: TrackingCampaignData[]
  timeline: TrackingCampaignTimeline[]
  loading: boolean
  error: string | null
  retry: () => void
}

export function useTrackingCampaigns(startDate: string, endDate: string, orgTablesList: OrgTables[]): UseTrackingCampaignsReturn {
  const [campaigns, setCampaigns] = useState<TrackingCampaignData[]>([])
  const [timeline, setTimeline] = useState<TrackingCampaignTimeline[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const retry = useCallback(() => setRetryCount(c => c + 1), [])

  useEffect(() => {
    const supabase = createClient()

    async function fetchCampaigns() {
      setLoading(true)
      setError(null)

      try {
        const leads = await queryMultiOrg(orgTablesList, t => t.events, (table) =>
          supabase.from(table).select('*')
            .in('event_name', LEAD_EVENTS)
            .gte('created_at', startDate).lte('created_at', endDate)
        )

        const conversions = await queryMultiOrg(orgTablesList, t => t.conversions, (table) =>
          supabase.from(table).select('*')
            .gte('created_at', startDate).lte('created_at', endDate)
        )

        const campaignMap: Record<string, TrackingCampaignData> = {}

        leads.forEach(l => {
          const key = `${l.utm_source || 'direct'}|${l.utm_medium || '(none)'}|${l.utm_campaign || '(none)'}`
          if (!campaignMap[key]) {
            campaignMap[key] = {
              utm_source: l.utm_source || 'direct',
              utm_medium: l.utm_medium || '(none)',
              utm_campaign: l.utm_campaign || '(none)',
              leads: 0, conversions: 0, revenue: 0, conversionRate: 0,
            }
          }
          campaignMap[key].leads++
        })

        conversions.forEach(c => {
          const key = `${c.utm_source || 'direct'}|${c.utm_medium || '(none)'}|${c.utm_campaign || '(none)'}`
          if (!campaignMap[key]) {
            campaignMap[key] = {
              utm_source: c.utm_source || 'direct',
              utm_medium: c.utm_medium || '(none)',
              utm_campaign: c.utm_campaign || '(none)',
              leads: 0, conversions: 0, revenue: 0, conversionRate: 0,
            }
          }
          if (c.deal_status === 'won') {
            campaignMap[key].conversions++
            campaignMap[key].revenue += c.deal_value || 0
          }
        })

        const campaignList = Object.values(campaignMap).map(c => ({
          ...c,
          conversionRate: c.leads > 0 ? (c.conversions / c.leads) * 100 : 0,
        })).sort((a, b) => b.leads - a.leads)

        setCampaigns(campaignList)

        const dailyMap: Record<string, number> = {}
        leads.forEach(l => {
          const day = format(parseISO(l.created_at), 'yyyy-MM-dd')
          dailyMap[day] = (dailyMap[day] || 0) + 1
        })
        setTimeline(
          Object.entries(dailyMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, leads]) => ({
              date,
              label: format(parseISO(date), 'dd/MM', { locale: ptBR }),
              leads,
            }))
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar campanhas')
      } finally {
        setLoading(false)
      }
    }

    fetchCampaigns()
  }, [startDate, endDate, orgTablesList, retryCount])

  return { campaigns, timeline, loading, error, retry }
}
