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
import { Progress } from '@/components/ui/progress'
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
  failed: 'Falhou',
  complained: 'Reclamacao',
}

const SEND_LOG_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  opened: 'bg-emerald-100 text-emerald-800',
  clicked: 'bg-cyan-100 text-cyan-800',
  bounced: 'bg-red-100 text-red-800',
  failed: 'bg-amber-100 text-amber-800',
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
  const [logFilter, setLogFilter] = useState('all')
  const [apiQuota, setApiQuota] = useState<{ quota: number; remaining: number; reset: string } | null>(null)
  const [sendProgress, setSendProgress] = useState<{ sent: number; failed: number; pending: number; total: number } | null>(null)

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
      const { logs } = await getCampaignSendLogs(campaignId, { pageSize: 2000 })
      setSendLogs(logs)
      // Calculate progress from logs
      if (logs.length > 0) {
        const sent = logs.filter(l => ['sent', 'delivered', 'opened', 'clicked'].includes(l.status)).length
        const failed = logs.filter(l => ['bounced', 'complained', 'failed'].includes(l.status)).length
        const pending = logs.filter(l => l.status === 'pending').length
        setSendProgress({ sent, failed, pending, total: logs.length })
      }
    } catch (error) {
      console.error('Erro ao buscar logs de envio:', error)
    }
  }, [campaignId])

  const fetchApiQuota = useCallback(async () => {
    try {
      const res = await fetch('/api/mailersend/quota')
      if (res.ok) {
        const data = await res.json()
        setApiQuota(data)
      }
    } catch (error) {
      console.error('Erro ao buscar quota:', error)
    }
  }, [])

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
      fetchApiQuota()
      setLoading(false)
    }
    load()
  }, [fetchCampaign, fetchStats, fetchSendLogs, fetchApiQuota])

  // Polling during sending
  useEffect(() => {
    if (campaign?.status !== 'sending') return
    const interval = setInterval(async () => {
      await Promise.all([fetchCampaign(), fetchStats(), fetchSendLogs(), fetchApiQuota()])
    }, 5000)
    return () => clearInterval(interval)
  }, [campaign?.status, fetchCampaign, fetchStats, fetchSendLogs, fetchApiQuota])

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

      {/* Send Progress + API Quota */}
      {(campaign.status === 'sending' || campaign.status === 'sent' || campaign.status === 'failed') && sendProgress && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {campaign.status === 'sending' && <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" /></span>}
              Progresso do Disparo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">
                  {sendProgress.sent + sendProgress.failed} de {sendProgress.total} processados
                </span>
                <span className="font-medium">
                  {sendProgress.total > 0 ? Math.round(((sendProgress.sent + sendProgress.failed) / sendProgress.total) * 100) : 0}%
                </span>
              </div>
              <Progress value={sendProgress.total > 0 ? ((sendProgress.sent + sendProgress.failed) / sendProgress.total) * 100 : 0} className="h-3" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                <p className="text-xl font-bold text-emerald-600">{sendProgress.sent}</p>
                <p className="text-[11px] text-muted-foreground">Enviados</p>
              </div>
              <div className="text-center p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30">
                <p className="text-xl font-bold text-red-600">{sendProgress.failed}</p>
                <p className="text-[11px] text-muted-foreground">Falharam</p>
              </div>
              <div className="text-center p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <p className="text-xl font-bold text-blue-600">{sendProgress.pending}</p>
                <p className="text-[11px] text-muted-foreground">Pendentes</p>
              </div>
              <div className="text-center p-2.5 rounded-lg bg-gray-50 dark:bg-gray-950/30">
                <p className="text-xl font-bold">{sendProgress.total}</p>
                <p className="text-[11px] text-muted-foreground">Total</p>
              </div>
            </div>
            {apiQuota && (
              <div className="border-t pt-3 mt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Quota MailerSend</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <p className="text-sm font-semibold">{apiQuota.remaining.toLocaleString('pt-BR')}</p>
                    <p className="text-[11px] text-muted-foreground">Restantes no mes</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{apiQuota.quota.toLocaleString('pt-BR')}</p>
                    <p className="text-[11px] text-muted-foreground">Quota mensal</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{new Date(apiQuota.reset).toLocaleDateString('pt-BR')}</p>
                    <p className="text-[11px] text-muted-foreground">Reset</p>
                  </div>
                </div>
                <Progress value={((apiQuota.quota - apiQuota.remaining) / apiQuota.quota) * 100} className="h-1.5 mt-2" />
                <p className="text-[10px] text-muted-foreground mt-1">{((apiQuota.quota - apiQuota.remaining) / apiQuota.quota * 100).toFixed(1)}% utilizado</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* API Quota (when not sending) */}
      {campaign.status === 'draft' && apiQuota && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Quota MailerSend:</span>
              <span className="font-medium">{apiQuota.remaining.toLocaleString('pt-BR')} / {apiQuota.quota.toLocaleString('pt-BR')} emails restantes</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats + Logs */}
      {showStats && sendLogs.length > 0 && (() => {
        const counts: Record<string, number> = {}
        sendLogs.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1 })
        const successStatuses = ['sent', 'delivered', 'opened', 'clicked']
        const totalSuccess = sendLogs.filter(l => successStatuses.includes(l.status)).length
        const totalFailed = counts['failed'] || 0
        const totalBounced = counts['bounced'] || 0
        const totalPending = counts['pending'] || 0
        const delivered = counts['delivered'] || 0
        const opened = counts['opened'] || 0
        const clicked = counts['clicked'] || 0
        const complained = counts['complained'] || 0

        const filterButtons = [
          { key: 'all', label: 'Todos', count: sendLogs.length, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
          { key: 'success', label: 'Enviados', count: totalSuccess, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
          { key: 'delivered', label: 'Entregues', count: delivered, color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
          { key: 'opened', label: 'Abertos', count: opened, color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400' },
          { key: 'clicked', label: 'Clicados', count: clicked, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
          { key: 'bounced', label: 'Bounces', count: totalBounced, color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
          { key: 'failed', label: 'Erros', count: totalFailed, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
          { key: 'pending', label: 'Pendentes', count: totalPending, color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
        ].filter(b => b.count > 0 || b.key === 'all')

        const filteredLogs = logFilter === 'all' ? sendLogs
          : logFilter === 'success' ? sendLogs.filter(l => successStatuses.includes(l.status))
          : sendLogs.filter(l => l.status === logFilter)

        return (<>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-l-4 border-l-emerald-400">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-emerald-600">{totalSuccess}</p>
                <p className="text-xs text-muted-foreground">Enviados com sucesso</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{sendLogs.length > 0 ? ((totalSuccess / sendLogs.length) * 100).toFixed(1) : 0}% do total</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-cyan-400">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-cyan-600">{opened}</p>
                <p className="text-xs text-muted-foreground">Abriram o email</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{totalSuccess > 0 ? ((opened / totalSuccess) * 100).toFixed(1) : 0}% taxa de abertura</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-400">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-blue-600">{clicked}</p>
                <p className="text-xs text-muted-foreground">Clicaram no link</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{totalSuccess > 0 ? ((clicked / totalSuccess) * 100).toFixed(1) : 0}% taxa de clique</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-400">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-red-600">{totalBounced + totalFailed}</p>
                <p className="text-xs text-muted-foreground">Nao entregues</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{totalBounced} bounces, {totalFailed} erros</p>
              </CardContent>
            </Card>
          </div>

          {/* Logs */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Detalhamento por Destinatario</CardTitle>
                <span className="text-xs text-muted-foreground">{filteredLogs.length} registros</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {filterButtons.map(b => (
                  <button key={b.key} onClick={() => setLogFilter(b.key)} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${logFilter === b.key ? b.color + ' ring-2 ring-offset-1 ring-current' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                    {b.label} ({b.count})
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs pl-4">Email</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Enviado</TableHead>
                      <TableHead className="text-xs">Entregue</TableHead>
                      <TableHead className="text-xs">Aberto</TableHead>
                      <TableHead className="text-xs pr-4">Erro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.slice(0, 200).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm pl-4">{log.email}</TableCell>
                        <TableCell>
                          <Badge className={SEND_LOG_STATUS_COLORS[log.status] || 'bg-gray-100 text-gray-800'} variant="secondary">
                            {SEND_LOG_STATUS_LABELS[log.status] || log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{log.sent_at ? formatDate(log.sent_at) : '-'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{log.delivered_at ? formatDate(log.delivered_at) : '-'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{log.opened_at ? formatDate(log.opened_at) : '-'}</TableCell>
                        <TableCell className="text-xs text-red-500 pr-4 max-w-[200px] truncate">{(log as any).error_message || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {filteredLogs.length > 200 && (
                <p className="text-xs text-muted-foreground text-center py-2">Mostrando 200 de {filteredLogs.length} registros</p>
              )}
            </CardContent>
          </Card>
        </>)
      })()}
      )}
    </div>
  )
}
