'use client'

import { useState, useMemo } from 'react'
import {
  Users,
  Activity,
  UserPlus,
  Target,
  TrendingUp,
  DollarSign,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { KpiCard } from '@/components/shared/kpi-card'
import {
  useTrackingKPIs,
  useTrackingCharts,
  useTrackingExtra,
} from '@/hooks/tracking'
import {
  TRACKING_ORGANIZATIONS,
  getAllOrgTables,
  getTrackingOrgById,
} from '@/lib/tracking/organizations'
import type { OrgTables } from '@/lib/tracking/organizations'
// DateRange from types includes 'custom', but we only use 7d/30d/90d here
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
} from '@/lib/tracking/constants'

type DateRangeOption = '7d' | '30d' | '90d'

const DATE_RANGE_OPTIONS: { label: string; value: DateRangeOption }[] = [
  { label: '7 dias', value: '7d' },
  { label: '30 dias', value: '30d' },
  { label: '90 dias', value: '90d' },
]

const ORG_OPTIONS = [
  { id: 'all', name: 'Todas' },
  ...TRACKING_ORGANIZATIONS.map((o) => ({ id: o.id, name: o.name })),
]

export default function TrackingPage() {
  const [dateRange, setDateRange] = useState<DateRangeOption>('30d')
  const [selectedOrg, setSelectedOrg] = useState('all')

  const { startDate, endDate } = useMemo(() => getDateRange(dateRange), [dateRange])

  const orgTablesList: OrgTables[] = useMemo(() => {
    if (selectedOrg === 'all') return getAllOrgTables()
    const org = getTrackingOrgById(selectedOrg)
    return org ? [org.tables] : getAllOrgTables()
  }, [selectedOrg])

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tracking & Analytics</h2>
          <p className="text-muted-foreground">
            Acompanhe visitantes, leads e conversoes em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Organization selector */}
          <div className="flex gap-1 border rounded-md p-0.5">
            {ORG_OPTIONS.map((org) => (
              <Button
                key={org.id}
                variant={selectedOrg === org.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedOrg(org.id)}
                className="text-xs h-7"
              >
                {org.name}
              </Button>
            ))}
          </div>
          {/* Date range selector */}
          <div className="flex gap-1 border rounded-md p-0.5">
            {DATE_RANGE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={dateRange === opt.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDateRange(opt.value)}
                className="text-xs h-7"
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              icon={Users}
              label="Visitantes"
              value={formatNumber(kpis?.totalVisitors ?? 0)}
            />
            <KpiCard
              icon={Activity}
              label="Sessoes"
              value={formatNumber(kpis?.totalSessions ?? 0)}
            />
            <KpiCard
              icon={UserPlus}
              label="Leads"
              value={formatNumber(kpis?.totalLeads ?? 0)}
            />
            <KpiCard
              icon={Target}
              label="Conversoes"
              value={formatNumber(kpis?.totalConversions ?? 0)}
            />
            <KpiCard
              icon={TrendingUp}
              label="Taxa Conversao"
              value={formatPercent(kpis?.conversionRate ?? 0)}
            />
            <KpiCard
              icon={DollarSign}
              label="Receita"
              value={formatCurrency(kpis?.totalRevenue ?? 0)}
            />
          </div>

          {/* 2x2 Chart Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Leads Over Time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Leads ao Longo do Tempo</CardTitle>
              </CardHeader>
              <CardContent>
                {leadsOverTime.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-end gap-1 h-40">
                      {leadsOverTime.map((point, i) => {
                        const maxVal = Math.max(...leadsOverTime.map((p) => p.value), 1)
                        const height = (point.value / maxVal) * 100
                        return (
                          <div
                            key={i}
                            className="flex-1 flex flex-col items-center justify-end gap-1"
                          >
                            <span className="text-[10px] text-muted-foreground">
                              {point.value}
                            </span>
                            <div
                              className="w-full rounded-t"
                              style={{
                                height: `${Math.max(height, 2)}%`,
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

            {/* Funnel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Funil de Conversao</CardTitle>
              </CardHeader>
              <CardContent>
                {funnelData.length > 0 ? (
                  <div className="space-y-3">
                    {funnelData.map((step, i) => {
                      const maxVal = Math.max(...funnelData.map((s) => s.value), 1)
                      const width = (step.value / maxVal) * 100
                      return (
                        <div key={step.name} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{step.name}</span>
                            <span className="text-muted-foreground">
                              {formatNumber(step.value)}
                            </span>
                          </div>
                          <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.max(width, 1)}%`,
                                backgroundColor: CHART_COLORS[i] || CHART_COLORS[0],
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

          {/* Bottom 3-col */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Device Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dispositivos</CardTitle>
              </CardHeader>
              <CardContent>
                {extra?.devices && extra.devices.length > 0 ? (
                  <div className="space-y-3">
                    {extra.devices.map((d, i) => {
                      const total = extra.devices.reduce((s, v) => s + v.count, 0) || 1
                      const pct = ((d.count / total) * 100).toFixed(1)
                      return (
                        <div key={d.device} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: CHART_COLORS[i] || CHART_COLORS[0] }}
                            />
                            <span>{d.device}</span>
                          </div>
                          <span className="text-muted-foreground">
                            {formatNumber(d.count)} ({pct}%)
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Sem dados.</p>
                )}
              </CardContent>
            </Card>

            {/* Geo by State */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Estados</CardTitle>
              </CardHeader>
              <CardContent>
                {extra?.geoStates && extra.geoStates.length > 0 ? (
                  <div className="space-y-2">
                    {extra.geoStates.slice(0, 8).map((g, i) => (
                      <div
                        key={g.state}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{g.state}</span>
                        <span className="text-muted-foreground">{formatNumber(g.count)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Sem dados.</p>
                )}
              </CardContent>
            </Card>

            {/* Top Pages */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Paginas</CardTitle>
              </CardHeader>
              <CardContent>
                {extra?.topPages && extra.topPages.length > 0 ? (
                  <div className="space-y-2">
                    {extra.topPages.slice(0, 8).map((p) => (
                      <div
                        key={p.path}
                        className="flex items-center justify-between text-sm gap-2"
                      >
                        <span className="truncate flex-1 font-mono text-xs">{p.path}</span>
                        <span className="text-muted-foreground whitespace-nowrap">
                          {formatNumber(p.count)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Sem dados.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
