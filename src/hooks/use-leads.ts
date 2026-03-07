'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useOrganizationContext } from '@/contexts/organization-context'
import { queryLeads, getLeadTags } from '@/lib/supabase/leads'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import type { Lead, LeadTag } from '@/lib/types'

export interface LeadFilters {
  search: string
  status: string
  tags: string[]
  minScore?: number
  maxScore?: number
}

export interface LeadWithTags extends Lead {
  lead_tag_assignments: { tag: LeadTag }[]
}

const initialFilters: LeadFilters = {
  search: '',
  status: '',
  tags: [],
}

export function useLeads() {
  const { currentOrg } = useOrganizationContext()
  const [leads, setLeads] = useState<LeadWithTags[]>([])
  const [tags, setTags] = useState<LeadTag[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<LeadFilters>(initialFilters)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const pageSize = DEFAULT_PAGE_SIZE

  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const fetchLeads = useCallback(async () => {
    if (!currentOrg) return

    setLoading(true)
    try {
      const result = await queryLeads(
        currentOrg.id,
        {
          search: filters.search || undefined,
          status: filters.status || undefined,
          tags: filters.tags.length > 0 ? filters.tags : undefined,
          minScore: filters.minScore,
          maxScore: filters.maxScore,
        },
        { page, pageSize, sortBy, sortOrder }
      )
      setLeads(result.leads)
      setTotal(result.total)
    } catch (error) {
      console.error('Erro ao buscar leads:', error)
    } finally {
      setLoading(false)
    }
  }, [currentOrg, filters, page, pageSize, sortBy, sortOrder])

  const fetchTags = useCallback(async () => {
    if (!currentOrg) return
    try {
      const result = await getLeadTags(currentOrg.id)
      setTags(result)
    } catch (error) {
      console.error('Erro ao buscar tags:', error)
    }
  }, [currentOrg])

  // Debounced fetch for search changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      fetchLeads()
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [fetchLeads])

  // Fetch tags on mount / org change
  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  // Reset page when filters change
  const updateFilters = useCallback(
    (newFilters: Partial<LeadFilters>) => {
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
    fetchLeads()
    fetchTags()
  }, [fetchLeads, fetchTags])

  const totalPages = Math.ceil(total / pageSize)

  return {
    leads,
    tags,
    loading,
    page,
    setPage,
    pageSize,
    total,
    totalPages,
    filters,
    setFilters: updateFilters,
    clearFilters,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    refetch,
  }
}
