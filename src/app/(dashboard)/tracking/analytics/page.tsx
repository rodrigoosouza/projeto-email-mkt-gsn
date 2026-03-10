'use client'

import { useEffect, useState } from 'react'
import {
  Activity,
  Eye,
  Clock,
  ArrowDown,
  XCircle,
  Monitor,
  Smartphone,
  Tablet,
  Loader2,
  BarChart3,
  Globe,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { KpiCard } from '@/components/shared/kpi-card'
import { useOrganizationContext } from '@/contexts/organization-context'
import { useToast } from '@/components/ui/use-toast'
import { getAnalyticsSummary, type VisitorAnalyticsSummary } from '@/lib/supabase/visitor-analytics'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type PeriodOption = 7 | 30 | 90

const PERIOD_OPTIONS: { label: string; value: PeriodOption }[] = [
  { label: '7 dias', value: 7 },
  { label: '30 dias', value: 30 },
  { label: '90 dias', value: 90 },
]

const DEVICE_ICONS = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
}

const DEVICE_LABELS: Record<string, string> = {
  desktop: 'Desktop',
  mobile: 'Mobile',
  tablet: 'Tablet',
}

const DEVICE_COLORS: Record<string, string> = {
  desktop: '#3b82f6',
  mobile: '#10b981',
  tablet: '#f59e0b',
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (minutes < 60) return `${minutes}m ${secs}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

function truncateSessionId(id: string): string {
  if (id.length <= 12) return id
  return `${id.slice(0, 8)}...`
}

function truncatePath(path: string, maxLen: number = 40): string {
  if (path.length <= maxLen) return path
  return `${path.slice(0, maxLen)}...`
}

export default function VisitorAnalyticsPage() {
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()
  const [period, setPeriod] = useState<PeriodOption>(30)
  const [data, setData] = useState<VisitorAnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentOrg) loadData()
  }, [currentOrg, period])

  const loadData = async () => {
    if (!currentOrg) return
    setLoading(true)
    try {
      const summary = await getAnalyticsSummary(currentOrg.id, period)
      setData(summary)
    } catch (error) {
      console.error('Erro ao carregar analytics de visitantes:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados de visitantes.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const isEmpty = !data || (data.totalSessions === 0 && data.topPages.length === 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Comportamento de Visitantes</h2>
          <p className="text-muted-foreground">
            Sessoes, scroll depth, tempo na pagina e fontes de trafego.
          </p>
        </div>
        <div className="flex gap-1 border rounded-md p-0.5">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={period === opt.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriod(opt.value)}
              className="text-xs h-7"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty State */}
      {!loading && isEmpty && (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum dado de visitantes</h3>
            <p className="text-muted-foreground">
              Os dados de sessoes e comportamento aparecerao aqui quando o tracking estiver
              coletando informacoes dos visitantes.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Data */}
      {!loading && !isEmpty && data && (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <KpiCard
              icon={Activity}
              label="Total Sessoes"
              value={data.totalSessions.toLocaleString('pt-BR')}
            />
            <KpiCard
              icon={Eye}
              label="Page Views"
              value={data.totalPageViews.toLocaleString('pt-BR')}
            />
            <KpiCard
              icon={Clock}
              label="Duracao Media"
              value={formatDuration(data.avgDuration)}
            />
            <KpiCard
              icon={ArrowDown}
              label="Scroll Medio"
              value={`${data.avgScrollDepth}%`}
            />
            <KpiCard
              icon={XCircle}
              label="Taxa de Rejeicao"
              value={`${data.bounceRate}%`}
            />
          </div>

          {/* Two columns: Device + Sources */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Device Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dispositivos</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const total =
                    data.deviceBreakdown.desktop +
                    data.deviceBreakdown.mobile +
                    data.deviceBreakdown.tablet
                  if (total === 0) {
                    return (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Sem dados de dispositivos.
                      </p>
                    )
                  }
                  return (
                    <div className="space-y-4">
                      {/* Stacked bar */}
                      <div className="h-6 bg-muted rounded-full overflow-hidden flex">
                        {(['desktop', 'mobile', 'tablet'] as const).map((device) => {
                          const count = data.deviceBreakdown[device]
                          const pct = (count / total) * 100
                          if (pct === 0) return null
                          return (
                            <div
                              key={device}
                              className="h-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: DEVICE_COLORS[device],
                              }}
                            />
                          )
                        })}
                      </div>
                      {/* Legend */}
                      <div className="space-y-2">
                        {(['desktop', 'mobile', 'tablet'] as const).map((device) => {
                          const DeviceIcon = DEVICE_ICONS[device]
                          const count = data.deviceBreakdown[device]
                          const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0'
                          return (
                            <div
                              key={device}
                              className="flex items-center justify-between text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: DEVICE_COLORS[device] }}
                                />
                                <DeviceIcon className="h-4 w-4 text-muted-foreground" />
                                <span>{DEVICE_LABELS[device]}</span>
                              </div>
                              <span className="text-muted-foreground">
                                {count.toLocaleString('pt-BR')} ({pct}%)
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>

            {/* Source Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fontes de Trafego</CardTitle>
              </CardHeader>
              <CardContent>
                {data.sourceBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Sem dados de fontes.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.sourceBreakdown.map((item) => {
                      const maxCount = data.sourceBreakdown[0]?.count || 1
                      const width = (item.count / maxCount) * 100
                      return (
                        <div key={item.source} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium">{item.source}</span>
                            </div>
                            <span className="text-muted-foreground">
                              {item.count.toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all bg-primary"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Pages Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Paginas</CardTitle>
            </CardHeader>
            <CardContent>
              {data.topPages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Sem dados de paginas.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pagina</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                      <TableHead className="text-right">Visitantes</TableHead>
                      <TableHead className="text-right">Scroll Medio</TableHead>
                      <TableHead className="text-right">Tempo Medio</TableHead>
                      <TableHead className="text-right">Rejeicao</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topPages.map((page) => (
                      <TableRow key={page.page_path}>
                        <TableCell className="font-mono text-xs max-w-[300px] truncate">
                          {page.page_path}
                        </TableCell>
                        <TableCell className="text-right">
                          {page.views.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          {page.unique_visitors.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">{page.avg_scroll_depth}%</TableCell>
                        <TableCell className="text-right">
                          {formatDuration(page.avg_time_seconds)}
                        </TableCell>
                        <TableCell className="text-right">{page.bounce_rate}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Recent Sessions Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sessoes Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Sem sessoes recentes.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sessao</TableHead>
                      <TableHead>Landing Page</TableHead>
                      <TableHead>Referrer</TableHead>
                      <TableHead>Dispositivo</TableHead>
                      <TableHead className="text-right">Paginas</TableHead>
                      <TableHead className="text-right">Duracao</TableHead>
                      <TableHead className="text-right">Scroll</TableHead>
                      <TableHead className="text-right">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {truncateSessionId(session.session_id)}
                          </code>
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[200px] truncate">
                          {session.landing_page
                            ? truncatePath(session.landing_page)
                            : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate">
                          {session.referrer
                            ? (() => {
                                try {
                                  return new URL(session.referrer).hostname
                                } catch {
                                  return session.referrer
                                }
                              })()
                            : <span className="text-muted-foreground">direto</span>}
                        </TableCell>
                        <TableCell>
                          {session.device_type ? (
                            <Badge variant="secondary" className="text-xs">
                              {DEVICE_LABELS[session.device_type] || session.device_type}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{session.pages_viewed}</TableCell>
                        <TableCell className="text-right">
                          {formatDuration(session.duration_seconds)}
                        </TableCell>
                        <TableCell className="text-right">{session.max_scroll_depth}%</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(session.started_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
