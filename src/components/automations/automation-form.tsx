'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { useAuth } from '@/hooks/use-auth'
import { createAutomation, updateAutomation } from '@/lib/supabase/automations'
import {
  AUTOMATION_TRIGGER_LABELS,
  AUTOMATION_ACTION_LABELS,
} from '@/lib/constants'
import type { Automation, AutomationAction, AutomationTriggerType, AutomationActionType } from '@/lib/types'

interface AutomationFormProps {
  automation?: Automation
}

const TRIGGER_TYPES = Object.keys(AUTOMATION_TRIGGER_LABELS) as AutomationTriggerType[]
const ACTION_TYPES = Object.keys(AUTOMATION_ACTION_LABELS) as AutomationActionType[]

function generateId() {
  return Math.random().toString(36).substring(2, 10)
}

export function AutomationForm({ automation }: AutomationFormProps) {
  const router = useRouter()
  const { currentOrg } = useOrganizationContext()
  const { user } = useAuth()
  const { toast } = useToast()

  const [name, setName] = useState(automation?.name || '')
  const [description, setDescription] = useState(automation?.description || '')
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>(
    automation?.trigger_type || 'lead_created'
  )
  const [triggerConfig, setTriggerConfig] = useState<Record<string, any>>(
    automation?.trigger_config || {}
  )
  const [actions, setActions] = useState<AutomationAction[]>(
    automation?.actions || []
  )
  const [saving, setSaving] = useState(false)

  const handleAddAction = () => {
    setActions((prev) => [
      ...prev,
      { id: generateId(), type: 'add_tag', config: {} },
    ])
  }

  const handleRemoveAction = (id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id))
  }

  const handleActionTypeChange = (id: string, type: AutomationActionType) => {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, type, config: {} } : a))
    )
  }

  const handleActionConfigChange = (id: string, key: string, value: any) => {
    setActions((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, config: { ...a.config, [key]: value } } : a
      )
    )
  }

  const handleTriggerConfigChange = (key: string, value: any) => {
    setTriggerConfig((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: 'Erro', description: 'Informe o nome da automacao.', variant: 'destructive' })
      return
    }
    if (!currentOrg || !user) return

    setSaving(true)
    try {
      if (automation) {
        await updateAutomation(automation.id, {
          name: name.trim(),
          description: description.trim() || null,
          trigger_type: triggerType,
          trigger_config: triggerConfig,
          actions,
        })
        toast({ title: 'Automacao atualizada' })
        router.push(`/automations/${automation.id}`)
      } else {
        const created = await createAutomation(currentOrg.id, user.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          trigger_type: triggerType,
          trigger_config: triggerConfig,
          actions,
        })
        toast({ title: 'Automacao criada' })
        router.push(`/automations/${created.id}`)
      }
    } catch (error) {
      console.error('Erro ao salvar automacao:', error)
      toast({ title: 'Erro', description: 'Nao foi possivel salvar a automacao.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informacoes Basicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              placeholder="Ex: Boas-vindas ao novo lead"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descricao</Label>
            <Textarea
              id="description"
              placeholder="Descreva o que esta automacao faz..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Trigger */}
      <Card>
        <CardHeader>
          <CardTitle>Gatilho</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Quando executar</Label>
            <Select
              value={triggerType}
              onValueChange={(v) => {
                setTriggerType(v as AutomationTriggerType)
                setTriggerConfig({})
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {AUTOMATION_TRIGGER_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic trigger config */}
          {(triggerType === 'tag_added' || triggerType === 'tag_removed') && (
            <div className="space-y-2">
              <Label>Nome da tag (opcional)</Label>
              <Input
                placeholder="Deixe vazio para qualquer tag"
                value={triggerConfig.tag_name || ''}
                onChange={(e) => handleTriggerConfigChange('tag_name', e.target.value)}
              />
            </div>
          )}

          {triggerType === 'score_threshold' && (
            <div className="space-y-2">
              <Label>Score minimo</Label>
              <Input
                type="number"
                placeholder="Ex: 50"
                value={triggerConfig.threshold || ''}
                onChange={(e) => handleTriggerConfigChange('threshold', Number(e.target.value))}
              />
            </div>
          )}

          {triggerType === 'status_changed' && (
            <div className="space-y-2">
              <Label>Novo status</Label>
              <Select
                value={triggerConfig.new_status || ''}
                onValueChange={(v) => handleTriggerConfigChange('new_status', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="unsubscribed">Descadastrado</SelectItem>
                  <SelectItem value="bounced">Bounce</SelectItem>
                  <SelectItem value="complained">Spam</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {triggerType === 'custom_event' && (
            <div className="space-y-2">
              <Label>Nome do evento</Label>
              <Input
                placeholder="Ex: form_submitted"
                value={triggerConfig.event_name || ''}
                onChange={(e) => handleTriggerConfigChange('event_name', e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Acoes</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={handleAddAction}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Acao
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {actions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma acao configurada. Adicione pelo menos uma acao.
            </p>
          )}

          {actions.map((action, index) => (
            <div key={action.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Acao {index + 1}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleRemoveAction(action.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Tipo de acao</Label>
                <Select
                  value={action.type}
                  onValueChange={(v) => handleActionTypeChange(action.id, v as AutomationActionType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {AUTOMATION_ACTION_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dynamic action config */}
              {(action.type === 'add_tag' || action.type === 'remove_tag') && (
                <div className="space-y-2">
                  <Label>Nome da tag</Label>
                  <Input
                    placeholder="Ex: cliente-vip"
                    value={action.config.tag_name || ''}
                    onChange={(e) => handleActionConfigChange(action.id, 'tag_name', e.target.value)}
                  />
                </div>
              )}

              {action.type === 'update_field' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Campo</Label>
                    <Input
                      placeholder="Ex: company"
                      value={action.config.field_name || ''}
                      onChange={(e) => handleActionConfigChange(action.id, 'field_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input
                      placeholder="Novo valor"
                      value={action.config.field_value || ''}
                      onChange={(e) => handleActionConfigChange(action.id, 'field_value', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {action.type === 'update_score' && (
                <div className="space-y-2">
                  <Label>Alterar score em</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 10 ou -5"
                    value={action.config.score_change ?? ''}
                    onChange={(e) => handleActionConfigChange(action.id, 'score_change', Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use valores positivos para aumentar e negativos para diminuir.
                  </p>
                </div>
              )}

              {action.type === 'webhook' && (
                <div className="space-y-2">
                  <Label>URL do webhook</Label>
                  <Input
                    placeholder="https://..."
                    value={action.config.url || ''}
                    onChange={(e) => handleActionConfigChange(action.id, 'url', e.target.value)}
                  />
                </div>
              )}

              {action.type === 'notify' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Titulo</Label>
                    <Input
                      placeholder="Titulo da notificacao"
                      value={action.config.title || ''}
                      onChange={(e) => handleActionConfigChange(action.id, 'title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mensagem</Label>
                    <Textarea
                      placeholder="Corpo da notificacao"
                      value={action.config.message || ''}
                      onChange={(e) => handleActionConfigChange(action.id, 'message', e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {(action.type === 'add_to_segment' || action.type === 'remove_from_segment') && (
                <div className="space-y-2">
                  <Label>ID do segmento</Label>
                  <Input
                    placeholder="UUID do segmento"
                    value={action.config.segment_id || ''}
                    onChange={(e) => handleActionConfigChange(action.id, 'segment_id', e.target.value)}
                  />
                </div>
              )}

              {action.type === 'send_email' && (
                <p className="text-sm text-muted-foreground">
                  O envio de email sera integrado com o sistema de campanhas. Configure o template no n8n.
                </p>
              )}

              {action.type === 'wait' && (
                <p className="text-sm text-muted-foreground">
                  Acoes de espera sao processadas pelo n8n. Vincule um workflow para usar esta funcionalidade.
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <a href="/automations">Cancelar</a>
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? 'Salvando...' : automation ? 'Salvar Alteracoes' : 'Criar Automacao'}
        </Button>
      </div>
    </div>
  )
}
