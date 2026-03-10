'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  MessageSquare,
  GitBranch,
  Clock,
  Zap,
  Globe,
  Tag,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Loader2,
  Play,
  Pause,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { useToast } from '@/components/ui/use-toast'
import {
  getAutomationFlow,
  updateAutomationFlow,
  type AutomationFlow,
  type FlowNode,
  type FlowEdge,
} from '@/lib/supabase/automation-flows'

const NODE_TYPES = [
  { type: 'message', label: 'Mensagem', icon: MessageSquare, color: 'bg-blue-500' },
  { type: 'condition', label: 'Condicao', icon: GitBranch, color: 'bg-yellow-500' },
  { type: 'delay', label: 'Smart Delay', icon: Clock, color: 'bg-purple-500' },
  { type: 'action', label: 'Acao', icon: Zap, color: 'bg-green-500' },
  { type: 'webhook', label: 'Webhook', icon: Globe, color: 'bg-orange-500' },
  { type: 'tag', label: 'Tag', icon: Tag, color: 'bg-pink-500' },
] as const

type NodeType = typeof NODE_TYPES[number]['type']

function getNodeConfig(type: string) {
  return NODE_TYPES.find((n) => n.type === type) || NODE_TYPES[0]
}

export default function FlowEditorPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const flowId = params.id as string

  const [flow, setFlow] = useState<AutomationFlow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [nodes, setNodes] = useState<FlowNode[]>([])
  const [edges, setEdges] = useState<FlowEdge[]>([])
  const [flowName, setFlowName] = useState('')
  const [editingNode, setEditingNode] = useState<FlowNode | null>(null)
  const [showAddNode, setShowAddNode] = useState(false)

  useEffect(() => {
    async function loadFlow() {
      try {
        const data = await getAutomationFlow(flowId)
        setFlow(data)
        setFlowName(data.name)
        setNodes(data.flow_data?.nodes || [])
        setEdges(data.flow_data?.edges || [])
      } catch (error) {
        console.error('Erro ao carregar fluxo:', error)
        toast({ title: 'Erro ao carregar fluxo', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    loadFlow()
  }, [flowId])

  const handleSave = async () => {
    if (!flow) return
    setSaving(true)
    try {
      // Auto-generate edges from node order (linear flow)
      const autoEdges: FlowEdge[] = []
      for (let i = 0; i < nodes.length - 1; i++) {
        autoEdges.push({
          id: `edge-${nodes[i].id}-${nodes[i + 1].id}`,
          source: nodes[i].id,
          target: nodes[i + 1].id,
        })
      }

      await updateAutomationFlow(flow.id, {
        name: flowName,
        flow_data: { nodes, edges: autoEdges },
      })
      setEdges(autoEdges)
      toast({ title: 'Fluxo salvo com sucesso' })
    } catch (error) {
      toast({ title: 'Erro ao salvar fluxo', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!flow) return
    const newStatus = flow.status === 'active' ? 'paused' : 'active'
    try {
      const updated = await updateAutomationFlow(flow.id, { status: newStatus })
      setFlow(updated)
      toast({ title: `Fluxo ${newStatus === 'active' ? 'ativado' : 'pausado'}` })
    } catch (error) {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' })
    }
  }

  const addNode = (type: NodeType) => {
    const id = `node-${Date.now()}`
    const config = getNodeConfig(type)
    const newNode: FlowNode = {
      id,
      type,
      position: { x: 250, y: (nodes.length + 1) * 120 },
      data: {
        label: config.label,
        ...(type === 'message' && { text: '', buttons: [] }),
        ...(type === 'condition' && { field: 'tag', operator: 'has', value: '' }),
        ...(type === 'delay' && { delay_type: 'wait_until', date: '', time: '' }),
        ...(type === 'action' && { action_type: 'add_tag', tag: '' }),
        ...(type === 'webhook' && { url: '', method: 'POST' }),
        ...(type === 'tag' && { operation: 'add', tag: '' }),
      },
    }
    setNodes([...nodes, newNode])
    setShowAddNode(false)
    setEditingNode(newNode)
  }

  const removeNode = (id: string) => {
    setNodes(nodes.filter((n) => n.id !== id))
    if (editingNode?.id === id) setEditingNode(null)
  }

  const moveNode = (index: number, direction: 'up' | 'down') => {
    const newNodes = [...nodes]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newNodes.length) return
    // Don't move before trigger
    if (newNodes[targetIndex].type === 'trigger' && direction === 'up') return
    ;[newNodes[index], newNodes[targetIndex]] = [newNodes[targetIndex], newNodes[index]]
    setNodes(newNodes)
  }

  const updateNodeData = (nodeId: string, data: Record<string, unknown>) => {
    setNodes(nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)))
    if (editingNode?.id === nodeId) {
      setEditingNode({ ...editingNode, data: { ...editingNode.data, ...data } })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!flow) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Fluxo nao encontrado.</p>
        <Button variant="link" onClick={() => router.push('/whatsapp/flows')}>
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/whatsapp/flows')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            className="text-lg font-bold border-none shadow-none px-0 h-auto focus-visible:ring-0 max-w-md"
          />
          <Badge variant={flow.status === 'active' ? 'default' : 'secondary'}>
            {flow.status === 'active' ? 'Ativo' : flow.status === 'paused' ? 'Pausado' : 'Rascunho'}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleToggleStatus}>
            {flow.status === 'active' ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pausar
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Ativar
              </>
            )}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Flow Canvas */}
        <div className="lg:col-span-2 space-y-3">
          {nodes.map((node, index) => {
            const config = getNodeConfig(node.type)
            const Icon = config.icon
            const isTrigger = node.type === 'trigger'

            return (
              <div key={node.id}>
                {/* Node Card */}
                <Card
                  className={`cursor-pointer transition-all ${
                    editingNode?.id === node.id
                      ? 'ring-2 ring-primary'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => !isTrigger && setEditingNode(node)}
                >
                  <CardContent className="flex items-center gap-3 py-3">
                    {!isTrigger && (
                      <div className="flex flex-col">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={(e) => { e.stopPropagation(); moveNode(index, 'up') }}
                          disabled={index <= 1}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <GripVertical className="h-4 w-4 text-muted-foreground mx-auto" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={(e) => { e.stopPropagation(); moveNode(index, 'down') }}
                          disabled={index >= nodes.length - 1}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <div className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center shrink-0`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {(node.data.label as string) || config.label}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {node.type === 'message' && (node.data.text as string || 'Sem mensagem')}
                        {node.type === 'condition' && `Se ${node.data.field} ${node.data.operator} ${node.data.value}`}
                        {node.type === 'delay' && (node.data.delay_type === 'wait_until'
                          ? `Esperar ate ${node.data.date || '...'} ${node.data.time || ''}`
                          : `Esperar ${node.data.duration || '...'}`)}
                        {node.type === 'tag' && `${node.data.operation === 'add' ? 'Adicionar' : 'Remover'} tag: ${node.data.tag || '...'}`}
                        {node.type === 'webhook' && (node.data.url as string || 'URL nao configurada')}
                        {node.type === 'action' && `${node.data.action_type}: ${node.data.tag || ''}`}
                        {node.type === 'trigger' && `Trigger: ${flow.trigger_type}`}
                      </p>
                    </div>
                    {!isTrigger && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={(e) => { e.stopPropagation(); removeNode(node.id) }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Connector */}
                {index < nodes.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className="w-0.5 h-6 bg-border" />
                  </div>
                )}
              </div>
            )
          })}

          {/* Add Node Button */}
          <div className="flex justify-center pt-2">
            <div className="w-0.5 h-6 bg-border" />
          </div>
          <Dialog open={showAddNode} onOpenChange={setShowAddNode}>
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => setShowAddNode(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Bloco
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Bloco</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                {NODE_TYPES.map((nt) => (
                  <Card
                    key={nt.type}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => addNode(nt.type)}
                  >
                    <CardContent className="flex items-center gap-3 py-4">
                      <div className={`w-10 h-10 rounded-lg ${nt.color} flex items-center justify-center`}>
                        <nt.icon className="h-5 w-5 text-white" />
                      </div>
                      <span className="font-medium text-sm">{nt.label}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Node Properties Panel */}
        <div className="space-y-4">
          {editingNode ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Propriedades: {getNodeConfig(editingNode.type).label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do bloco</Label>
                  <Input
                    value={(editingNode.data.label as string) || ''}
                    onChange={(e) => updateNodeData(editingNode.id, { label: e.target.value })}
                    placeholder="Nome do bloco"
                  />
                </div>

                {editingNode.type === 'message' && (
                  <>
                    <div className="space-y-2">
                      <Label>Mensagem</Label>
                      <Textarea
                        value={(editingNode.data.text as string) || ''}
                        onChange={(e) => updateNodeData(editingNode.id, { text: e.target.value })}
                        placeholder="Ola, {{first_name}}! ..."
                        rows={5}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use {'{{first_name}}'} para personalizar com o nome do lead.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Botoes (um por linha)</Label>
                      <Textarea
                        value={Array.isArray(editingNode.data.buttons)
                          ? (editingNode.data.buttons as string[]).join('\n')
                          : ''}
                        onChange={(e) => updateNodeData(editingNode.id, {
                          buttons: e.target.value.split('\n').filter(Boolean),
                        })}
                        placeholder="Participar&#10;Nao quero"
                        rows={3}
                      />
                    </div>
                  </>
                )}

                {editingNode.type === 'condition' && (
                  <>
                    <div className="space-y-2">
                      <Label>Campo</Label>
                      <Select
                        value={(editingNode.data.field as string) || 'tag'}
                        onValueChange={(v) => updateNodeData(editingNode.id, { field: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tag">Tag</SelectItem>
                          <SelectItem value="status">Status do Lead</SelectItem>
                          <SelectItem value="score">Lead Score</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Operador</Label>
                      <Select
                        value={(editingNode.data.operator as string) || 'has'}
                        onValueChange={(v) => updateNodeData(editingNode.id, { operator: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="has">Tem</SelectItem>
                          <SelectItem value="not_has">Nao tem</SelectItem>
                          <SelectItem value="equals">Igual a</SelectItem>
                          <SelectItem value="greater_than">Maior que</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Valor</Label>
                      <Input
                        value={(editingNode.data.value as string) || ''}
                        onChange={(e) => updateNodeData(editingNode.id, { value: e.target.value })}
                        placeholder="Ex: vai_participar_webinar"
                      />
                    </div>
                  </>
                )}

                {editingNode.type === 'delay' && (
                  <>
                    <div className="space-y-2">
                      <Label>Tipo de Delay</Label>
                      <Select
                        value={(editingNode.data.delay_type as string) || 'wait_until'}
                        onValueChange={(v) => updateNodeData(editingNode.id, { delay_type: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="wait_until">Esperar ate (data/hora)</SelectItem>
                          <SelectItem value="wait_for">Esperar por (intervalo)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {(editingNode.data.delay_type as string) === 'wait_until' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label>Data</Label>
                          <Input
                            type="date"
                            value={(editingNode.data.date as string) || ''}
                            onChange={(e) => updateNodeData(editingNode.id, { date: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Hora</Label>
                          <Input
                            type="time"
                            value={(editingNode.data.time as string) || ''}
                            onChange={(e) => updateNodeData(editingNode.id, { time: e.target.value })}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label>Quantidade</Label>
                          <Input
                            type="number"
                            value={(editingNode.data.duration_value as string) || ''}
                            onChange={(e) => updateNodeData(editingNode.id, { duration_value: e.target.value })}
                            placeholder="3"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Unidade</Label>
                          <Select
                            value={(editingNode.data.duration_unit as string) || 'hours'}
                            onValueChange={(v) => updateNodeData(editingNode.id, { duration_unit: v })}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="minutes">Minutos</SelectItem>
                              <SelectItem value="hours">Horas</SelectItem>
                              <SelectItem value="days">Dias</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {editingNode.type === 'tag' && (
                  <>
                    <div className="space-y-2">
                      <Label>Operacao</Label>
                      <Select
                        value={(editingNode.data.operation as string) || 'add'}
                        onValueChange={(v) => updateNodeData(editingNode.id, { operation: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="add">Adicionar Tag</SelectItem>
                          <SelectItem value="remove">Remover Tag</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Nome da Tag</Label>
                      <Input
                        value={(editingNode.data.tag as string) || ''}
                        onChange={(e) => updateNodeData(editingNode.id, { tag: e.target.value })}
                        placeholder="Ex: interesse_webinar_orbit"
                      />
                      <p className="text-xs text-muted-foreground">
                        Padrao: [acao]_[tipo_evento]_[marca]
                      </p>
                    </div>
                  </>
                )}

                {editingNode.type === 'webhook' && (
                  <>
                    <div className="space-y-2">
                      <Label>URL</Label>
                      <Input
                        value={(editingNode.data.url as string) || ''}
                        onChange={(e) => updateNodeData(editingNode.id, { url: e.target.value })}
                        placeholder="https://n8n.seudominio.com/webhook/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Metodo</Label>
                      <Select
                        value={(editingNode.data.method as string) || 'POST'}
                        onValueChange={(v) => updateNodeData(editingNode.id, { method: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="GET">GET</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {editingNode.type === 'action' && (
                  <>
                    <div className="space-y-2">
                      <Label>Tipo de Acao</Label>
                      <Select
                        value={(editingNode.data.action_type as string) || 'add_tag'}
                        onValueChange={(v) => updateNodeData(editingNode.id, { action_type: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="add_tag">Adicionar Tag</SelectItem>
                          <SelectItem value="remove_tag">Remover Tag</SelectItem>
                          <SelectItem value="update_lead">Atualizar Lead</SelectItem>
                          <SelectItem value="notify">Notificar Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Valor</Label>
                      <Input
                        value={(editingNode.data.tag as string) || ''}
                        onChange={(e) => updateNodeData(editingNode.id, { tag: e.target.value })}
                        placeholder="Ex: quer_falar_com_especialista"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Clique em um bloco para editar suas propriedades.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Flow Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informacoes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Canal</span>
                <span className="font-medium capitalize">{flow.channel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trigger</span>
                <span className="font-medium">{flow.trigger_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Blocos</span>
                <span className="font-medium">{nodes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Leads</span>
                <span className="font-medium">{flow.stats?.total_entered || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
