'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useOrganizationContext } from '@/contexts/organization-context'
import { queryTemplates } from '@/lib/supabase/templates'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import type { EmailTemplate } from '@/lib/types'

export interface TemplateFilters {
  search: string
  category: string
}

const initialFilters: TemplateFilters = {
  search: '',
  category: '',
}

export function useTemplates() {
  const { currentOrg } = useOrganizationContext()
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<TemplateFilters>(initialFilters)
  const pageSize = DEFAULT_PAGE_SIZE

  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const fetchTemplates = useCallback(async () => {
    if (!currentOrg) return

    setLoading(true)
    try {
      const result = await queryTemplates(
        currentOrg.id,
        {
          search: filters.search || undefined,
          category: filters.category || undefined,
        },
        { page, pageSize }
      )
      setTemplates(result.templates)
      setTotal(result.total)
    } catch (error) {
      console.error('Erro ao buscar templates:', error)
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
      fetchTemplates()
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [fetchTemplates])

  // Reset page when filters change
  const updateFilters = useCallback(
    (newFilters: Partial<TemplateFilters>) => {
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
    fetchTemplates()
  }, [fetchTemplates])

  const totalPages = Math.ceil(total / pageSize)

  return {
    templates,
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
