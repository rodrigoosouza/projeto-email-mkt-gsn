'use client'

import { useState, useEffect } from 'react'
import { Smartphone, Send, Radio, Plus, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { useAuth } from '@/hooks/use-auth'
import { getSmsMessages, getSmsBroadcasts, createSmsBroadcast } from '@/lib/supabase/sms'
import type { SmsMessage, SmsBroadcast, Segment } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const SMS_STATUS_LABELS: Record<string, string> = {
  queued: 'Na fila',
  sent: 'Enviado',
  delivered: 'Entregue',
  failed: 'Falhou',
  received: 'Recebido',
}

const SMS_STATUS_COLORS: Record<string, string> = {
  queued: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  received: 'bg-purple-100 text-purple-800',
}

const BROADCAST_STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  sending: 'Enviando',
  sent: 'Enviado',
  failed: 'Falhou',
}

const BROADCAST_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sending: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

export default function SmsPage() {
  const { currentOrg } = useOrganizationContext()
  const { user } = useAuth()
  const { toast } = useToast()
  const orgId = currentOrg?.id

  const [messages, setMessages] = useState<SmsMessage[]>([])
  const [broadcasts, setBroadcasts] = useState<SmsBroadcast[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)

  // Send SMS form
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [sendPhone, setSendPhone] = useState('')
  const [sendBody, setSendBody] = useState('')
  const [sending, setSending] = useState(false)

  // Broadcast form
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false)
  const [broadcastName, setBroadcastName] = useState('')
  const [broadcastBody, setBroadcastBody] = useState('')
  const [broadcastSegment, setBroadcastSegment] = useState('')
  const [creatingBroadcast, setCreatingBroadcast] = useState(false)

  useEffect(() => {
    if (!orgId) return
    loadData()
  }, [orgId])

  async function loadData() {
    if (!orgId) return
    setLoading(true)
    try {
      const [messagesResult, broadcastsResult] = await Promise.all([
        getSmsMessages(orgId),
        getSmsBroadcasts(orgId),
      ])
      setMessages(messagesResult.messages)
      setBroadcasts(broadcastsResult.broadcasts)

      // Load segments for broadcast
      const supabase = createClient()
      const { data: segs } = await supabase
        .from('segments')
        .select('*')
        .eq('org_id', orgId)
        .order('name')
      setSegments((segs || []) as Segment[])
    } catch (error) {
      console.error('Erro ao carregar dados SMS:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSendSms() {
    if (!orgId || !sendPhone.trim() || !sendBody.trim()) return
    setSending(true)
    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          phone_number: sendPhone,
          body: sendBody,
          user_id: user?.id,
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      toast({ title: 'SMS enviado', description: `Mensagem enviada para ${sendPhone}` })
      setShowSendDialog(false)
      setSendPhone('')
      setSendBody('')
      loadData()
    } catch (error) {
      toast({
        title: 'Erro ao enviar SMS',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  async function handleCreateBroadcast() {
    if (!orgId || !user?.id || !broadcastName.trim() || !broadcastBody.trim()) return
    setCreatingBroadcast(true)
    try {
      await createSmsBroadcast(orgId, user.id, {
        name: broadcastName,
        body: broadcastBody,
        segment_id: broadcastSegment || undefined,
      })
      toast({ title: 'Broadcast criado', description: `"${broadcastName}" foi criado com sucesso.` })
      setShowBroadcastDialog(false)
      setBroadcastName('')
      setBroadcastBody('')
      setBroadcastSegment('')
      loadData()
    } catch (error) {
      toast({
        title: 'Erro ao criar broadcast',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      })
    } finally {
      setCreatingBroadcast(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">SMS</h2>
          <p className="text-muted-foreground">
            Envie mensagens SMS individuais ou em massa via Twilio.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBroadcastDialog(true)}>
            <Radio className="mr-2 h-4 w-4" />
            Novo Broadcast
          </Button>
          <Button onClick={() => setShowSendDialog(true)}>
            <Send className="mr-2 h-4 w-4" />
            Enviar SMS
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Enviados</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {messages.filter((m) => m.direction === 'outbound').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregues</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {messages.filter((m) => m.status === 'delivered').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Falhas</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {messages.filter((m) => m.status === 'failed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Broadcasts</CardTitle>
            <Radio className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{broadcasts.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="messages">
        <TabsList>
          <TabsTrigger value="messages">Mensagens</TabsTrigger>
          <TabsTrigger value="broadcasts">Broadcasts</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Historico de SMS</CardTitle>
              <CardDescription>Todas as mensagens SMS enviadas e recebidas.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-muted-foreground">Carregando...</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Smartphone className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold">Nenhum SMS ainda</h3>
                  <p className="text-muted-foreground mt-1">
                    Envie seu primeiro SMS clicando no botao acima.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Direcao</TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.map((msg) => (
                      <TableRow key={msg.id}>
                        <TableCell className="font-mono text-sm">{msg.phone_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {msg.direction === 'outbound' ? 'Enviado' : 'Recebido'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{msg.body}</TableCell>
                        <TableCell>
                          <Badge className={SMS_STATUS_COLORS[msg.status || ''] || 'bg-gray-100 text-gray-800'}>
                            {SMS_STATUS_LABELS[msg.status || ''] || msg.status || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(msg.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="broadcasts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Broadcasts SMS</CardTitle>
              <CardDescription>Envios em massa para segmentos de leads.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-muted-foreground">Carregando...</div>
                </div>
              ) : broadcasts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Radio className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold">Nenhum broadcast ainda</h3>
                  <p className="text-muted-foreground mt-1">
                    Crie um broadcast para enviar SMS em massa.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Destinatarios</TableHead>
                      <TableHead>Enviados</TableHead>
                      <TableHead>Entregues</TableHead>
                      <TableHead>Falhas</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {broadcasts.map((bc) => (
                      <TableRow key={bc.id}>
                        <TableCell className="font-medium">{bc.name}</TableCell>
                        <TableCell>
                          <Badge className={BROADCAST_STATUS_COLORS[bc.status]}>
                            {BROADCAST_STATUS_LABELS[bc.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>{bc.total_recipients}</TableCell>
                        <TableCell>{bc.total_sent}</TableCell>
                        <TableCell>{bc.total_delivered}</TableCell>
                        <TableCell className={bc.total_failed > 0 ? 'text-red-600' : ''}>
                          {bc.total_failed}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(bc.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Send SMS Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar SMS</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sms-phone">Telefone</Label>
              <Input
                id="sms-phone"
                placeholder="+5511999999999"
                value={sendPhone}
                onChange={(e) => setSendPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Formato internacional com codigo do pais (ex: +5511999999999)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sms-body">Mensagem</Label>
              <Textarea
                id="sms-body"
                placeholder="Digite sua mensagem..."
                value={sendBody}
                onChange={(e) => setSendBody(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                {sendBody.length}/160 caracteres
                {sendBody.length > 160 && ` (${Math.ceil(sendBody.length / 153)} segmentos)`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)} disabled={sending}>
              Cancelar
            </Button>
            <Button onClick={handleSendSms} disabled={!sendPhone.trim() || !sendBody.trim() || sending}>
              {sending ? 'Enviando...' : 'Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Broadcast Dialog */}
      <Dialog open={showBroadcastDialog} onOpenChange={setShowBroadcastDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Broadcast SMS</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bc-name">Nome</Label>
              <Input
                id="bc-name"
                placeholder="Ex: Promocao de Natal"
                value={broadcastName}
                onChange={(e) => setBroadcastName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bc-body">Mensagem</Label>
              <Textarea
                id="bc-body"
                placeholder="Ola {{nome}}, temos uma oferta especial para voce!"
                value={broadcastBody}
                onChange={(e) => setBroadcastBody(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Use {'{{nome}}'}, {'{{email}}'}, {'{{empresa}}'} para personalizar.
                {broadcastBody.length > 0 && ` ${broadcastBody.length}/160 caracteres`}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bc-segment">Segmento</Label>
              <Select value={broadcastSegment} onValueChange={setBroadcastSegment}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um segmento" />
                </SelectTrigger>
                <SelectContent>
                  {segments.map((seg) => (
                    <SelectItem key={seg.id} value={seg.id}>
                      {seg.name} ({seg.lead_count} leads)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBroadcastDialog(false)} disabled={creatingBroadcast}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateBroadcast}
              disabled={!broadcastName.trim() || !broadcastBody.trim() || creatingBroadcast}
            >
              {creatingBroadcast ? 'Criando...' : 'Criar Broadcast'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
