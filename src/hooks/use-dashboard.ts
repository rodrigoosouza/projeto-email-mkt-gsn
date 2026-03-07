'use client'

import { useState, useEffect, useCallback } from 'react'
import { useOrganizationContext } from '@/contexts/organization-context'
import { getDashboardData, type DashboardData } from '@/lib/supabase/dashboard'

export function useDashboard() {
  const { currentOrg } = useOrganizationContext()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!currentOrg) return
    setLoading(true)
    try {
      const result = await getDashboardData(currentOrg.id)
      setData(result)
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error)
    } finally {
      setLoading(false)
    }
  }, [currentOrg])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, refetch: fetchData }
}
