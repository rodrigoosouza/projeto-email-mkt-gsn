'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTemplates } from '@/hooks/use-templates'
import { TemplatesFilters } from '@/components/templates/templates-filters'
import { TemplatesTable } from '@/components/templates/templates-table'

export default function TemplatesPage() {
  const {
    templates,
    loading,
    page,
    setPage,
    pageSize,
    total,
    totalPages,
    filters,
    setFilters,
    clearFilters,
  } = useTemplates()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Templates de Email</h2>
          <p className="text-muted-foreground">
            Crie e gerencie seus templates de email.
          </p>
        </div>
        <Button asChild>
          <Link href="/templates/new">
            <Plus className="mr-2 h-4 w-4" />
            Novo Template
          </Link>
        </Button>
      </div>

      <TemplatesFilters filters={filters} onFilterChange={setFilters} onClear={clearFilters} />

      <TemplatesTable
        templates={templates}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  )
}
