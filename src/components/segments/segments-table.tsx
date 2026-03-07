'use client'

import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { SEGMENT_TYPE_LABELS, SEGMENT_TYPE_COLORS } from '@/lib/constants'
import type { Segment } from '@/lib/types'

interface SegmentsTableProps {
  segments: Segment[]
  loading: boolean
  page: number
  pageSize: number
  total: number
  totalPages: number
  onPageChange: (page: number) => void
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-4 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-48" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-16 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-12" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

export function SegmentsTable({
  segments,
  loading,
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
}: SegmentsTableProps) {
  const router = useRouter()

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  if (!loading && segments.length === 0) {
    return (
      <div className="rounded-md border">
        <EmptyState
          icon={Filter}
          title="Nenhum segmento encontrado"
          description="Crie segmentos para organizar e filtrar seus leads."
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descricao</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Leads</TableHead>
              <TableHead>Criado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton />
            ) : (
              segments.map((segment) => {
                const typeLabel = SEGMENT_TYPE_LABELS[segment.type] || segment.type
                const typeColor = SEGMENT_TYPE_COLORS[segment.type] || ''
                const description = segment.description
                  ? segment.description.length > 50
                    ? `${segment.description.slice(0, 50)}...`
                    : segment.description
                  : null

                return (
                  <TableRow
                    key={segment.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/segments/${segment.id}`)}
                  >
                    <TableCell className="font-medium">{segment.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {description || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={typeColor}>
                        {typeLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>{segment.lead_count}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(segment.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Mostrando {from} a {to} de {total} segmentos
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Proximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
