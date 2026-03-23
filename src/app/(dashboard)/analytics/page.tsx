'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Mail,
  Eye,
  MousePointerClick,
  AlertTriangle,
  UserMinus,
  Send,
  CheckCircle2,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Inbox,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useOrganizationContext } from '@/contexts/organization-context'
import { createClient } from '@/lib/supabase/client'

// ---------- Types ----------

interface EmailAnalyticsData {
  totalCampaigns: number
  activeCampaigns: number
  draftCampaigns: number
  sentCampaigns: number
  totalSent: number
  totalDelivered: number
  totalOpened: number
  totalClicked: number
  totalBounced: number
  totalComplained: number
  openRate: number
  clickRate: number
  bounceRate: number
  deliveryRate: number
  campaigns: CampaignWithStats[]
  recentLogs: RecentLog[]
}

interface CampaignWithStats {
  id: string
  name: string
  status: string
  total_leads: number
  sent_at: string | null
  created_at: string
  scheduled_for: string | null
  total_sent: number
  total_delivered: number
  total_opened: number
  total_clicked: number
  total_bounced: number
  total_complained: number
  open_rate: number
  click_rate: number
}

interface RecentLog {
  id: string
  email: string
  status: string
  campaign_name: string
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
  clicked_at: string | null
}

// ---------- Data Fetching ----------

async function fetchEmailAnalytics(orgId: string): Promise<EmailAnalyticsData> {
  const supabase = createClient()

  const [
    campaignsCountResult,
    activeCampaignsResult,
    draftCampaignsResult,
    sentCampaignsResult,
    statsResult,
    campaignsWithStatsResult,
    recentLogsResult,
  ] = await Promise.all([
    // Total campaigns
    supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId),

    // Active campaigns (sending + scheduled)
    supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .in('status', ['sending', 'scheduled']),

    // Draft campaigns
    supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'draft'),

    // Sent campaigns
    supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'sent'),

    // Aggregate stats from all campaign_stats
    supabase
      .from('campaigns')
      .select('id, campaign_stats(total_sent, total_delivered, total_opened, total_clicked, total_bounced, total_complained)')
      .eq('org_id', orgId),

    // Campaigns with stats for the table (last 20)
    supabase
      .from('campaigns')
      .select('id, name, status, total_leads, sent_at, created_at, scheduled_for, campaign_stats(total_sent, total_delivered, total_opened, total_clicked, total_bounced, total_complained)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20),

    // Recent send logs
    supabase
      .from('campaign_send_logs')
      .select('id, email, status, sent_at, delivered_at, opened_at, clicked_at, campaign_id')
      .order('sent_at', { ascending: false })
      .limit(15),
  ])

  // Aggregate totals
  let totalSent = 0
  let totalDelivered = 0
  let totalOpened = 0
  let totalClicked = 0
  let totalBounced = 0
  let totalComplained = 0

  if (statsResult.data) {
    for (const campaign of statsResult.data) {
      const stats = (campaign as Record<string, unknown>).campaign_stats as Record<string, number>[] | undefined
      if (Array.isArray(stats) && stats.length > 0) {
        totalSent += stats[0].total_sent || 0
        totalDelivered += stats[0].total_delivered || 0
        totalOpened += stats[0].total_opened || 0
        totalClicked += stats[0].total_clicked || 0
        totalBounced += stats[0].total_bounced || 0
        totalComplained += stats[0].total_complained || 0
      }
    }
  }

  const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0
  const clickRate = totalDelivered > 0 ? (totalClicked / totalDelivered) * 100 : 0
  const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0
  const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0

  // Format campaigns with stats
  const campaignIdToName = new Map<string, string>()
  const campaigns: CampaignWithStats[] = (campaignsWithStatsResult.data || []).map((c) => {
    const campaign = c as Record<string, unknown>
    const cStats = campaign.campaign_stats as Record<string, number>[] | undefined
    const s = Array.isArray(cStats) && cStats.length > 0 ? cStats[0] : null

    const cSent = s?.total_sent || 0
    const cDelivered = s?.total_delivered || 0
    const cOpened = s?.total_opened || 0
    const cClicked = s?.total_clicked || 0
    const cBounced = s?.total_bounced || 0
    const cComplained = s?.total_complained || 0

    campaignIdToName.set(campaign.id as string, campaign.name as string)

    return {
      id: campaign.id as string,
      name: campaign.name as string,
      status: campaign.status as string,
      total_leads: campaign.total_leads as number,
      sent_at: campaign.sent_at as string | null,
      created_at: campaign.created_at as string,
      scheduled_for: campaign.scheduled_for as string | null,
      total_sent: cSent,
      total_delivered: cDelivered,
      total_opened: cOpened,
      total_clicked: cClicked,
      total_bounced: cBounced,
      total_complained: cComplained,
      open_rate: cDelivered > 0 ? (cOpened / cDelivered) * 100 : 0,
      click_rate: cDelivered > 0 ? (cClicked / cDelivered) * 100 : 0,
    }
  })

  // Format recent logs
  const recentLogs: RecentLog[] = (recentLogsResult.data || []).map((log) => {
    const l = log as Record<string, unknown>
    return {
      id: l.id as string,
      email: l.email as string,
      status: l.status as string,
      campaign_name: campaignIdToName.get(l.campaign_id as string) || 'Campanha',
      sent_at: l.sent_at as string | null,
      delivered_at: l.delivered_at as string | null,
      opened_at: l.opened_at as string | null,
      clicked_at: l.clicked_at as string | null,
    }
  })

  return {
    totalCampaigns: campaignsCountResult.count || 0,
    activeCampaigns: activeCampaignsResult.count || 0,
    draftCampaigns: draftCampaignsResult.count || 0,
    sentCampaigns: sentCampaignsResult.count || 0,
    totalSent,
    totalDelivered,
    totalOpened,
    totalClicked,
    totalBounced,
    totalComplained,
    openRate,
    clickRate,
    bounceRate,
    deliveryRate,
    campaigns,
    recentLogs,
  }
}

