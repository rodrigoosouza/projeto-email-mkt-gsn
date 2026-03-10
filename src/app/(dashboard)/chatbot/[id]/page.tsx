'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  Trash2,
  Plus,
  Copy,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
  getChatbotConfig,
  updateChatbotConfig,
  deleteChatbotConfig,
  getChatbotRules,
  createChatbotRule,
  updateChatbotRule,
  deleteChatbotRule,
  getChatbotConversations,
} from '@/lib/supabase/chatbot'
import type { ChatbotConfig, ChatbotRule, ChatbotConversation } from '@/lib/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function ChatbotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<ChatbotConfig | null>(null)
  const [rules, setRules] = useState<ChatbotRule[]>([])
  const [conversations, setConversations] = useState<ChatbotConversation[]>([])
  const [copied, setCopied] = useState(false)

  // Config form state
  const [name, setName] = useState('')
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [aiEnabled, setAiEnabled] = useState(false)
  const [aiModel, setAiModel] = useState('anthropic/claude-haiku-4-5-20251001')
  const [aiSystemPrompt, setAiSystemPrompt] = useState('')
  const [widgetColor, setWidgetColor] = useState('#6366f1')
  const [widgetPosition, setWidgetPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right')
  const [isActive, setIsActive] = useState(true)

  // Add rule dialog
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false)
  const [newRuleTrigger, setNewRuleTrigger] = useState('')
  const [newRuleResponse, setNewRuleResponse] = useState('')
  const [newRulePriority, setNewRulePriority] = useState('10')
  const [savingRule, setSavingRule] = useState(false)

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    setLoading(true)
    try {
      const [configData, rulesData, convsData] = await Promise.all([
        getChatbotConfig(id),
        getChatbotRules(id),
        getChatbotConversations(id),
      ])
      setConfig(configData)
      setRules(rulesData)
      setConversations(convsData)

      // Fill form
      setName(configData.name)
      setWelcomeMessage(configData.welcome_message || '')
      setAiEnabled(configData.ai_enabled)
      setAiModel(configData.ai_model || 'anthropic/claude-haiku-4-5-20251001')
      setAiSystemPrompt(configData.ai_system_prompt || '')
      setWidgetColor(configData.widget_color || '#6366f1')
      setWidgetPosition(configData.widget_position || 'bottom-right')
      setIsActive(configData.is_active)
    } catch (error) {
      console.error('Erro ao carregar chatbot:', error)
      toast({
        title: 'Erro',
        description: 'Nao foi possivel carregar o chatbot.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      const updated = await updateChatbotConfig(id, {
        name: name.trim(),
        welcome_message: welcomeMessage.trim() || null,
        ai_enabled: aiEnabled,
        ai_model: aiModel,
        ai_system_prompt: aiEnabled ? aiSystemPrompt.trim() || null : null,
        widget_color: widgetColor,
        widget_position: widgetPosition,
        is_active: isActive,
      })
      setConfig(updated)
      toast({
        title: 'Chatbot atualizado',
        description: 'As configuracoes foram salvas com sucesso.',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Nao foi possivel salvar as configuracoes.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    try {
      await deleteChatbotConfig(id)
      toast({
        title: 'Chatbot excluido',
        description: 'O chatbot foi excluido com sucesso.',
      })
      router.push('/chatbot')
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Nao foi possivel excluir o chatbot.',
        variant: 'destructive',
      })
    }
  }

  async function handleAddRule() {
    if (!newRuleTrigger.trim() || !newRuleResponse.trim() || !config) return

    setSavingRule(true)
    try {
      const rule = await createChatbotRule({
        org_id: config.org_id,
        chatbot_id: config.id,
        trigger_pattern: newRuleTrigger.trim(),
        response_text: newRuleResponse.trim(),
        priority: parseInt(newRulePriority) || 10,
        is_active: true,
      })
      setRules((prev) => [...prev, rule].sort((a, b) => a.priority - b.priority))
      setRuleDialogOpen(false)
      setNewRuleTrigger('')
      setNewRuleResponse('')
      setNewRulePriority('10')
      toast({ title: 'Regra criada', description: 'A regra foi adicionada com sucesso.' })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Nao foi possivel criar a regra.',
        variant: 'destructive',
      })
    } finally {
      setSavingRule(false)
    }
  }

  async function handleToggleRule(rule: ChatbotRule) {
    try {
      const updated = await updateChatbotRule(rule.id, {
        is_active: !rule.is_active,
      })
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? updated : r))
      )
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Nao foi possivel atualizar a regra.',
        variant: 'destructive',
      })
    }
  }

  async function handleDeleteRule(ruleId: string) {
    try {
      await deleteChatbotRule(ruleId)
      setRules((prev) => prev.filter((r) => r.id !== ruleId))
      toast({ title: 'Regra excluida' })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Nao foi possivel excluir a regra.',
        variant: 'destructive',
      })
    }
  }

  function getEmbedCode() {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `<script src="${baseUrl}/api/chatbot/${id}/embed.js" async></script>`
  }

  function copyEmbedCode() {
    navigator.clipboard.writeText(getEmbedCode())
    setCopied(true)
    toast({ title: 'Copiado!', description: 'Codigo copiado para a area de transferencia.' })
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h3 className="text-lg font-semibold">Chatbot nao encontrado</h3>
        <Button asChild className="mt-4">
          <Link href="/chatbot">Voltar</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/chatbot">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{config.name}</h2>
            <p className="text-muted-foreground">
              Gerencie as configuracoes do chatbot.
            </p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir chatbot</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir &quot;{config.name}&quot;? Todas as
                conversas e regras serao perdidas. Esta acao nao pode ser
                desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuracao</TabsTrigger>
          <TabsTrigger value="rules">Regras</TabsTrigger>
          <TabsTrigger value="conversations">Conversas</TabsTrigger>
          <TabsTrigger value="embed">Embed</TabsTrigger>
        </TabsList>

        {/* ===== CONFIG TAB ===== */}
        <TabsContent value="config">
          <form onSubmit={handleSaveConfig}>
            <Card>
              <CardHeader>
                <CardTitle>Configuracoes Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="welcome_message">
                    Mensagem de boas-vindas
                  </Label>
                  <Textarea
                    id="welcome_message"
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    id="is_active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <Label htmlFor="is_active">Chatbot ativo</Label>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    id="ai_enabled"
                    checked={aiEnabled}
                    onCheckedChange={setAiEnabled}
                  />
                  <Label htmlFor="ai_enabled">
                    Habilitar respostas com IA
                  </Label>
                </div>

                {aiEnabled && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="ai_model">Modelo de IA</Label>
                      <Select value={aiModel} onValueChange={setAiModel}>
                        <SelectTrigger id="ai_model">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="anthropic/claude-haiku-4-5-20251001">
                            Claude Haiku (rapido)
                          </SelectItem>
                          <SelectItem value="anthropic/claude-sonnet-4-20250514">
                            Claude Sonnet (avancado)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ai_system_prompt">
                        Prompt do sistema
                      </Label>
                      <Textarea
                        id="ai_system_prompt"
                        value={aiSystemPrompt}
                        onChange={(e) => setAiSystemPrompt(e.target.value)}
                        rows={4}
                        placeholder="Instrucoes para a IA..."
                      />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="widget_color">Cor do widget</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        id="widget_color"
                        value={widgetColor}
                        onChange={(e) => setWidgetColor(e.target.value)}
                        className="h-10 w-14 rounded border cursor-pointer"
                      />
                      <Input
                        value={widgetColor}
                        onChange={(e) => setWidgetColor(e.target.value)}
                        className="flex-1"
                        maxLength={7}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="widget_position">Posicao do widget</Label>
                    <Select
                      value={widgetPosition}
                      onValueChange={(v) =>
                        setWidgetPosition(
                          v as 'bottom-right' | 'bottom-left'
                        )
                      }
                    >
                      <SelectTrigger id="widget_position">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom-right">
                          Inferior direito
                        </SelectItem>
                        <SelectItem value="bottom-left">
                          Inferior esquerdo
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={saving}>
                    {saving && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Salvar Configuracoes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        {/* ===== RULES TAB ===== */}
        <TabsContent value="rules">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Regras de Resposta</CardTitle>
              <Button size="sm" onClick={() => setRuleDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Regra
              </Button>
            </CardHeader>
            <CardContent>
              {rules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma regra configurada. Adicione regras para respostas
                  automaticas baseadas em palavras-chave.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Padrao (trigger)</TableHead>
                      <TableHead>Resposta</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Ativo</TableHead>
                      <TableHead className="text-right">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-mono text-sm">
                          {rule.trigger_pattern}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {rule.response_text}
                        </TableCell>
                        <TableCell>{rule.priority}</TableCell>
                        <TableCell>
                          <Switch
                            checked={rule.is_active}
                            onCheckedChange={() => handleToggleRule(rule)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Excluir regra
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Deseja excluir esta regra? Esta acao nao pode
                                  ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteRule(rule.id)}
                                >
                                  Excluir
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
          </Card>

          {/* Add Rule Dialog */}
          <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Regra</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="rule_trigger">
                    Padrao de acionamento (trigger)
                  </Label>
                  <Input
                    id="rule_trigger"
                    placeholder="Ex: preco, orcamento, quanto custa"
                    value={newRuleTrigger}
                    onChange={(e) => setNewRuleTrigger(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Texto que sera buscado na mensagem do visitante (busca parcial, sem
                    diferenciar maiusculas/minusculas).
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rule_response">Resposta</Label>
                  <Textarea
                    id="rule_response"
                    placeholder="Resposta que sera enviada ao visitante..."
                    value={newRuleResponse}
                    onChange={(e) => setNewRuleResponse(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rule_priority">Prioridade</Label>
                  <Input
                    id="rule_priority"
                    type="number"
                    placeholder="10"
                    value={newRulePriority}
                    onChange={(e) => setNewRulePriority(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Menor numero = maior prioridade. Regras sao verificadas em
                    ordem de prioridade.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setRuleDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleAddRule} disabled={savingRule}>
                  {savingRule && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Adicionar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ===== CONVERSATIONS TAB ===== */}
        <TabsContent value="conversations">
          <Card>
            <CardHeader>
              <CardTitle>Conversas</CardTitle>
            </CardHeader>
            <CardContent>
              {conversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma conversa registrada ainda.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Visitante</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Iniciada em</TableHead>
                      <TableHead>Ultima atualizacao</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conversations.map((conv) => (
                      <TableRow key={conv.id}>
                        <TableCell className="font-mono text-sm">
                          {conv.visitor_id
                            ? conv.visitor_id.substring(0, 16) + '...'
                            : 'Anonimo'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              conv.status === 'open'
                                ? 'default'
                                : conv.status === 'closed'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {conv.status === 'open'
                              ? 'Aberta'
                              : conv.status === 'closed'
                                ? 'Fechada'
                                : 'Arquivada'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(
                            new Date(conv.created_at),
                            "dd/MM/yyyy HH:mm",
                            { locale: ptBR }
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(
                            new Date(conv.updated_at),
                            "dd/MM/yyyy HH:mm",
                            { locale: ptBR }
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== EMBED TAB ===== */}
        <TabsContent value="embed">
          <Card>
            <CardHeader>
              <CardTitle>Codigo de Embed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Cole este script antes do {'</body>'} do seu site para exibir o
                chatbot.
              </p>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap break-all">
                  {getEmbedCode()}
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={copyEmbedCode}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="rounded-lg border p-4 bg-muted/30">
                <h4 className="font-medium text-sm mb-2">Previsualizacao</h4>
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg"
                    style={{ backgroundColor: widgetColor }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="w-6 h-6 fill-current"
                    >
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
                    </svg>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Cor: {widgetColor} | Posicao:{' '}
                    {widgetPosition === 'bottom-right'
                      ? 'Inferior direito'
                      : 'Inferior esquerdo'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
