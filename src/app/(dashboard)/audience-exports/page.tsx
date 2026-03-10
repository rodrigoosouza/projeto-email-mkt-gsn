'use client'

import { useState, useEffect } from 'react'
import { Play, Trash2, Plus, Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { useAuth } from '@/hooks/use-auth'
import {
  getAudienceExports,
  createAudienceExport,
  deleteAudienceExport,
} from '@/lib/supabase/audience-exports'
import { querySegments } from '@/lib/supabase/segments'
import type { AudienceExport, Segment } from '@/lib/types'
import { AUDIENCE_PLATFORM_LABELS } from '@/lib/constants'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const PLATFORM_COLORS: Record<string, string> = {
  meta_ads: 'bg-blue-100 text-blue-800',
  google_ads: 'bg-green-100 text-green-800',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  processing: 'Processando',
  completed: 'Concluido',
  failed: 'Falhou',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  processing: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

type AudienceExportWithSegment = AudienceExport & {
  segment: { id: string; name: string } | null
}

export default function AudienceExportsPage() {
  const { currentOrg } = useOrganizationContext()
  const { user } = useAuth()
  const { toast } = useToast()
  const orgId = currentOrg?.id

  const [exports, setExports] = useState<AudienceExportWithSegment[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)

  // Create form state
  const [newName, setNewName] = useState('')
  const [newPlatform, setNewPlatform] = useState<string>('')
  const [newSegmentId, setNewSegmentId] = useState<string>('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!orgId) return
    loadData()
  }, [orgId])

  async function loadData() {
    if (!orgId) return
    setLoading(true)
    try {
      const [exportsResult, segmentsResult] = await Promise.all([
        getAudienceExports(orgId),
        querySegments(orgId, {}, { pageSize: 100 }),
      ])
      setExports(exportsResult)
      setSegments(segmentsResult.segments)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!orgId || !user || !newName || !newPlatform) return
    setCreating(true)
    try {
      const created = await createAudienceExport({
        org_id: orgId,
        name: newName,
        platform: newPlatform,
        segment_id: newSegmentId && newSegmentId !== 'all' ? newSegmentId : null,
        config: {},
        created_by: user.id,
      })
      setExports((prev) => [
        { ...created, segment: segments.find((s) => s.id === newSegmentId) ? { id: newSegmentId, name: segments.find((s) => s.id === newSegmentId)!.name } : null },
        ...prev,
      ])
      setShowCreateDialog(false)
      setNewName('')
      setNewPlatform('')
      setNewSegmentId('')
      toast({
        title: 'Exportacao criada',
        description: `"${created.name}" foi criada com sucesso.`,
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Nao foi possivel criar a exportacao.',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  async function handleSync(exportItem: AudienceExportWithSegment) {
    setSyncingId(exportItem.id)
    try {
      const res = await fetch(`/api/audience-exports/${exportItem.id}/sync`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao sincronizar')

      toast({
        title: 'Sincronizacao concluida',
        description: `${data.exported_leads} leads exportados para ${AUDIENCE_PLATFORM_LABELS[exportItem.platform]}.`,
      })
      await loadData()
    } catch (error: any) {
      toast({
        title: 'Erro na sincronizacao',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setSyncingId(null)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteAudienceExport(deleteId)
      setExports((prev) => prev.filter((e) => e.id !== deleteId))
      toast({
        title: 'Exportacao excluida',
        description: 'A exportacao foi excluida com sucesso.',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Nao foi possivel excluir a exportacao.',
        variant: 'destructive',
      })
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Exportacao de Publicos</h2>
          <p className="text-muted-foreground">
            Exporte segmentos de leads para plataformas de anuncios.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Exportacao
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exportacoes</CardTitle>
          <CardDescription>
            Gerencie suas exportacoes de publicos para Meta Ads e Google Ads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Carregando...</div>
            </div>
          ) : exports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Upload className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">Nenhuma exportacao ainda</h3>
              <p className="text-muted-foreground mt-1 mb-4">
                Crie sua primeira exportacao para sincronizar leads com plataformas de anuncios.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Exportacao
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Ultima Sync</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exports.map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell className="font-medium">{exp.name}</TableCell>
                    <TableCell>
                      <Badge className={PLATFORM_COLORS[exp.platform]}>
                        {AUDIENCE_PLATFORM_LABELS[exp.platform]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {exp.segment?.name || <span className="text-muted-foreground">Todos os leads</span>}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[exp.status]}>
                        {STATUS_LABELS[exp.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {exp.exported_leads > 0 ? (
                        <span>{exp.exported_leads}/{exp.total_leads}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {exp.last_synced_at
                        ? format(new Date(exp.last_synced_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSync(exp)}
                          disabled={syncingId === exp.id}
                          title="Sincronizar"
                        >
                          {syncingId === exp.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(exp.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Exportacao de Publico</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="export-name">Nome</Label>
              <Input
                id="export-name"
                placeholder="Ex: Leads ativos - Meta"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="export-platform">Plataforma</Label>
              <Select value={newPlatform} onValueChange={setNewPlatform}>
                <SelectTrigger id="export-platform">
                  <SelectValue placeholder="Selecione a plataforma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meta_ads">Meta Ads</SelectItem>
                  <SelectItem value="google_ads">Google Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="export-segment">Segmento (opcional)</Label>
              <Select value={newSegmentId} onValueChange={setNewSegmentId}>
                <SelectTrigger id="export-segment">
                  <SelectValue placeholder="Todos os leads" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os leads</SelectItem>
                  {segments.map((seg) => (
                    <SelectItem key={seg.id} value={seg.id}>
                      {seg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newName || !newPlatform || creating}
            >
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Exportacao
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir exportacao?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. A exportacao sera removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
