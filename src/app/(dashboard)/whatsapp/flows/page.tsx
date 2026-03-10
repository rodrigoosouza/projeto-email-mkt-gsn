'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  Pencil,
  Trash2,
  Play,
  Pause,
  Loader2,
  GitBranchPlus,
  Workflow,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import {
  getAutomationFlows,
  createAutomationFlow,
  updateAutomationFlow,
  deleteAutomationFlow,
  type AutomationFlow,
} from '@/lib/supabase/automation-flows'

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Rascunho', variant: 'secondary' },
  active: { label: 'Ativo', variant: 'default' },
  paused: { label: 'Pausado', variant: 'outline' },
  archived: { label: 'Arquivado', variant: 'destructive' },
}

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  sms: 'SMS',
}

const TRIGGER_LABELS: Record<string, string> = {
  broadcast: 'Broadcast',
  tag_added: 'Tag Adicionada',
  form_submitted: 'Formulario Enviado',
  event: 'Evento',
  manual: 'Manual',
  keyword: 'Palavra-chave',
}

export default function FlowsPage() {
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()
  const [flows, setFlows] = useState<AutomationFlow[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newFlow, setNewFlow] = useState<{
    name: string
    description: string
    channel: AutomationFlow['channel']
    trigger_type: string
  }>({
    name: '',
    description: '',
    channel: 'whatsapp',
    trigger_type: 'broadcast',
  })

  const fetchFlows = async () => {
    if (!currentOrg) return
    setLoading(true)
    try {
      const data = await getAutomationFlows(currentOrg.id)
      setFlows(data)
    } catch (error) {
      console.error('Erro ao carregar fluxos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFlows()
  }, [currentOrg?.id])

  const handleCreate = async () => {
    if (!currentOrg || !newFlow.name.trim()) return
    setCreating(true)
    try {
      await createAutomationFlow(currentOrg.id, newFlow)
      toast({ title: 'Fluxo criado com sucesso' })
      setShowCreate(false)
      setNewFlow({ name: '', description: '', channel: 'whatsapp', trigger_type: 'broadcast' })
      fetchFlows()
    } catch (error) {
      toast({ title: 'Erro ao criar fluxo', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const handleToggleStatus = async (flow: AutomationFlow) => {
    const newStatus = flow.status === 'active' ? 'paused' : 'active'
    try {
      await updateAutomationFlow(flow.id, { status: newStatus })
      toast({ title: `Fluxo ${newStatus === 'active' ? 'ativado' : 'pausado'}` })
      fetchFlows()
    } catch (error) {
      toast({ title: 'Erro ao atualizar fluxo', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteAutomationFlow(id)
      toast({ title: 'Fluxo removido com sucesso' })
      fetchFlows()
    } catch (error) {
      toast({ title: 'Erro ao remover fluxo', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Fluxos de Automacao</h2>
          <p className="text-muted-foreground">
            Crie fluxos visuais para WhatsApp, Email e SMS.
          </p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Fluxo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Fluxo</DialogTitle>
              <DialogDescription>
                Configure o tipo e trigger do seu fluxo de automacao.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  placeholder="Ex: Webinar - Levantada de Mao"
                  value={newFlow.name}
                  onChange={(e) => setNewFlow({ ...newFlow, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Descricao</Label>
                <Textarea
                  placeholder="Descreva o objetivo deste fluxo..."
                  value={newFlow.description}
                  onChange={(e) => setNewFlow({ ...newFlow, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Canal</Label>
                  <Select
                    value={newFlow.channel}
                    onValueChange={(v) => setNewFlow({ ...newFlow, channel: v as AutomationFlow['channel'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Trigger</Label>
                  <Select
                    value={newFlow.trigger_type}
                    onValueChange={(v) => setNewFlow({ ...newFlow, trigger_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="broadcast">Broadcast</SelectItem>
                      <SelectItem value="tag_added">Tag Adicionada</SelectItem>
                      <SelectItem value="form_submitted">Formulario</SelectItem>
                      <SelectItem value="keyword">Palavra-chave</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={creating || !newFlow.name.trim()}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Fluxo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {flows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Workflow className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Nenhum fluxo criado ainda.
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Fluxo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {flows.map((flow) => {
            const statusConfig = STATUS_CONFIG[flow.status] || STATUS_CONFIG.draft
            const nodeCount = flow.flow_data?.nodes?.length || 0
            return (
              <Card key={flow.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{flow.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {CHANNEL_LABELS[flow.channel] || flow.channel}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {TRIGGER_LABELS[flow.trigger_type] || flow.trigger_type}
                      </Badge>
                    </div>
                  </div>
                  <Badge variant={statusConfig.variant}>
                    {statusConfig.label}
                  </Badge>
                </CardHeader>
                <CardContent>
                  {flow.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {flow.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <GitBranchPlus className="h-4 w-4" />
                      {nodeCount} blocos
                    </span>
                    <span>
                      {flow.stats?.total_entered || 0} leads
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/whatsapp/flows/${flow.id}`}>
                        <Pencil className="mr-1 h-3 w-3" />
                        Editar
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(flow)}
                    >
                      {flow.status === 'active' ? (
                        <>
                          <Pause className="mr-1 h-3 w-3" />
                          Pausar
                        </>
                      ) : (
                        <>
                          <Play className="mr-1 h-3 w-3" />
                          Ativar
                        </>
                      )}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover fluxo?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acao nao pode ser desfeita. Todas as execucoes
                            deste fluxo serao removidas.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(flow.id)}>
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