// ---------- Component ----------

export default function EmailAnalyticsPage() {
  const { currentOrg } = useOrganizationContext()
  const [data, setData] = useState<EmailAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!currentOrg) return
    setLoading(true)
    try {
      const result = await fetchEmailAnalytics(currentOrg.id)
      setData(result)
    } catch (error) {
      console.error('Erro ao carregar analytics de email:', error)
    } finally {
      setLoading(false)
    }
  }, [currentOrg])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics de Email</h2>
          <p className="text-muted-foreground">
            Metricas de desempenho das suas campanhas de email marketing.
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          icon={Send}
          label="Emails Enviados"
          value={loading ? undefined : formatNumber(data?.totalSent || 0)}
          loading={loading}
        />
        <KpiCard
          icon={Eye}
          label="Taxa de Abertura"
          value={loading ? undefined : `${(data?.openRate || 0).toFixed(1)}%`}
          loading={loading}
          trend={data?.openRate ? (data.openRate >= 20 ? 'up' : 'down') : undefined}
          trendLabel={data?.openRate ? (data.openRate >= 20 ? 'Bom' : 'Abaixo da media') : undefined}
        />
        <KpiCard
          icon={MousePointerClick}
          label="Taxa de Cliques"
          value={loading ? undefined : `${(data?.clickRate || 0).toFixed(1)}%`}
          loading={loading}
          trend={data?.clickRate ? (data.clickRate >= 3 ? 'up' : 'down') : undefined}
          trendLabel={data?.clickRate ? (data.clickRate >= 3 ? 'Bom' : 'Abaixo da media') : undefined}
        />
        <KpiCard
          icon={AlertTriangle}
          label="Taxa de Bounce"
          value={loading ? undefined : `${(data?.bounceRate || 0).toFixed(1)}%`}
          loading={loading}
          trend={data?.bounceRate ? (data.bounceRate <= 2 ? 'up' : 'down') : undefined}
          trendLabel={data?.bounceRate ? (data.bounceRate <= 2 ? 'Saudavel' : 'Atenção') : undefined}
        />
        <KpiCard
          icon={UserMinus}
          label="Reclamacoes"
          value={loading ? undefined : formatNumber(data?.totalComplained || 0)}
          loading={loading}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStatCard
          label="Total de Campanhas"
          value={data?.totalCampaigns || 0}
          icon={Mail}
          loading={loading}
        />
        <MiniStatCard
          label="Campanhas Ativas"
          value={data?.activeCampaigns || 0}
          icon={Clock}
          loading={loading}
          highlight
        />
        <MiniStatCard
          label="Campanhas Enviadas"
          value={data?.sentCampaigns || 0}
          icon={CheckCircle2}
          loading={loading}
        />
        <MiniStatCard
          label="Taxa de Entrega"
          value={`${(data?.deliveryRate || 0).toFixed(1)}%`}
          icon={Inbox}
          loading={loading}
        />
      </div>

      {/* Tabs: Campaign Performance + Recent Activity */}
      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">Desempenho por Campanha</TabsTrigger>
          <TabsTrigger value="activity">Atividade Recente</TabsTrigger>
        </TabsList>

        {/* Campaign Performance Table */}
        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>Campanhas de Email</CardTitle>
              <CardDescription>
                Metricas detalhadas de cada campanha — ultimas 20 campanhas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !data?.campaigns.length ? (
                <div className="py-12 text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma campanha encontrada</h3>
                  <p className="text-muted-foreground">
                    Crie sua primeira campanha em{' '}
                    <a href="/campaigns" className="text-primary underline">Campanhas</a>.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campanha</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Enviados</TableHead>
                        <TableHead className="text-right">Aberturas</TableHead>
                        <TableHead className="text-right">Cliques</TableHead>
                        <TableHead className="text-right">Taxa Abertura</TableHead>
                        <TableHead className="text-right">Taxa Cliques</TableHead>
                        <TableHead className="text-right">Bounces</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.campaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{campaign.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {campaign.sent_at
                                  ? `Enviado em ${formatDate(campaign.sent_at)}`
                                  : campaign.scheduled_for
                                    ? `Agendado para ${formatDate(campaign.scheduled_for)}`
                                    : `Criado em ${formatDate(campaign.created_at)}`}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={campaign.status} />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatNumber(campaign.total_sent)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(campaign.total_opened)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(campaign.total_clicked)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={campaign.open_rate >= 20 ? 'text-green-600' : campaign.open_rate > 0 ? 'text-yellow-600' : 'text-muted-foreground'}>
                              {campaign.open_rate > 0 ? `${campaign.open_rate.toFixed(1)}%` : '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={campaign.click_rate >= 3 ? 'text-green-600' : campaign.click_rate > 0 ? 'text-yellow-600' : 'text-muted-foreground'}>
                              {campaign.click_rate > 0 ? `${campaign.click_rate.toFixed(1)}%` : '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={campaign.total_bounced > 0 ? 'text-red-600' : 'text-muted-foreground'}>
                              {formatNumber(campaign.total_bounced)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Activity */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Atividade Recente</CardTitle>
              <CardDescription>
                Ultimos emails enviados e seus status de entrega.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !data?.recentLogs.length ? (
                <div className="py-12 text-center">
                  <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum envio registrado</h3>
                  <p className="text-muted-foreground">
                    Os envios aparecerão aqui apos suas campanhas serem disparadas.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Campanha</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Enviado em</TableHead>
                        <TableHead>Entregue em</TableHead>
                        <TableHead>Aberto em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.email}</TableCell>
                          <TableCell className="text-muted-foreground">{log.campaign_name}</TableCell>
                          <TableCell>
                            <SendLogStatusBadge status={log.status} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.sent_at ? formatDateTime(log.sent_at) : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.delivered_at ? formatDateTime(log.delivered_at) : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.opened_at ? formatDateTime(log.opened_at) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ---------- Sub Components ----------

function KpiCard({
  icon: Icon,
  label,
  value,
  loading,
  trend,
  trendLabel,
}: {
  icon: React.ElementType
  label: string
  value?: string
  loading: boolean
  trend?: 'up' | 'down'
  trendLabel?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {trend && trendLabel && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${trend === 'up' ? 'text-green-600' : 'text-yellow-600'}`}>
                {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trendLabel}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function MiniStatCard({
  label,
  value,
  icon: Icon,
  loading,
  highlight,
}: {
  label: string
  value: number | string
  icon: React.ElementType
  loading: boolean
  highlight?: boolean
}) {
  return (
    <Card className={highlight ? 'border-primary/30 bg-primary/5' : ''}>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${highlight ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-6 w-16 mt-1" />
          ) : (
            <p className="text-xl font-bold">
              {typeof value === 'number' ? formatNumber(value) : value}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft: { label: 'Rascunho', variant: 'secondary' },
    scheduled: { label: 'Agendada', variant: 'outline' },
    sending: { label: 'Enviando', variant: 'default' },
    sent: { label: 'Enviada', variant: 'default' },
    paused: { label: 'Pausada', variant: 'secondary' },
    failed: { label: 'Falhou', variant: 'destructive' },
  }
  const cfg = config[status] || { label: status, variant: 'secondary' as const }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

function SendLogStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending: { label: 'Pendente', variant: 'secondary' },
    sent: { label: 'Enviado', variant: 'outline' },
    delivered: { label: 'Entregue', variant: 'default' },
    opened: { label: 'Aberto', variant: 'default' },
    clicked: { label: 'Clicado', variant: 'default' },
    bounced: { label: 'Bounce', variant: 'destructive' },
    complained: { label: 'Spam', variant: 'destructive' },
  }
  const cfg = config[status] || { label: status, variant: 'secondary' as const }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

// ---------- Helpers ----------

function formatNumber(n: number): string {
  return n.toLocaleString('pt-BR')
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}
