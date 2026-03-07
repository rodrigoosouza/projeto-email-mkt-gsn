'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import {
  getScoringRules,
  createScoringRule,
  updateScoringRule,
  deleteScoringRule,
} from '@/lib/supabase/lead-scoring'
import type { LeadScoringRule, ScoringConditionType } from '@/lib/types'

const CONDITION_TYPE_LABELS: Record<ScoringConditionType, string> = {
  email_opened: 'Email aberto',
  email_clicked: 'Link clicado no email',
  email_bounced: 'Email bounce',
  email_complained: 'Reclamacao de spam',
  tag_added: 'Tag adicionada',
  tag_removed: 'Tag removida',
  field_equals: 'Campo igual a',
  field_contains: 'Campo contem',
  field_not_empty: 'Campo preenchido',
  page_visited: 'Pagina visitada',
  form_submitted: 'Formulario enviado',
  days_since_last_activity: 'Dias sem atividade',
}

const CONDITIONS_WITH_VALUE: ScoringConditionType[] = [
  'tag_added',
  'tag_removed',
  'field_equals',
  'field_contains',
  'field_not_empty',
  'page_visited',
]

const CONDITION_VALUE_PLACEHOLDER: Partial<Record<ScoringConditionType, string>> = {
  tag_added: 'Nome da tag',
  tag_removed: 'Nome da tag',
  field_equals: 'nome_campo=valor',
  field_contains: 'nome_campo=valor',
  field_not_empty: 'Nome do campo',
  page_visited: 'URL da pagina',
}

export function ScoringRulesManager() {
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()
  const [rules, setRules] = useState<LeadScoringRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    condition_type: 'email_opened' as ScoringConditionType,
    condition_value: '',
    score_change: 5,
  })

  useEffect(() => {
    if (currentOrg) loadRules()
  }, [currentOrg])

  const loadRules = async () => {
    if (!currentOrg) return
    try {
      const data = await getScoringRules(currentOrg.id)
      setRules(data)
    } catch (error) {
      console.error('Erro ao carregar regras de scoring:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!currentOrg || !newRule.name.trim() || newRule.score_change === 0) return

    setCreating(true)
    try {
      await createScoringRule(currentOrg.id, {
        name: newRule.name.trim(),
        description: newRule.description.trim() || undefined,
        condition_type: newRule.condition_type,
        condition_value: newRule.condition_value.trim() || undefined,
        score_change: newRule.score_change,
      })

      await loadRules()
      setShowDialog(false)
      setNewRule({
        name: '',
        description: '',
        condition_type: 'email_opened',
        condition_value: '',
        score_change: 5,
      })
      toast({ title: 'Regra criada', description: 'A regra de scoring foi criada com sucesso.' })
    } catch (error: any) {
      console.error('Erro ao criar regra:', error)
      toast({ title: 'Erro', description: 'Nao foi possivel criar a regra.', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = async (rule: LeadScoringRule) => {
    try {
      await updateScoringRule(rule.id, { is_active: !rule.is_active })
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
      )
      toast({
        title: rule.is_active ? 'Regra desativada' : 'Regra ativada',
        description: `A regra "${rule.name}" foi ${rule.is_active ? 'desativada' : 'ativada'}.`,
      })
    } catch (error) {
      console.error('Erro ao atualizar regra:', error)
      toast({ title: 'Erro', description: 'Nao foi possivel atualizar a regra.', variant: 'destructive' })
    }
  }

  const handleDelete = async (ruleId: string) => {
    try {
      await deleteScoringRule(ruleId)
      setRules((prev) => prev.filter((r) => r.id !== ruleId))
      toast({ title: 'Regra removida', description: 'A regra de scoring foi removida.' })
    } catch (error) {
      console.error('Erro ao remover regra:', error)
      toast({ title: 'Erro', description: 'Nao foi possivel remover a regra.', variant: 'destructive' })
    }
  }

  const needsConditionValue = CONDITIONS_WITH_VALUE.includes(newRule.condition_type)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Lead Scoring</CardTitle>
            <CardDescription>
              Configure regras automaticas para pontuar seus leads com base em acoes e eventos.
              O score varia de 0 a 100.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Regra
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        ) : rules.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            Nenhuma regra de scoring definida. Clique em &quot;Nova Regra&quot; para comecar.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Condicao</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Pontos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id} className={!rule.is_active ? 'opacity-50' : ''}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{rule.name}</span>
                      {rule.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {CONDITION_TYPE_LABELS[rule.condition_type as ScoringConditionType] || rule.condition_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {rule.condition_value || '-'}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 font-medium ${
                      rule.score_change > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {rule.score_change > 0 ? (
                        <TrendingUp className="h-3.5 w-3.5" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" />
                      )}
                      {rule.score_change > 0 ? '+' : ''}{rule.score_change}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant={rule.is_active ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleToggleActive(rule)}
                    >
                      {rule.is_active ? 'Ativa' : 'Inativa'}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover regra?</AlertDialogTitle>
                          <AlertDialogDescription>
                            A regra &quot;{rule.name}&quot; sera removida permanentemente.
                            Os scores ja calculados nos leads nao serao alterados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(rule.id)}>
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create Rule Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Regra de Scoring</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da regra</Label>
              <Input
                placeholder="Ex: Bonus por abrir email"
                value={newRule.name}
                onChange={(e) => setNewRule((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Descricao (opcional)</Label>
              <Input
                placeholder="Descricao da regra"
                value={newRule.description}
                onChange={(e) => setNewRule((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Condicao</Label>
              <Select
                value={newRule.condition_type}
                onValueChange={(value) =>
                  setNewRule((prev) => ({ ...prev, condition_type: value as ScoringConditionType, condition_value: '' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONDITION_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {needsConditionValue && (
              <div className="space-y-2">
                <Label>Valor da condicao</Label>
                <Input
                  placeholder={CONDITION_VALUE_PLACEHOLDER[newRule.condition_type] || 'Valor'}
                  value={newRule.condition_value}
                  onChange={(e) => setNewRule((prev) => ({ ...prev, condition_value: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  {newRule.condition_type === 'field_equals' || newRule.condition_type === 'field_contains'
                    ? 'Formato: nome_do_campo=valor_esperado'
                    : 'Deixe vazio para aplicar a qualquer valor.'}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Pontos</Label>
              <Input
                type="number"
                value={newRule.score_change}
                onChange={(e) =>
                  setNewRule((prev) => ({ ...prev, score_change: parseInt(e.target.value) || 0 }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Valores positivos adicionam pontos, negativos subtraem. Ex: +10 para email aberto, -20 para bounce.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newRule.name.trim() || newRule.score_change === 0 || creating}
            >
              {creating ? 'Criando...' : 'Criar Regra'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
