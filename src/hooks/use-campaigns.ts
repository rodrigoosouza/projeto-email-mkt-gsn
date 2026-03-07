'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useOrganizationContext } from '@/contexts/organization-context'
import { queryCampaigns } from '@/lib/supabase/campaigns'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import type { Campaign } from '@/lib/types'

export interface CampaignFilters {
  search: string
  status: string
}

export interface CampaignWithJoins extends Omit<Campaign, 'template' | 'segment'> {
  template: { name: string } | null
  segment: { name: string } | null
}

const initialFilters: CampaignFilters = {
  search: '',
  status: '',
}

export function useCampaigns() {
  const { currentOrg } = useOrganizationContext()
  const [campaigns, setCampaigns] = useState<CampaignWithJoins[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<CampaignFilters>(initialFilters)
  const pageSize = DEFAULT_PAGE_SIZE

  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const fetchCampaigns = useCallback(async () => {
    if (!currentOrg) return

    setLoading(true)
    try {
      const result = await queryCampaigns(
        currentOrg.id,
        {
          search: filters.search || undefined,
          status: filters.status || undefined,
        },
        { page, pageSize }
      )
      setCampaigns(result.campaigns)
      setTotal(result.total)
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error)
    } finally {
      setLoading(false)
    }
  }, [currentOrg, filters, page, pageSize])

  // Debounced fetch for search changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      fetchCampaigns()
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [fetchCampaigns])

  // Reset page when filters change
  const updateFilters = useCallback(
    (newFilters: Partial<CampaignFilters>) => {
      setFilters((prev) => ({ ...prev, ...newFilters }))
      setPage(1)
    },
    []
  )

  const clearFilters = useCallback(() => {
    setFilters(initialFilters)
    setPage(1)
  }, [])

  const refetch = useCallback(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const totalPages = Math.ceil(total / pageSize)

  return {
    campaigns,
    loading,
    page,
    setPage,
    pageSize,
    total,
    totalPages,
    filters,
    setFilters: updateFilters,
    clearFilters,
    refetch,
  }
}
