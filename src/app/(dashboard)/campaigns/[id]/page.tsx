'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Trash2,
  Send,
  Clock,
  Pause,
  Play,
  Mail,
  CheckCircle2,
  Eye,
  MousePointerClick,
  AlertTriangle,
  ShieldAlert,
  FileText,
  Users,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import {
  getCampaign,
  deleteCampaign,
  getCampaignStats,
  getCampaignSendLogs,
  scheduleCampaign,
  pauseCampaign,
} from '@/lib/supabase/campaigns'
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_COLORS,
} from '@/lib/constants'
import { KpiCard } from '@/components/shared/kpi-card'
import type { Campaign, CampaignStats, CampaignSendLog } from '@/lib/types'

const SEND_LOG_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  sent: 'Enviado',
  delivered: 'Entregue',
  opened: 'Aberto',
  clicked: 'Clicado',
  bounced: 'Bounce',
  complained: 'Reclamacao',
}

const SEND_LOG_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  opened: 'bg-emerald-100 text-emerald-800',
  clicked: 'bg-cyan-100 text-cyan-800',
  bounced: 'bg-red-100 text-red-800',
  complained: 'bg-orange-100 text-orange-800',
}

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { currentOrg } = useOrganizationContext()
  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<
    (Campaign & { template?: { name: string }; segment?: { name: string } }) | null
  >(null)
  const [stats, setStats] = useState<CampaignStats | null>(null)
  const [sendLogs, setSendLogs] = useState<CampaignSendLog[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [sending, setSending] = useState(false)
  const [pausing, setPausing] = useState(false)

  const fetchCampaign = useCallback(async () => {
    try {
      const data = await getCampaign(campaignId)
      setCampaign(data)
      return data
    } catch (error) {
      console.error('Erro ao buscar campanha:', error)
      toast({
        title: 'Erro',
        description: 'Campanha nao encontrada.',
        variant: 'destructive',
      })
      router.push('/campaigns')
      return null
    }
  }, [campaignId, router, toast])

  const fetchStats = useCallback(async () => {
    try {
      const data = await getCampaignStats(campaignId)
      setStats(data)
    } catch (error) {
      console.error('Erro ao buscar estatisticas:', error)
    }
  }, [campaignId])

  const fetchSendLogs = useCallback(async () => {
    try {
      const { logs } = await getCampaignSendLogs(campaignId)
      setSendLogs(logs)
    } catch (error) {
      console.error('Erro ao buscar logs de envio:', error)
    }
  }, [campaignId])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const campaignData = await fetchCampaign()
      if (campaignData) {
        const status = campaignData.status
        if (
          status === 'sent' ||
          status === 'sending' ||
          status === 'failed'
        ) {
          await Promise.all([fetchStats(), fetchSendLogs()])
        }
      }
      setLoading(false)
    }
    load()
  }, [fetchCampaign, fetchStats, fetchSendLogs])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteCampaign(campaignId)
      toast({
        title: 'Campanha excluida',
        description: 'A campanha foi excluida com sucesso.',
      })
      router.push('/campaigns')
    } catch (error) {
      console.error('Erro ao excluir campanha:', error)
      toast({
        title: 'Erro',
        description: 'Nao foi possivel excluir a campanha.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  const handleSchedule = async () => {
    if (!scheduleDate) {
      toast({
        title: 'Erro',
        description: 'Selecione uma data e hora para o agendamento.',
        variant: 'destructive',
      })
      return
    }
    setScheduling(true)
    try {
      const updated = await scheduleCampaign(
        campaignId,
        new Date(scheduleDate).toISOString()
      )
      setCampaign((prev) => (prev ? { ...prev, ...updated } : prev))
      toast({
        title: 'Campanha agendada',
        description: 'A campanha foi agendada com sucesso.',
      })
      setScheduleOpen(false)
      setScheduleDate('')
    } catch (error) {
      console.error('Erro ao agendar campanha:', error)
      toast({
        title: 'Erro',
        description: 'Nao foi possivel agendar a campanha.',
        variant: 'destructive',
      })
    } finally {
      setScheduling(false)
    }
  }

  const handleSendNow = async () => {
    setSending(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/send`, {
        method: 'POST',
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao enviar campanha')
      }
      const data = await response.json()
      toast({
        title: 'Campanha enviada',
        description: `Envio iniciado para ${data.totalLeads} leads.`,
      })
      // Refresh campaign data
      await fetchCampaign()
      await Promise.all([fetchStats(), fetchSendLogs()])
    } catch (error) {
      console.error('Erro ao enviar campanha:', error)
      toast({
        title: 'Erro',
        description:
          error instanceof Error
            ? error.message
            : 'Nao foi possivel enviar a campanha.',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const handlePause = async () => {
    setPausing(true)
    try {
      const updated = await pauseCampaign(campaignId)
      setCampaign((prev) => (prev ? { ...prev, ...updated } : prev))
      toast({
        title: 'Campanha pausada',
        description: 'A campanha foi pausada com sucesso.',
      })
    } catch (error) {
      console.error('Erro ao pausar campanha:', error)
      toast({
        title: 'Erro',
        description: 'Nao foi possivel pausar a campanha.',
        variant: 'destructive',
      })
    } finally {
      setPausing(false)
    }
  }

  const handleResume = () => {
    setScheduleOpen(true)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nao agendada'
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getPercentage = (part: number, total: number) => {
    if (total === 0) return '0%'
    return `${((part / total) * 100).toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (!campaign) return null

  const statusLabel =
    CAMPAIGN_STATUS_LABELS[campaign.status] || campaign.status
  const statusColor =
    CAMPAIGN_STATUS_COLORS[campaign.status] || 'bg-gray-100 text-gray-800'
  const showStats =
    campaign.status === 'sent' ||
    campaign.status === 'sending' ||
    campaign.status === 'failed'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/campaigns')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Campanhas
          </Button>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">
              {campaign.name}
            </h2>
            <Badge className={statusColor}>{statusLabel}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* DRAFT actions */}
          {campaign.status === 'draft' && (
            <>
              <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Clock className="mr-2 h-4 w-4" />
                    Agendar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agendar Campanha</DialogTitle>
                    <DialogDescription>
                      Selecione a data e hora para o envio da campanha.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <input
                      type="datetime-local"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setScheduleOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleSchedule} disabled={scheduling}>
                      {scheduling ? 'Agendando...' : 'Confirmar Agendamento'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                variant="default"
                size="sm"
                onClick={handleSendNow}
                disabled={sending}
              >
                <Send className="mr-2 h-4 w-4" />
                {sending ? 'Enviando...' : 'Enviar Agora'}
              </Button>
            </>
          )}

          {/* SCHEDULED actions */}
          {campaign.status === 'scheduled' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePause}
              disabled={pausing}
            >
              <Pause className="mr-2 h-4 w-4" />
              {pausing ? 'Pausando...' : 'Pausar'}
            </Button>
          )}

          {/* SENDING actions */}
          {campaign.status === 'sending' && (
            <Button variant="outline" size="sm" disabled>
              <Pause className="mr-2 h-4 w-4" />
              Pausar
            </Button>
          )}

          {/* PAUSED actions */}
          {campaign.status === 'paused' && (
            <>
              <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleResume}>
                    <Play className="mr-2 h-4 w-4" />
                    Retomar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reagendar Campanha</DialogTitle>
                    <DialogDescription>
                      Selecione a nova data e hora para o envio da campanha.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <input
                      type="datetime-local"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setScheduleOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleSchedule} disabled={scheduling}>
                      {scheduling ? 'Agendando...' : 'Confirmar Reagendamento'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}

          {/* Delete - available for draft, scheduled, sent, paused */}
          {(campaign.status === 'draft' ||
            campaign.status === 'scheduled' ||
            campaign.status === 'sent' ||
            campaign.status === 'paused') && (
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Excluir campanha</DialogTitle>
                  <DialogDescription>
                    Tem certeza que deseja excluir a campanha{' '}
                    <strong>{campaign.name}</strong>? Esta acao nao pode ser
                    desfeita.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Excluindo...' : 'Excluir'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Template</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {campaign.template?.name || 'Template removido'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Segmento</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {campaign.segment?.name || 'Segmento removido'}
            </p>
            {campaign.total_leads > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {campaign.total_leads} leads
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamento</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {formatDate(campaign.scheduled_for)}
            </p>
            {campaign.sent_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Enviada em: {formatDate(campaign.sent_at)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      {showStats && stats && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Estatisticas</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KpiCard
              icon={Mail}
              label="Enviados"
              value={stats.total_sent}
            />
            <KpiCard
              icon={CheckCircle2}
              label="Entregues"
              value={`${stats.total_delivered} (${getPercentage(stats.total_delivered, stats.total_sent)})`}
            />
            <KpiCard
              icon={Eye}
              label="Abertos"
              value={`${stats.total_opened} (${getPercentage(stats.total_opened, stats.total_sent)})`}
            />
            <KpiCard
              icon={MousePointerClick}
              label="Clicados"
              value={`${stats.total_clicked} (${getPercentage(stats.total_clicked, stats.total_sent)})`}
            />
            <KpiCard
              icon={AlertTriangle}
              label="Bounces"
              value={stats.total_bounced}
            />
            <KpiCard
              icon={ShieldAlert}
              label="Reclamacoes"
              value={stats.total_complained}
            />
          </div>
        </div>
      )}

      {/* Send Logs Table */}
      {showStats && sendLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Logs de Envio</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enviado em</TableHead>
                  <TableHead>Entregue em</TableHead>
                  <TableHead>Aberto em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sendLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.email}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          SEND_LOG_STATUS_COLORS[log.status] ||
                          'bg-gray-100 text-gray-800'
                        }
                      >
                        {SEND_LOG_STATUS_LABELS[log.status] || log.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(log.sent_at)}</TableCell>
                    <TableCell>{formatDate(log.delivered_at)}</TableCell>
                    <TableCell>{formatDate(log.opened_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
