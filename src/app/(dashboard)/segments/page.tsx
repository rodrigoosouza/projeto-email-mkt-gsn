'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSegments } from '@/hooks/use-segments'
import { SegmentsTable } from '@/components/segments/segments-table'

export default function SegmentsPage() {
  const {
    segments,
    loading,
    page,
    setPage,
    pageSize,
    total,
    totalPages,
  } = useSegments()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Segmentos</h2>
          <p className="text-muted-foreground">
            Crie segmentos para organizar e filtrar seus leads.
          </p>
        </div>
        <Button asChild>
          <Link href="/segments/new">
            <Plus className="mr-2 h-4 w-4" />
            Novo Segmento
          </Link>
        </Button>
      </div>

      <SegmentsTable
        segments={segments}
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
