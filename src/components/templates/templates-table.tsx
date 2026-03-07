'use client'

import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react'
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
import { TEMPLATE_CATEGORY_LABELS, TEMPLATE_CATEGORY_COLORS } from '@/lib/constants'
import type { EmailTemplate } from '@/lib/types'

interface TemplatesTableProps {
  templates: EmailTemplate[]
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
            <Skeleton className="h-4 w-40" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-48" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-20 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

export function TemplatesTable({
  templates,
  loading,
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
}: TemplatesTableProps) {
  const router = useRouter()

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  if (!loading && templates.length === 0) {
    return (
      <div className="rounded-md border">
        <EmptyState
          icon={FileText}
          title="Nenhum template encontrado"
          description="Crie templates reutilizaveis para suas campanhas de email."
          action={
            <Button onClick={() => router.push('/templates/new')}>Criar Template</Button>
          }
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
              <TableHead>Assunto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Criado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton />
            ) : (
              templates.map((template) => {
                const categoryLabel =
                  TEMPLATE_CATEGORY_LABELS[template.category] || template.category
                const categoryColor =
                  TEMPLATE_CATEGORY_COLORS[template.category] || 'bg-gray-100 text-gray-800'

                return (
                  <TableRow
                    key={template.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/templates/${template.id}`)}
                  >
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {template.subject}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={categoryColor}>
                        {categoryLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(template.created_at), {
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
            Mostrando {from} a {to} de {total} templates
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
