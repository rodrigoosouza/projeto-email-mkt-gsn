'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCampaigns } from '@/hooks/use-campaigns'
import { CampaignsFilters } from '@/components/campaigns/campaigns-filters'
import { CampaignsTable } from '@/components/campaigns/campaigns-table'

export default function CampaignsPage() {
  const {
    campaigns,
    loading,
    page,
    setPage,
    pageSize,
    total,
    totalPages,
    filters,
    setFilters,
    clearFilters,
  } = useCampaigns()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Campanhas</h2>
          <p className="text-muted-foreground">
            Crie e acompanhe suas campanhas de email.
          </p>
        </div>
        <Button asChild>
          <Link href="/campaigns/new">
            <Plus className="mr-2 h-4 w-4" />
            Nova Campanha
          </Link>
        </Button>
      </div>

      <CampaignsFilters filters={filters} onFilterChange={setFilters} onClear={clearFilters} />

      <CampaignsTable
        campaigns={campaigns}
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
