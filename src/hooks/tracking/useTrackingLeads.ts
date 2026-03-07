'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { queryMultiOrg, countMultiOrg } from '@/lib/tracking/query-helpers'
import type { OrgTables } from '@/lib/tracking/organizations'
import type { LeadJourney } from '@/lib/tracking/types'

interface UseTrackingLeadsReturn {
  data: LeadJourney[]
  loading: boolean
  error: string | null
  total: number
  page: number
  pageSize: number
  setPage: (p: number) => void
}

interface TrackingLeadFilters {
  startDate: string
  endDate: string
  search?: string
  temperature?: string
  status?: string
  channel?: string
}

const PAGE_SIZE = 50

export function useTrackingLeads(filters: TrackingLeadFilters, orgTablesList: OrgTables[]): UseTrackingLeadsReturn {
  const [data, setData] = useState<LeadJourney[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [filters.startDate, filters.endDate, filters.search, filters.temperature, filters.status, filters.channel])

  useEffect(() => {
    const supabase = createClient()

    async function fetchLeads() {
      setLoading(true)
      setError(null)

      try {
        // Count total
        const totalCount = await countMultiOrg(orgTablesList, t => t.leadJourney, (table) => {
          let query = supabase
            .from(table)
            .select('*', { count: 'exact', head: true })
            .gte('deal_created_at', filters.startDate)
            .lte('deal_created_at', filters.endDate)

          if (filters.temperature) query = query.eq('lead_temperature', filters.temperature)
          if (filters.status) query = query.eq('deal_status', filters.status)
          if (filters.channel) query = query.eq('utm_source', filters.channel)

          return query
        })

        // Fetch page data
        const from = (page - 1) * PAGE_SIZE
        let allLeads = await queryMultiOrg(orgTablesList, t => t.leadJourney, (table) => {
          let query = supabase
            .from(table)
            .select('*')
            .gte('deal_created_at', filters.startDate)
            .lte('deal_created_at', filters.endDate)
            .order('deal_created_at', { ascending: false })
            .range(from, from + PAGE_SIZE - 1)

          if (filters.temperature) query = query.eq('lead_temperature', filters.temperature)
          if (filters.status) query = query.eq('deal_status', filters.status)
          if (filters.channel) query = query.eq('utm_source', filters.channel)

          return query
        })

        // Sort merged results
        allLeads.sort((a, b) => (b.deal_created_at || '').localeCompare(a.deal_created_at || ''))

        if (filters.search) {
          const s = filters.search.toLowerCase()
          allLeads = allLeads.filter(l =>
            l.email?.toLowerCase().includes(s) ||
            l.first_name?.toLowerCase().includes(s) ||
            l.last_name?.toLowerCase().includes(s) ||
            l.company_name?.toLowerCase().includes(s) ||
            l.deal_title?.toLowerCase().includes(s)
          )
        }

        setData(allLeads)
        setTotal(totalCount)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar leads')
      } finally {
        setLoading(false)
      }
    }

    fetchLeads()
  }, [filters.startDate, filters.endDate, filters.search, filters.temperature, filters.status, filters.channel, orgTablesList, page])

  return { data, loading, error, total, page, pageSize: PAGE_SIZE, setPage }
}
