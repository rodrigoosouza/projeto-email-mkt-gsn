'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Users, ChevronLeft, ChevronRight, Trash2, Loader2 } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { EmptyState } from '@/components/shared/empty-state'
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from '@/lib/constants'
import type { LeadWithTags } from '@/hooks/use-leads'

interface LeadsTableProps {
  leads: LeadWithTags[]
  loading: boolean
  page: number
  pageSize: number
  total: number
  totalPages: number
  onPageChange: (page: number) => void
  onDeleteMany?: (ids: string[]) => Promise<void>
  onDeleteAll?: () => Promise<void>
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-gray-300'

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{score}</span>
    </div>
  )
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-4" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-36" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        </TableRow>
      ))}
    </>
  )
}

export function LeadsTable({
  leads,
  loading,
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onDeleteMany,
  onDeleteAll,
}: LeadsTableProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectAllMode, setSelectAllMode] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const allSelected = leads.length > 0 && leads.every((l) => selectedIds.has(l.id))

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)))
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleDeleteSelected() {
    if (selectAllMode && onDeleteAll) {
      setDeleting(true)
      try {
        await onDeleteAll()
        toast({ title: `Todos os ${total} leads excluidos` })
        setSelectedIds(new Set())
        setSelectAllMode(false)
      } catch {
        toast({ title: 'Erro ao excluir leads', variant: 'destructive' })
      } finally {
        setDeleting(false)
      }
      return
    }

    if (!onDeleteMany || selectedIds.size === 0) return
    setDeleting(true)
    try {
      await onDeleteMany(Array.from(selectedIds))
      toast({ title: `${selectedIds.size} lead(s) excluido(s)` })
      setSelectedIds(new Set())
    } catch {
      toast({ title: 'Erro ao excluir leads', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  const displayCount = selectAllMode ? total : selectedIds.size

  if (!loading && leads.length === 0) {
    return (
      <div className="rounded-md border">
        <EmptyState
          icon={Users}
          title="Nenhum lead encontrado"
          description="Adicione leads manualmente ou importe um arquivo CSV."
          action={
            <Button onClick={() => router.push('/leads/new')}>Adicionar Lead</Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-col gap-2 p-3 bg-muted/50 border rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{displayCount} selecionado(s)</span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={deleting}>
                  {deleting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-2 h-3.5 w-3.5" />}
                  Excluir {selectAllMode ? 'Todos' : 'Selecionados'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir {displayCount} lead(s)?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acao nao pode ser desfeita. {selectAllMode ? 'Todos os leads serao' : 'Os leads selecionados serao'} permanentemente excluidos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Excluir {displayCount} lead(s)
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="ghost" size="sm" onClick={() => { setSelectedIds(new Set()); setSelectAllMode(false) }}>
              Limpar selecao
            </Button>
          </div>
          {allSelected && total > pageSize && !selectAllMode && (
            <p className="text-sm text-muted-foreground">
              Todos os {leads.length} leads desta pagina estao selecionados.{' '}
              <button
                type="button"
                className="text-primary hover:underline font-medium"
                onClick={() => setSelectAllMode(true)}
              >
                Selecionar todos os {total} leads
              </button>
            </p>
          )}
          {selectAllMode && (
            <p className="text-sm text-primary font-medium">
              Todos os {total} leads estao selecionados.{' '}
              <button
                type="button"
                className="text-muted-foreground hover:underline font-normal"
                onClick={() => setSelectAllMode(false)}
              >
                Selecionar apenas esta pagina
              </button>
            </p>
          )}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
              </TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Fonte</TableHead>
              <TableHead>Criativo</TableHead>
              <TableHead>Etapa CRM</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead>Atualizado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton />
            ) : (
              leads.map((lead) => {
                const fullName = [lead.first_name, lead.last_name]
                  .filter(Boolean)
                  .join(' ')
                const statusLabel = LEAD_STATUS_LABELS[lead.status] || lead.status
                const statusColor = LEAD_STATUS_COLORS[lead.status] || ''
                const tags = lead.lead_tag_assignments?.map((a) => a.tag).filter(Boolean) || []

                return (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/leads/${lead.id}`)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(lead.id)}
                        onCheckedChange={() => toggleSelect(lead.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {fullName || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-sm max-w-[180px] truncate">{lead.email}</TableCell>
                    <TableCell className="text-sm">
                      {lead.company || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {lead.source ? (
                        <Badge variant="outline" className="text-xs">
                          {lead.source}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate text-muted-foreground">
                      {(lead.custom_fields as any)?.criativo || '-'}
                    </TableCell>
                    <TableCell>
                      {(lead.custom_fields as any)?.deal_stage ? (
                        <Badge variant="secondary" className="text-xs">
                          {(lead.custom_fields as any).deal_stage}
                        </Badge>
                      ) : (lead.custom_fields as any)?.deal_status ? (
                        <Badge variant="secondary" className="text-xs">
                          {(lead.custom_fields as any).deal_status}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(lead.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      <br />
                      <span className="text-[10px]">{new Date(lead.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {lead.updated_at ? (
                        <>
                          {new Date(lead.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          <br />
                          <span className="text-[10px]">{new Date(lead.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </>
                      ) : '-'}
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
            Mostrando {from} a {to} de {total} leads
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
