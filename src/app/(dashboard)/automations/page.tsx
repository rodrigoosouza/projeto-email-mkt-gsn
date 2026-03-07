'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Zap, Play, Pause, Trash2, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { getAutomations, toggleAutomation, deleteAutomation } from '@/lib/supabase/automations'
import { AUTOMATION_TRIGGER_LABELS } from '@/lib/constants'
import type { Automation } from '@/lib/types'

export default function AutomationsPage() {
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)

  const loadAutomations = useCallback(async () => {
    if (!currentOrg) return
    try {
      const data = await getAutomations(currentOrg.id)
      setAutomations(data)
    } catch (error) {
      console.error('Erro ao carregar automacoes:', error)
    } finally {
      setLoading(false)
    }
  }, [currentOrg])

  useEffect(() => {
    if (currentOrg) loadAutomations()
  }, [currentOrg, loadAutomations])

  const handleToggle = async (automation: Automation) => {
    try {
      const updated = await toggleAutomation(automation.id, !automation.is_active)
      setAutomations((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a))
      )
      toast({
        title: updated.is_active ? 'Automacao ativada' : 'Automacao desativada',
      })
    } catch (error) {
      toast({ title: 'Erro', description: 'Nao foi possivel alterar a automacao.', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteAutomation(id)
      setAutomations((prev) => prev.filter((a) => a.id !== id))
      toast({ title: 'Automacao removida' })
    } catch (error) {
      toast({ title: 'Erro', description: 'Nao foi possivel remover a automacao.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Automacoes</h2>
          <p className="text-muted-foreground">
            Configure acoes automaticas baseadas em eventos dos leads.
          </p>
        </div>
        <Button asChild>
          <Link href="/automations/new">
            <Plus className="mr-2 h-4 w-4" />
            Nova Automacao
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : automations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma automacao</h3>
            <p className="text-muted-foreground mb-4">
              Crie sua primeira automacao para executar acoes automaticamente.
            </p>
            <Button asChild>
              <Link href="/automations/new">
                <Plus className="mr-2 h-4 w-4" />
                Criar Automacao
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Gatilho</TableHead>
              <TableHead>Acoes</TableHead>
              <TableHead>Execucoes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {automations.map((automation) => (
              <TableRow key={automation.id}>
                <TableCell>
                  <Link href={`/automations/${automation.id}`} className="font-medium hover:underline">
                    {automation.name}
                  </Link>
                  {automation.description && (
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {automation.description}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {AUTOMATION_TRIGGER_LABELS[automation.trigger_type] || automation.trigger_type}
                  </Badge>
                </TableCell>
                <TableCell>{automation.actions.length} acao(oes)</TableCell>
                <TableCell>
                  <span className="text-sm">{automation.execution_count}</span>
                  {automation.last_executed_at && (
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(automation.last_executed_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={automation.is_active ? 'default' : 'secondary'}>
                    {automation.is_active ? 'Ativa' : 'Inativa'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleToggle(automation)}>
                        {automation.is_active ? (
                          <><Pause className="mr-2 h-4 w-4" /> Desativar</>
                        ) : (
                          <><Play className="mr-2 h-4 w-4" /> Ativar</>
                        )}
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
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
                            <AlertDialogAction onClick={() => handleDelete(automation.id)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
