'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ArrowLeft, Play, Pause, Trash2, Pencil, Zap,
  CheckCircle2, XCircle, MinusCircle, Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import {
  getAutomation, deleteAutomation, toggleAutomation, getAutomationLogs,
} from '@/lib/supabase/automations'
import {
  AUTOMATION_TRIGGER_LABELS, AUTOMATION_ACTION_LABELS,
} from '@/lib/constants'
import type { Automation, AutomationLog } from '@/lib/types'

const LOG_STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  skipped: MinusCircle,
}

const LOG_STATUS_LABELS: Record<string, string> = {
  success: 'Sucesso',
  error: 'Erro',
  skipped: 'Ignorado',
}

const LOG_STATUS_COLORS: Record<string, string> = {
  success: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
  skipped: 'bg-gray-100 text-gray-800',
}

export default function AutomationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { currentOrg } = useOrganizationContext()

  const [automation, setAutomation] = useState<Automation | null>(null)
  const [logs, setLogs] = useState<AutomationLog[]>([])
  const [logCount, setLogCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const automationId = params.id as string

  const loadData = useCallback(async () => {
    try {
      const [automationData, logsData] = await Promise.all([
        getAutomation(automationId),
        getAutomationLogs(automationId, 20),
      ])
      setAutomation(automationData)
      setLogs(logsData.logs)
      setLogCount(logsData.count)
    } catch (error) {
      console.error('Erro ao carregar automacao:', error)
      toast({ title: 'Erro', description: 'Automacao nao encontrada.', variant: 'destructive' })
      router.push('/automations')
    } finally {
      setLoading(false)
    }
  }, [automationId, router, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleToggle = async () => {
    if (!automation) return
    try {
      const updated = await toggleAutomation(automation.id, !automation.is_active)
      setAutomation(updated)
      toast({ title: updated.is_active ? 'Automacao ativada' : 'Automacao desativada' })
    } catch (error) {
      toast({ title: 'Erro', description: 'Nao foi possivel alterar a automacao.', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!automation) return
    try {
      await deleteAutomation(automation.id)
      toast({ title: 'Automacao removida' })
      router.push('/automations')
    } catch (error) {
      toast({ title: 'Erro', description: 'Nao foi possivel remover a automacao.', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    )
  }

  if (!automation) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/automations">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">{automation.name}</h2>
              <Badge variant={automation.is_active ? 'default' : 'secondary'}>
                {automation.is_active ? 'Ativa' : 'Inativa'}
              </Badge>
            </div>
            {automation.description && (
              <p className="text-muted-foreground mt-1">{automation.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToggle}>
            {automation.is_active ? (
              <><Pause className="mr-2 h-4 w-4" /> Desativar</>
            ) : (
              <><Play className="mr-2 h-4 w-4" /> Ativar</>
            )}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir automacao?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acao nao pode ser desfeita. A automacao e todos os seus logs serao removidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gatilho</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="font-medium">
                {AUTOMATION_TRIGGER_LABELS[automation.trigger_type] || automation.trigger_type}
              </span>
            </div>
            {Object.keys(automation.trigger_config).length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground space-y-1">
                {Object.entries(automation.trigger_config).map(([key, value]) => (
                  <div key={key}>
                    <span className="font-medium">{key}:</span> {String(value)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Execucoes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{automation.execution_count}</div>
            {automation.last_executed_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Ultima: {formatDistanceToNow(new Date(automation.last_executed_at), { addSuffix: true, locale: ptBR })}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Acoes Configuradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{automation.actions.length}</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {automation.actions.map((action, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {AUTOMATION_ACTION_LABELS[action.type] || action.type}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Detail */}
      {automation.actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalhes das Acoes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {automation.actions.map((action, index) => (
                <div key={action.id} className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {AUTOMATION_ACTION_LABELS[action.type] || action.type}
                    </p>
                    {Object.keys(action.config).length > 0 && (
                      <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                        {Object.entries(action.config).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* n8n Info */}
      {automation.n8n_workflow_id && (
        <Card>
          <CardHeader>
            <CardTitle>Workflow n8n</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              <span className="text-muted-foreground">Workflow ID:</span>{' '}
              <code className="bg-muted px-2 py-0.5 rounded">{automation.n8n_workflow_id}</code>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Execution Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Logs de Execucao</CardTitle>
            <span className="text-sm text-muted-foreground">{logCount} registro(s)</span>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma execucao registrada ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Acoes</TableHead>
                  <TableHead>Duracao</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const StatusIcon = LOG_STATUS_ICONS[log.status] || Clock
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline" className={LOG_STATUS_COLORS[log.status]}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {LOG_STATUS_LABELS[log.status] || log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.lead_id ? (
                          <Link href={`/leads/${log.lead_id}`} className="hover:underline text-primary">
                            {log.lead_id.substring(0, 8)}...
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{log.actions_executed?.length || 0} acao(oes)</span>
                      </TableCell>
                      <TableCell>
                        {log.duration_ms != null ? (
                          <span className="text-sm">{log.duration_ms}ms</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        {log.error_message && (
                          <p className="text-xs text-destructive mt-1">
                            {log.error_message}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Metadata */}
      <div className="text-xs text-muted-foreground">
        Criada em {format(new Date(automation.created_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
        {automation.updated_at !== automation.created_at && (
          <> | Atualizada em {format(new Date(automation.updated_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}</>
        )}
      </div>
    </div>
  )
}
