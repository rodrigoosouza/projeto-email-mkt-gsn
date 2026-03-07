'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useOrganizationContext } from '@/contexts/organization-context'
import { querySegments } from '@/lib/supabase/segments'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import type { Segment } from '@/lib/types'

export interface SegmentFilters {
  search: string
  type: string
}

const initialFilters: SegmentFilters = {
  search: '',
  type: '',
}

export function useSegments() {
  const { currentOrg } = useOrganizationContext()
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<SegmentFilters>(initialFilters)
  const pageSize = DEFAULT_PAGE_SIZE

  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const fetchSegments = useCallback(async () => {
    if (!currentOrg) return

    setLoading(true)
    try {
      const result = await querySegments(
        currentOrg.id,
        {
          search: filters.search || undefined,
          type: filters.type || undefined,
        },
        { page, pageSize }
      )
      setSegments(result.segments)
      setTotal(result.total)
    } catch (error) {
      console.error('Erro ao buscar segmentos:', error)
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
      fetchSegments()
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [fetchSegments])

  // Reset page when filters change
  const updateFilters = useCallback(
    (newFilters: Partial<SegmentFilters>) => {
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
    fetchSegments()
  }, [fetchSegments])

  const totalPages = Math.ceil(total / pageSize)

  return {
    segments,
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
