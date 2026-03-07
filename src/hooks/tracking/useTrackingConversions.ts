'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { queryMultiOrg, countMultiOrg } from '@/lib/tracking/query-helpers'
import type { OrgTables } from '@/lib/tracking/organizations'
import type { Conversion } from '@/lib/tracking/types'

interface UseTrackingConversionsReturn {
  data: Conversion[]
  loading: boolean
  error: string | null
  total: number
  page: number
  pageSize: number
  setPage: (p: number) => void
}

interface TrackingConversionFilters {
  startDate: string
  endDate: string
  status?: string
  search?: string
}

const PAGE_SIZE = 50

export function useTrackingConversions(filters: TrackingConversionFilters, orgTablesList: OrgTables[]): UseTrackingConversionsReturn {
  const [data, setData] = useState<Conversion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [filters.startDate, filters.endDate, filters.status, filters.search])

  useEffect(() => {
    const supabase = createClient()

    async function fetchConversions() {
      setLoading(true)
      setError(null)

      try {
        // Count total
        const totalCount = await countMultiOrg(orgTablesList, t => t.conversions, (table) => {
          let query = supabase
            .from(table)
            .select('*', { count: 'exact', head: true })
            .gte('created_at', filters.startDate)
            .lte('created_at', filters.endDate)

          if (filters.status) query = query.eq('deal_status', filters.status)

          return query
        })

        // Fetch page data
        const from = (page - 1) * PAGE_SIZE
        let allConversions = await queryMultiOrg(orgTablesList, t => t.conversions, (table) => {
          let query = supabase
            .from(table)
            .select('*')
            .gte('created_at', filters.startDate)
            .lte('created_at', filters.endDate)
            .order('created_at', { ascending: false })
            .range(from, from + PAGE_SIZE - 1)

          if (filters.status) query = query.eq('deal_status', filters.status)

          return query
        })

        // Sort merged results
        allConversions.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))

        if (filters.search) {
          const s = filters.search.toLowerCase()
          allConversions = allConversions.filter(c =>
            c.email?.toLowerCase().includes(s) ||
            c.first_name?.toLowerCase().includes(s) ||
            c.last_name?.toLowerCase().includes(s) ||
            c.deal_title?.toLowerCase().includes(s) ||
            c.company_name?.toLowerCase().includes(s)
          )
        }

        setData(allConversions)
        setTotal(totalCount)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar conversoes')
      } finally {
        setLoading(false)
      }
    }

    fetchConversions()
  }, [filters.startDate, filters.endDate, filters.status, filters.search, orgTablesList, page])

  return { data, loading, error, total, page, pageSize: PAGE_SIZE, setPage }
}
