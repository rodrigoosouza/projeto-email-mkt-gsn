'use client'

import Link from 'next/link'
import { Plus, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLeads } from '@/hooks/use-leads'
import { LeadsFilters } from '@/components/leads/leads-filters'
import { LeadsTable } from '@/components/leads/leads-table'
import { deleteLeads } from '@/lib/supabase/leads'

export default function LeadsPage() {
  const {
    leads,
    loading,
    page,
    setPage,
    pageSize,
    total,
    totalPages,
    filters,
    setFilters,
    clearFilters,
    refetch,
  } = useLeads()

  async function handleDeleteMany(ids: string[]) {
    await deleteLeads(ids)
    refetch()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Leads</h2>
          <p className="text-muted-foreground">Gerencie sua base de leads.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/leads/import">
              <Upload className="mr-2 h-4 w-4" />
              Importar CSV
            </Link>
          </Button>
          <Button asChild>
            <Link href="/leads/new">
              <Plus className="mr-2 h-4 w-4" />
              Novo Lead
            </Link>
          </Button>
        </div>
      </div>

      <LeadsFilters filters={filters} onFilterChange={setFilters} onClear={clearFilters} />

      <LeadsTable
        leads={leads}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        onPageChange={setPage}
        onDeleteMany={handleDeleteMany}
      />
    </div>
  )
}
