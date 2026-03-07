'use client'

import { useEffect, useState } from 'react'
import { Plus, Radio, Send } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useOrganizationContext } from '@/contexts/organization-context'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'
import {
  getBroadcasts,
  createBroadcast,
  getWhatsAppTemplates,
} from '@/lib/supabase/whatsapp'
import type { WhatsAppBroadcast, WhatsAppTemplate } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  sending: 'Enviando',
  sent: 'Enviado',
  failed: 'Falhou',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sending: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

export default function WhatsAppBroadcastsPage() {
  const { currentOrg } = useOrganizationContext()
  const { user } = useAuth()
  const { toast } = useToast()
  const [broadcasts, setBroadcasts] = useState<(WhatsAppBroadcast & { template?: WhatsAppTemplate; segment?: any })[]>([])
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [segments, setSegments] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '',
    template_id: '',
    segment_id: '',
  })

  useEffect(() => {
    if (currentOrg) {
      loadBroadcasts()
      loadTemplates()
      loadSegments()
    }
  }, [currentOrg])

  const loadBroadcasts = async () => {
    if (!currentOrg) return
    try {
      const data = await getBroadcasts(currentOrg.id)
      setBroadcasts(data)
    } catch (error) {
      console.error('Erro ao carregar broadcasts:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    if (!currentOrg) return
    try {
      const data = await getWhatsAppTemplates(currentOrg.id)
      setTemplates(data.filter((t) => t.status === 'approved' || t.status === 'draft'))
    } catch (error) {
      console.error('Erro ao carregar templates:', error)
    }
  }

  const loadSegments = async () => {
    if (!currentOrg) return
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('segments')
        .select('id, name')
        .eq('org_id', currentOrg.id)
        .order('name')
      setSegments(data || [])
    } catch (error) {
      console.error('Erro ao carregar segmentos:', error)
    }
  }

  const handleCreate = async () => {
    if (!currentOrg || !user?.id || !form.name.trim() || !form.template_id) return
    setCreating(true)
    try {
      const broadcast = await createBroadcast(currentOrg.id, user.id, {
        name: form.name.trim(),
        template_id: form.template_id,
        segment_id: form.segment_id || undefined,
      })

      setBroadcasts((prev) => [{ ...broadcast }, ...prev])
      setShowCreateDialog(false)
      setForm({ name: '', template_id: '', segment_id: '' })
      toast({ title: 'Broadcast criado', description: 'O envio em massa foi criado como rascunho.' })
    } catch (error) {
      console.error('Erro ao criar broadcast:', error)
      toast({ title: 'Erro', description: 'Nao foi possivel criar o broadcast.', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Broadcasts WhatsApp</h2>
          <p className="text-muted-foreground">
            Envie mensagens em massa via WhatsApp para segmentos de leads.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Broadcast
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Envios em Massa</CardTitle>
          <CardDescription>
            Historico de envios em massa via WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Carregando...
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Radio className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                Nenhum broadcast criado
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Crie um broadcast para enviar mensagens em massa para seus contatos.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar Broadcast
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Enviados</TableHead>
                  <TableHead className="text-right">Entregues</TableHead>
                  <TableHead className="text-right">Lidos</TableHead>
                  <TableHead className="text-right">Falhas</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {broadcasts.map((broadcast) => (
                  <TableRow key={broadcast.id}>
                    <TableCell className="font-medium">{broadcast.name}</TableCell>
                    <TableCell>{broadcast.template?.name || '-'}</TableCell>
                    <TableCell>{broadcast.segment?.name || 'Todos'}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[broadcast.status] || ''} variant="secondary">
                        {STATUS_LABELS[broadcast.status] || broadcast.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{broadcast.total_sent}</TableCell>
                    <TableCell className="text-right">{broadcast.total_delivered}</TableCell>
                    <TableCell className="text-right">{broadcast.total_read}</TableCell>
                    <TableCell className="text-right">{broadcast.total_failed}</TableCell>
                    <TableCell>
                      {format(new Date(broadcast.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Broadcast Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Broadcast WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Broadcast</Label>
              <Input
                placeholder="ex: Promocao de Natal"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Template</Label>
              <Select
                value={form.template_id}
                onValueChange={(v) => setForm((f) => ({ ...f, template_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Nenhum template disponivel
                    </div>
                  ) : (
                    templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                        {t.status === 'draft' && ' (rascunho)'}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Apenas templates aprovados pela Meta podem ser enviados.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Segmento (opcional)</Label>
              <Select
                value={form.segment_id}
                onValueChange={(v) => setForm((f) => ({ ...f, segment_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os leads com telefone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os leads com telefone</SelectItem>
                  {segments.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!form.name.trim() || !form.template_id || creating}
            >
              <Send className="mr-2 h-4 w-4" />
              {creating ? 'Criando...' : 'Criar Broadcast'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
