// @ts-nocheck
'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Users,
  Activity,
  Eye,
  UserPlus,
  Target,
  MousePointerClick,
  Loader2,
  ArrowRight,
  Globe,
  MapPin,
  FileText,
  Link2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useTrackingKPIs,
  useTrackingCharts,
  useTrackingExtra,
} from '@/hooks/tracking'
import {
  getTrackingOrgByOrgId,
} from '@/lib/tracking/organizations'
import type { OrgTables } from '@/lib/tracking/organizations'
import {
  getDateRange,
  formatNumber,
  formatCurrency,
  formatPercent,
} from '@/lib/tracking/utils'
import {
  TEMPERATURE_COLORS,
  TEMPERATURE_LABELS,
  CHANNEL_COLORS,
  CHART_COLORS,
  LEAD_EVENTS,
} from '@/lib/tracking/constants'
import { useOrganizationContext } from '@/contexts/organization-context'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type DateRangeOption = '7d' | '30d' | '90d'

const DATE_RANGE_OPTIONS: { label: string; value: DateRangeOption }[] = [
  { label: '7 dias', value: '7d' },
  { label: '30 dias', value: '30d' },
  { label: '90 dias', value: '90d' },
]

// --- Conv rate badge helper ---
function ConvBadge({ rate }: { rate: number }) {
  const color =
    rate >= 5
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : rate >= 2
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  return (
    <Badge variant="secondary" className={cn('text-xs font-semibold', color)}>
      {rate.toFixed(1)}%
    </Badge>
  )
}

