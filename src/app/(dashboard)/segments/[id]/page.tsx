'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, RefreshCw, Search, Trash2, UserPlus, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import {
  getSegment,
  getSegmentLeads,
  deleteSegment,
  addLeadsToSegment,
  removeLeadFromSegment,
  recalculateSegmentCount,
} from '@/lib/supabase/segments'
import { queryLeads } from '@/lib/supabase/leads'
import {
  SEGMENT_TYPE_LABELS,
  SEGMENT_TYPE_COLORS,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  OPERATOR_LABELS,
  SEGMENT_RULE_FIELDS,
} from '@/lib/constants'
import type { Segment, Lead } from '@/lib/types'

// ============= ADD LEADS DIALOG =============

interface AddLeadsDialogProps {
  segmentId: string
  orgId: string
  existingLeadIds: string[]
  onLeadsAdded: () => void
}

function AddLeadsDialog({ segmentId, orgId, existingLeadIds, onLeadsAdded }: AddLeadsDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Lead[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(false)

  const handleSearch = useCallback(async () => {
    if (!search.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const { leads } = await queryLeads(orgId, { search }, { pageSize: 20 })
      // Filter out leads already in the segment
      const filtered = leads.filter((l: Lead) => !existingLeadIds.includes(l.id))
      setResults(filtered)
    } catch (error) {
      console.error('Erro ao buscar leads:', error)
    } finally {
      setSearching(false)
    }
  }, [search, orgId, existingLeadIds])

  useEffect(() => {
    if (!open) {
      setSearch('')
      setResults([])
      setSelectedIds([])
    }
  }, [open])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (open && search.trim()) {
        handleSearch()
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [search, open, handleSearch])

  const toggleLead = (leadId: string) => {
    setSelectedIds((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    )
  }

  const handleAdd = async () => {
    if (selectedIds.length === 0) return
    setAdding(true)
    try {
      await addLeadsToSegment(segmentId, selectedIds)
      toast({
        title: 'Leads adicionados',
        description: `${selectedIds.length} ${selectedIds.length === 1 ? 'lead adicionado' : 'leads adicionados'} ao segmento.`,
      })
      setOpen(false)
      onLeadsAdded()
    } catch (error) {
      console.error('Erro ao adicionar leads:', error)
      toast({
        title: 'Erro',
        description: 'Nao foi possivel adicionar os leads.',
        variant: 'destructive',
      })
    } finally {
      setAdding(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          Adicionar Leads
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Leads ao Segmento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email, nome ou empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-64 overflow-y-auto border rounded-md">
            {searching && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Buscando...
              </div>
            )}
            {!searching && results.length === 0 && search.trim() && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhum lead encontrado.
              </div>
            )}
            {!searching && !search.trim() && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Digite para buscar leads.
              </div>
            )}
            {results.map((lead) => (
              <label
                key={lead.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
              >
                <Checkbox
                  checked={selectedIds.includes(lead.id)}
                  onCheckedChange={() => toggleLead(lead.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{lead.email}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[lead.first_name, lead.last_name].filter(Boolean).join(' ')}
                    {lead.company ? ` - ${lead.company}` : ''}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedIds.length} {selectedIds.length === 1 ? 'selecionado' : 'selecionados'}
            </span>
            <Button onClick={handleAdd} disabled={selectedIds.length === 0 || adding} size="sm">
              {adding ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============= SEGMENT DETAIL PAGE =============

export default function SegmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { currentOrg } = useOrganizationContext()
  const segmentId = params.id as string

  const [segment, setSegment] = useState<Segment | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [leadsTotal, setLeadsTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [removingLeadId, setRemovingLeadId] = useState<string | null>(null)

  const fetchSegment = useCallback(async () => {
    try {
      const data = await getSegment(segmentId)
      setSegment(data)
    } catch (error) {
      console.error('Erro ao buscar segmento:', error)
      toast({ title: 'Erro', description: 'Segmento nao encontrado.', variant: 'destructive' })
      router.push('/segments')
    }
  }, [segmentId, router, toast])

  const fetchLeads = useCallback(async () => {
    if (!currentOrg) return
    try {
      const { leads: data, total } = await getSegmentLeads(segmentId, currentOrg.id)
      setLeads(data)
      setLeadsTotal(total)
    } catch (error) {
      console.error('Erro ao buscar leads do segmento:', error)
    }
  }, [segmentId, currentOrg])

  useEffect(() => {
    async function load() {
      setLoading(true)
      await fetchSegment()
      await fetchLeads()
      setLoading(false)
    }
    load()
  }, [fetchSegment, fetchLeads])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteSegment(segmentId)
      toast({ title: 'Segmento excluido', description: 'O segmento foi excluido com sucesso.' })
      router.push('/segments')
    } catch (error) {
      console.error('Erro ao excluir segmento:', error)
      toast({
        title: 'Erro',
        description: 'Nao foi possivel excluir o segmento.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleRecalculate = async () => {
    if (!currentOrg) return
    setRecalculating(true)
    try {
      const newCount = await recalculateSegmentCount(segmentId, currentOrg.id)
      setSegment((prev) => (prev ? { ...prev, lead_count: newCount } : prev))
      await fetchLeads()
      toast({ title: 'Recalculado', description: `${newCount} leads no segmento.` })
    } catch (error) {
      console.error('Erro ao recalcular:', error)
      toast({
        title: 'Erro',
        description: 'Nao foi possivel recalcular o segmento.',
        variant: 'destructive',
      })
    } finally {
      setRecalculating(false)
    }
  }

  const handleRemoveLead = async (leadId: string) => {
    setRemovingLeadId(leadId)
    try {
      await removeLeadFromSegment(segmentId, leadId)
      setLeads((prev) => prev.filter((l) => l.id !== leadId))
      setLeadsTotal((prev) => prev - 1)
      setSegment((prev) => (prev ? { ...prev, lead_count: prev.lead_count - 1 } : prev))
      toast({ title: 'Lead removido', description: 'O lead foi removido do segmento.' })
    } catch (error) {
      console.error('Erro ao remover lead:', error)
      toast({
        title: 'Erro',
        description: 'Nao foi possivel remover o lead.',
        variant: 'destructive',
      })
    } finally {
      setRemovingLeadId(null)
    }
  }

  const handleLeadsAdded = () => {
    fetchLeads()
    fetchSegment()
  }

  const getFieldLabel = (field: string): string => {
    const found = SEGMENT_RULE_FIELDS.find((f) => f.value === field)
    return found?.label || field
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-[300px] w-full rounded-lg" />
        <Skeleton className="h-[200px] w-full rounded-lg" />
      </div>
    )
  }

  if (!segment) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" onClick={() => router.push('/segments')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Segmentos
          </Button>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">{segment.name}</h2>
            <Badge className={SEGMENT_TYPE_COLORS[segment.type] || ''}>
              {SEGMENT_TYPE_LABELS[segment.type] || segment.type}
            </Badge>
          </div>
          {segment.description && (
            <p className="text-muted-foreground">{segment.description}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Criado {formatDistanceToNow(new Date(segment.created_at), { addSuffix: true, locale: ptBR })}
            {' - '}{segment.lead_count} {segment.lead_count === 1 ? 'lead' : 'leads'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/segments/${segment.id}/edit`)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir segmento</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o segmento{' '}
                  <strong>{segment.name}</strong>? Esta acao nao pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Rules (dynamic segments) */}
      {segment.type === 'dynamic' && segment.rules && segment.rules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Regras do Segmento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {segment.rules.map((rule, index) => (
                <div key={rule.id || index}>
                  {index > 0 && (
                    <div className="flex items-center gap-2 my-2">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs font-medium text-muted-foreground px-2">E</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3 text-sm">
                    <span className="font-medium">{getFieldLabel(rule.field)}</span>
                    <span className="text-muted-foreground">{OPERATOR_LABELS[rule.operator] || rule.operator}</span>
                    {rule.value !== undefined && rule.value !== null && rule.value !== '' && (
                      <span className="font-medium">&quot;{rule.value}&quot;</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leads */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Leads do Segmento ({leadsTotal})
            </CardTitle>
            <div className="flex items-center gap-2">
              {segment.type === 'static' && currentOrg && (
                <AddLeadsDialog
                  segmentId={segment.id}
                  orgId={currentOrg.id}
                  existingLeadIds={leads.map((l) => l.id)}
                  onLeadsAdded={handleLeadsAdded}
                />
              )}
              {segment.type === 'dynamic' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRecalculate}
                  disabled={recalculating}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${recalculating ? 'animate-spin' : ''}`} />
                  {recalculating ? 'Recalculando...' : 'Recalcular'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Nenhum lead neste segmento.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  {segment.type === 'static' && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.email}</TableCell>
                    <TableCell>
                      {[lead.first_name, lead.last_name].filter(Boolean).join(' ') || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={LEAD_STATUS_COLORS[lead.status] || ''}>
                        {LEAD_STATUS_LABELS[lead.status] || lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{lead.score}</TableCell>
                    {segment.type === 'static' && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveLead(lead.id)}
                          disabled={removingLeadId === lead.id}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