// --- KPI Card (Growth style) ---
function KpiCardLocal({
  label,
  value,
  sub,
  icon: Icon,
  color = 'text-primary',
}: {
  label: string
  value: string
  sub?: string
  icon: any
  color?: string
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={cn('p-2.5 rounded-xl bg-muted/50', color)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// --- UTM row type ---
interface UtmRow {
  source: string
  medium: string
  sessions: number
  pageViews: number
  leads: number
  convRate: number
}

// --- Page row type ---
interface PageRow {
  path: string
  views: number
  sessions: number
  leads: number
  convRate: number
}

// --- Geo row type ---
interface GeoRow {
  state: string
  sessions: number
  leads: number
  convRate: number
}

export default function TrackingPage() {
  const { currentOrg } = useOrganizationContext()
  const [dateRange, setDateRange] = useState<DateRangeOption>('30d')

  const { startDate, endDate } = useMemo(() => getDateRange(dateRange), [dateRange])

  const trackingOrg = useMemo(() => {
    if (!currentOrg) return null
    return getTrackingOrgByOrgId(currentOrg.id) || null
  }, [currentOrg?.id])

  const orgTablesList: OrgTables[] = useMemo(() => {
    if (trackingOrg) return [trackingOrg.tables]
    return []
  }, [trackingOrg])

  const { data: kpis, loading: kpisLoading } = useTrackingKPIs(startDate, endDate, orgTablesList)
  const {
    leadsOverTime,
    channelBreakdown,
    temperatureDistribution,
    funnelData,
    loading: chartsLoading,
  } = useTrackingCharts(startDate, endDate, orgTablesList)
  const { data: extra, loading: extraLoading } = useTrackingExtra(startDate, endDate, orgTablesList)

  const isLoading = kpisLoading || chartsLoading || extraLoading

  // --- Direct queries for tabs ---
  const [utmData, setUtmData] = useState<UtmRow[]>([])
  const [utmLoading, setUtmLoading] = useState(false)
  const [pageData, setPageData] = useState<PageRow[]>([])
  const [pageLoading, setPageLoading] = useState(false)
  const [geoData, setGeoData] = useState<GeoRow[]>([])
  const [geoLoading, setGeoLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // Fetch UTM data
  useEffect(() => {
    if (activeTab !== 'sources' || !orgTablesList.length) return
    const tableName = orgTablesList[0]?.events
    if (!tableName) return

    let cancelled = false
    async function fetchUtm() {
      setUtmLoading(true)
      try {
        const supabase = createClient()
        const { data: events } = await supabase
          .from(tableName)
          .select('event_name, session_id, utm_source, utm_medium')
          .gte('created_at', startDate)
          .lte('created_at', endDate)

        if (cancelled || !events) return

        const map: Record<string, { sessions: Set<string>; pageViews: number; leads: number }> = {}
        events.forEach((e: any) => {
          const src = e.utm_source || '(direct)'
          const med = e.utm_medium || '(none)'
          const key = `${src}|||${med}`
          if (!map[key]) map[key] = { sessions: new Set(), pageViews: 0, leads: 0 }
          if (e.session_id) map[key].sessions.add(e.session_id)
          if (e.event_name === 'page_view' || e.event_name === 'custom_page_view') {
            map[key].pageViews++
          }
          if (LEAD_EVENTS.includes(e.event_name)) {
            map[key].leads++
          }
        })

        const rows: UtmRow[] = Object.entries(map)
          .map(([key, val]) => {
            const [source, medium] = key.split('|||')
            const sessions = val.sessions.size
            return {
              source,
              medium,
              sessions,
              pageViews: val.pageViews,
              leads: val.leads,
              convRate: sessions > 0 ? (val.leads / sessions) * 100 : 0,
            }
          })
          .sort((a, b) => b.sessions - a.sessions)

        setUtmData(rows)
      } catch (err) {
        console.error('UTM fetch error:', err)
      } finally {
        setUtmLoading(false)
      }
    }
    fetchUtm()
    return () => { cancelled = true }
  }, [activeTab, orgTablesList, startDate, endDate])

  // Fetch Page data
  useEffect(() => {
    if (activeTab !== 'pages' || !orgTablesList.length) return
    const tableName = orgTablesList[0]?.events
    if (!tableName) return

    let cancelled = false
    async function fetchPages() {
      setPageLoading(true)
      try {
        const supabase = createClient()
        const { data: events } = await supabase
          .from(tableName)
          .select('event_name, session_id, page_path')
          .gte('created_at', startDate)
          .lte('created_at', endDate)

        if (cancelled || !events) return

        const map: Record<string, { views: number; sessions: Set<string>; leads: number }> = {}
        events.forEach((e: any) => {
          const path = e.page_path || '/'
          if (!map[path]) map[path] = { views: 0, sessions: new Set(), leads: 0 }
          if (e.session_id) map[path].sessions.add(e.session_id)
          if (e.event_name === 'page_view' || e.event_name === 'custom_page_view') {
            map[path].views++
          }
          if (LEAD_EVENTS.includes(e.event_name)) {
            map[path].leads++
          }
        })

        const rows: PageRow[] = Object.entries(map)
          .map(([path, val]) => {
            const sessions = val.sessions.size
            return {
              path,
              views: val.views,
              sessions,
              leads: val.leads,
              convRate: sessions > 0 ? (val.leads / sessions) * 100 : 0,
            }
          })
          .sort((a, b) => b.views - a.views)

        setPageData(rows)
      } catch (err) {
        console.error('Pages fetch error:', err)
      } finally {
        setPageLoading(false)
      }
    }
    fetchPages()
    return () => { cancelled = true }
  }, [activeTab, orgTablesList, startDate, endDate])

  // Fetch Geo data
  useEffect(() => {
    if (activeTab !== 'geo' || !orgTablesList.length) return
    const tableName = orgTablesList[0]?.events
    if (!tableName) return

    let cancelled = false
    async function fetchGeo() {
      setGeoLoading(true)
      try {
        const supabase = createClient()
        const { data: events } = await supabase
          .from(tableName)
          .select('event_name, session_id, geo_state')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .not('geo_state', 'is', null)

        if (cancelled || !events) return

        const map: Record<string, { sessions: Set<string>; leads: number }> = {}
        events.forEach((e: any) => {
          const state = e.geo_state || '(desconhecido)'
          if (!map[state]) map[state] = { sessions: new Set(), leads: 0 }
          if (e.session_id) map[state].sessions.add(e.session_id)
          if (LEAD_EVENTS.includes(e.event_name)) {
            map[state].leads++
          }
        })

        const rows: GeoRow[] = Object.entries(map)
          .map(([state, val]) => {
            const sessions = val.sessions.size
            return {
              state,
              sessions,
              leads: val.leads,
              convRate: sessions > 0 ? (val.leads / sessions) * 100 : 0,
            }
          })
          .sort((a, b) => b.sessions - a.sessions)

        setGeoData(rows)
      } catch (err) {
        console.error('Geo fetch error:', err)
      } finally {
        setGeoLoading(false)
      }
    }
    fetchGeo()
    return () => { cancelled = true }
  }, [activeTab, orgTablesList, startDate, endDate])

  // Computed KPIs
  const scrollAvg = extra?.avgTimeOnPage
    ? `${Math.round(extra.avgTimeOnPage)}s`
    : '—'
  const convRate = kpis
    ? kpis.totalSessions > 0
      ? (kpis.totalLeads / kpis.totalSessions) * 100
      : 0
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tracking & Analytics</h2>
          <p className="text-sm text-muted-foreground">
            {currentOrg?.name} — {trackingOrg ? `Dados de ${trackingOrg.name}` : 'Sem tracking configurado'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 border rounded-lg p-0.5">
            {DATE_RANGE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={dateRange === opt.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDateRange(opt.value)}
                className="text-xs h-7 px-3"
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* No tracking configured */}
      {!trackingOrg && (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhum tracking GTM configurado para {currentOrg?.name}.
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && trackingOrg && (
        <>
          {/* 6 KPI Cards */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <KpiCardLocal
              icon={Users}
              label="Visitantes"
              value={formatNumber(kpis?.totalVisitors ?? 0)}
              color="text-blue-600"
            />
            <KpiCardLocal
              icon={Activity}
              label="Sessoes"
              value={formatNumber(kpis?.totalSessions ?? 0)}
              color="text-violet-600"
            />
            <KpiCardLocal
              icon={Eye}
              label="Page Views"
              value={formatNumber(funnelData.find((f) => f.name === 'Pageviews')?.value ?? 0)}
              color="text-cyan-600"
            />
            <KpiCardLocal
              icon={UserPlus}
              label="Leads"
              value={formatNumber(kpis?.totalLeads ?? 0)}
              color="text-green-600"
            />
            <KpiCardLocal
              icon={Target}
              label="Taxa Conversao"
              value={formatPercent(convRate)}
              sub={`${formatNumber(kpis?.totalLeads ?? 0)} / ${formatNumber(kpis?.totalSessions ?? 0)} sessoes`}
              color="text-amber-600"
            />
            <KpiCardLocal
              icon={MousePointerClick}
              label="Tempo Medio"
              value={scrollAvg}
              sub="tempo na pagina"
              color="text-rose-600"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
              <TabsTrigger value="overview">Visao Geral</TabsTrigger>
              <TabsTrigger value="sources">Fontes & UTMs</TabsTrigger>
              <TabsTrigger value="pages">Paginas</TabsTrigger>
              <TabsTrigger value="geo">Geografia</TabsTrigger>
            </TabsList>

            {/* === Tab: Visao Geral === */}
            <TabsContent value="overview" className="space-y-6">
              {/* Conversion Funnel */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Funil de Conversao</CardTitle>
                </CardHeader>
                <CardContent>
                  {funnelData.length > 0 ? (
                    <div className="flex flex-col md:flex-row items-stretch gap-2">
                      {funnelData.map((step, i) => {
                        const maxVal = Math.max(...funnelData.map((s) => s.value), 1)
                        const width = (step.value / maxVal) * 100
                        const prevVal = i > 0 ? funnelData[i - 1].value : null
                        const dropRate = prevVal && prevVal > 0 ? ((step.value / prevVal) * 100).toFixed(1) : null
                        return (
                          <div key={step.name} className="flex items-center gap-2 flex-1">
                            <div
                              className="rounded-xl p-4 flex-1 text-center border transition-all hover:shadow-md"
                              style={{
                                borderColor: `${CHART_COLORS[i] || CHART_COLORS[0]}40`,
                                backgroundColor: `${CHART_COLORS[i] || CHART_COLORS[0]}08`,
                              }}
                            >
                              <p className="text-2xl font-bold tracking-tight">
                                {formatNumber(step.value)}
                              </p>
                              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-1">
                                {step.name}
                              </p>
                              {dropRate && (
                                <p className="text-[10px] mt-1 font-semibold text-muted-foreground">
                                  {dropRate}% do anterior
                                </p>
                              )}
                            </div>
                            {i < funnelData.length - 1 && (
                              <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0 hidden md:block" />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Sem dados no periodo selecionado.
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Leads Over Time */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Leads ao Longo do Tempo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {leadsOverTime.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-end gap-1 h-44">
                          {leadsOverTime.map((point, i) => {
                            const maxVal = Math.max(...leadsOverTime.map((p) => p.value), 1)
                            const height = (point.value / maxVal) * 100
                            return (
                              <div
                                key={i}
                                className="flex-1 flex flex-col items-center justify-end gap-1 group"
                              >
                                <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                  {point.value}
                                </span>
                                <div
                                  className="w-full rounded-t transition-all group-hover:opacity-80"
                                  style={{
                                    height: `${Math.max(height, 3)}%`,
                                    backgroundColor: CHART_COLORS[0],
                                  }}
                                />
                              </div>
                            )
                          })}
                        </div>
                        <div className="flex gap-1">
                          {leadsOverTime.map((point, i) => (
                            <div key={i} className="flex-1 text-center">
                              <span className="text-[9px] text-muted-foreground">{point.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Sem dados no periodo selecionado.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Channel Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Canais de Aquisicao</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {channelBreakdown.length > 0 ? (
                      <div className="space-y-3">
                        {channelBreakdown.slice(0, 8).map((ch) => {
                          const maxLeads = Math.max(...channelBreakdown.map((c) => c.leads), 1)
                          const width = (ch.leads / maxLeads) * 100
                          return (
                            <div key={ch.channel} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium capitalize">{ch.channel}</span>
                                <span className="text-muted-foreground">
                                  {ch.leads} leads / {ch.conversions} conv.
                                </span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${width}%`,
                                    backgroundColor:
                                      CHANNEL_COLORS[ch.channel.toLowerCase()] || CHART_COLORS[3],
                                  }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Sem dados no periodo selecionado.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Bottom row: Temperature + Devices */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Temperature Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Temperatura dos Leads</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {temperatureDistribution.length > 0 ? (
                      <div className="space-y-3">
                        {temperatureDistribution.map((t) => {
                          const maxCount = Math.max(
                            ...temperatureDistribution.map((d) => d.count),
                            1
                          )
                          const width = (t.count / maxCount) * 100
                          return (
                            <div key={t.temperature} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <Badge
                                  variant="secondary"
                                  style={{
                                    backgroundColor:
                                      TEMPERATURE_COLORS[t.temperature]
                                        ? `${TEMPERATURE_COLORS[t.temperature]}20`
                                        : undefined,
                                    color: TEMPERATURE_COLORS[t.temperature] || undefined,
                                  }}
                                >
                                  {TEMPERATURE_LABELS[t.temperature] || t.temperature}
                                </Badge>
                                <span className="text-muted-foreground">{t.count}</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${width}%`,
                                    backgroundColor:
                                      TEMPERATURE_COLORS[t.temperature] || CHART_COLORS[0],
                                  }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Sem dados no periodo selecionado.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Devices */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Dispositivos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {extra?.devices && extra.devices.length > 0 ? (
                      <div className="space-y-4">
                        {extra.devices.map((d, i) => {
                          const total = extra.devices.reduce((s, v) => s + v.count, 0) || 1
                          const pct = (d.count / total) * 100
                          return (
                            <div key={d.device} className="space-y-1.5">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: CHART_COLORS[i] || CHART_COLORS[0] }}
                                  />
                                  <span className="font-medium">{d.device}</span>
                                </div>
                                <span className="text-muted-foreground">
                                  {formatNumber(d.count)} ({pct.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: CHART_COLORS[i] || CHART_COLORS[0],
                                  }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* === Tab: Fontes & UTMs === */}
            <TabsContent value="sources" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Fontes de Trafego (UTM)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {utmLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : utmData.length > 0 ? (
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="font-semibold">Fonte</TableHead>
                            <TableHead className="font-semibold">Midia</TableHead>
                            <TableHead className="text-right font-semibold">Sessoes</TableHead>
                            <TableHead className="text-right font-semibold">Page Views</TableHead>
                            <TableHead className="text-right font-semibold">Leads</TableHead>
                            <TableHead className="text-right font-semibold">Conv. Rate</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {utmData.slice(0, 20).map((row, i) => (
                            <TableRow key={i} className="hover:bg-muted/20">
                              <TableCell className="font-medium">{row.source}</TableCell>
                              <TableCell className="text-muted-foreground">{row.medium}</TableCell>
                              <TableCell className="text-right">{formatNumber(row.sessions)}</TableCell>
                              <TableCell className="text-right">{formatNumber(row.pageViews)}</TableCell>
                              <TableCell className="text-right font-semibold">{formatNumber(row.leads)}</TableCell>
                              <TableCell className="text-right">
                                <ConvBadge rate={row.convRate} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Sem dados de UTM no periodo selecionado.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* === Tab: Paginas === */}
            <TabsContent value="pages" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Performance por Pagina
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pageLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : pageData.length > 0 ? (
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="font-semibold">Pagina</TableHead>
                            <TableHead className="text-right font-semibold">Views</TableHead>
                            <TableHead className="text-right font-semibold">Sessoes</TableHead>
                            <TableHead className="text-right font-semibold">Leads</TableHead>
                            <TableHead className="text-right font-semibold">Conv. Rate</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pageData.slice(0, 20).map((row, i) => (
                            <TableRow key={i} className="hover:bg-muted/20">
                              <TableCell>
                                <span className="font-mono text-xs">{row.path}</span>
                              </TableCell>
                              <TableCell className="text-right">{formatNumber(row.views)}</TableCell>
                              <TableCell className="text-right">{formatNumber(row.sessions)}</TableCell>
                              <TableCell className="text-right font-semibold">{formatNumber(row.leads)}</TableCell>
                              <TableCell className="text-right">
                                <ConvBadge rate={row.convRate} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Sem dados de paginas no periodo selecionado.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* === Tab: Geografia === */}
            <TabsContent value="geo" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Performance por Estado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {geoLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : geoData.length > 0 ? (
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="font-semibold">Estado</TableHead>
                            <TableHead className="text-right font-semibold">Sessoes</TableHead>
                            <TableHead className="text-right font-semibold">Leads</TableHead>
                            <TableHead className="text-right font-semibold">Conv. Rate</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {geoData.slice(0, 20).map((row, i) => (
                            <TableRow key={i} className="hover:bg-muted/20">
                              <TableCell className="font-medium">{row.state}</TableCell>
                              <TableCell className="text-right">{formatNumber(row.sessions)}</TableCell>
                              <TableCell className="text-right font-semibold">{formatNumber(row.leads)}</TableCell>
                              <TableCell className="text-right">
                                <ConvBadge rate={row.convRate} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Sem dados geograficos no periodo selecionado.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
