// @ts-nocheck
'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Loader2,
  DollarSign,
  Eye,
  Users,
  MousePointerClick,
  Target,
  BarChart3,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  TrendingUp,
  RefreshCw,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts'
import { Button } from '@/components/ui/button'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useOrganizationContext } from '@/contexts/organization-context'
import { createClient } from '@/lib/supabase/client'
import { DateRangePicker, type DateRange } from '@/components/ads/date-range-picker'
import Link from 'next/link'
import { format, subDays, isWithinInterval, differenceInDays, subMilliseconds } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface CampaignInsight {
  id: string
  campaign_id: string
  campaign_name: string
  date: string
  impressions: number
  reach: number
  clicks: number
  link_clicks: number
  spend: number
  cpc: number
  cpm: number
  ctr: number
  leads: number
  cost_per_lead: number
  frequency: number
}

// --- Formatters ---
function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatCompactCurrency(value: number): string {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`
  }
  return formatCurrency(value)
}

function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return value.toLocaleString('pt-BR')
}

function formatFullNumber(value: number): string {
  return value.toLocaleString('pt-BR')
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

// --- Helpers ---
function parseDate(dateStr: string): Date {
  const d = new Date(dateStr + 'T12:00:00')
  d.setHours(0, 0, 0, 0)
  return d
}

function calcChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null
  return ((current - previous) / previous) * 100
}

// --- KPI Card ---
function KpiCard({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  iconColor,
  invertChange = false,
}: {
  title: string
  value: string
  subtitle?: string
  change: number | null
  icon: any
  iconColor: string
  invertChange?: boolean
}) {
  const isPositive = change !== null && (invertChange ? change < 0 : change > 0)
  const isNegative = change !== null && (invertChange ? change > 0 : change < 0)

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={cn('p-2 rounded-lg', iconColor)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
        {change !== null && (
          <div className="mt-3 flex items-center gap-1">
            {isPositive && <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />}
            {isNegative && <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />}
            {!isPositive && !isNegative && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className={cn(
              'text-xs font-medium',
              isPositive && 'text-emerald-500',
              isNegative && 'text-red-500',
              !isPositive && !isNegative && 'text-muted-foreground'
            )}>
              {change > 0 ? '+' : ''}{change.toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground ml-1">vs período anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Chart Tooltip ---
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 py-0.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">
            {entry.name === 'Investimento' || entry.name === 'CPL'
              ? formatCurrency(entry.value)
              : formatFullNumber(entry.value)
            }
          </span>
        </div>
      ))}
    </div>
  )
}

// --- Sort types ---
type SortKey = 'campaign_name' | 'spend' | 'impressions' | 'clicks' | 'ctr' | 'leads' | 'cpl'
type SortDir = 'asc' | 'desc'

// ==================== MAIN COMPONENT ====================
export default function AdsDashboardPage() {
  const { currentOrg } = useOrganizationContext()
  const orgId = currentOrg?.id

  const [insights, setInsights] = useState<CampaignInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [campaignFilter, setCampaignFilter] = useState('all')
  const [chartMetric, setChartMetric] = useState<'spend' | 'leads' | 'clicks' | 'cpl'>('spend')
  const [sortKey, setSortKey] = useState<SortKey>('spend')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Date range - default last 30 days
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return { from: subDays(today, 29), to: today }
  })

  useEffect(() => {
    if (!orgId) return
    loadInsights()
  }, [orgId])

  const loadInsights = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('meta_campaign_insights')
        .select('*')
        .eq('org_id', orgId)
        .order('date', { ascending: false })

      if (error) throw error
      setInsights(data || [])
    } catch (error) {
      console.error('Erro ao carregar insights:', error)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadInsights()
    setRefreshing(false)
  }

  const handleSync = async () => {
    if (!orgId) return
    setSyncing(true)
    try {
      const res = await fetch('/api/meta-ads/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          daysBack: 30,
          syncLevels: ['campaigns'],
        }),
      })
      const data = await res.json()
      if (data.success) {
        setLastSync(new Date().toLocaleTimeString('pt-BR'))
        await loadInsights()
      } else {
        console.error('Sync error:', data.error)
      }
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setSyncing(false)
    }
  }

  // Filter by date range
  const filteredByDate = useMemo(() => {
    return insights.filter((i) => {
      const d = parseDate(i.date)
      return isWithinInterval(d, { start: dateRange.from, end: dateRange.to })
    })
  }, [insights, dateRange])

  // Filter by campaign
  const filteredInsights = useMemo(() => {
    if (campaignFilter === 'all') return filteredByDate
    return filteredByDate.filter((i) => i.campaign_name === campaignFilter)
  }, [filteredByDate, campaignFilter])

  // Previous period data for comparison
  const previousPeriodInsights = useMemo(() => {
    const days = differenceInDays(dateRange.to, dateRange.from) + 1
    const prevTo = subDays(dateRange.from, 1)
    const prevFrom = subDays(prevTo, days - 1)

    let filtered = insights.filter((i) => {
      const d = parseDate(i.date)
      return isWithinInterval(d, { start: prevFrom, end: prevTo })
    })
    if (campaignFilter !== 'all') {
      filtered = filtered.filter((i) => i.campaign_name === campaignFilter)
    }
    return filtered
  }, [insights, dateRange, campaignFilter])

  // Available campaigns in current date range
  const campaigns = useMemo(() => {
    const names = Array.from(new Set(filteredByDate.map((i) => i.campaign_name)))
    return names.sort()
  }, [filteredByDate])

  // KPIs current period
  const kpis = useMemo(() => {
    const totalSpend = filteredInsights.reduce((s, i) => s + Number(i.spend), 0)
    const totalImpressions = filteredInsights.reduce((s, i) => s + Number(i.impressions), 0)
    const totalClicks = filteredInsights.reduce((s, i) => s + Number(i.clicks), 0)
    const totalReach = filteredInsights.reduce((s, i) => s + Number(i.reach), 0)
    const totalLeads = filteredInsights.reduce((s, i) => s + Number(i.leads), 0)
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    const avgCPL = totalLeads > 0 ? totalSpend / totalLeads : 0
    const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0
    return { totalSpend, totalImpressions, totalClicks, totalReach, totalLeads, avgCTR, avgCPL, avgCPC }
  }, [filteredInsights])

  // KPIs previous period
  const prevKpis = useMemo(() => {
    const totalSpend = previousPeriodInsights.reduce((s, i) => s + Number(i.spend), 0)
    const totalImpressions = previousPeriodInsights.reduce((s, i) => s + Number(i.impressions), 0)
    const totalClicks = previousPeriodInsights.reduce((s, i) => s + Number(i.clicks), 0)
    const totalLeads = previousPeriodInsights.reduce((s, i) => s + Number(i.leads), 0)
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    const avgCPL = totalLeads > 0 ? totalSpend / totalLeads : 0
    return { totalSpend, totalImpressions, totalClicks, totalLeads, avgCTR, avgCPL }
  }, [previousPeriodInsights])

  // Daily data for chart
  const dailyData = useMemo(() => {
    const map = new Map<string, { date: string; spend: number; leads: number; clicks: number; impressions: number; cpl: number }>()

    filteredInsights.forEach((i) => {
      const existing = map.get(i.date) || { date: i.date, spend: 0, leads: 0, clicks: 0, impressions: 0, cpl: 0 }
      existing.spend += Number(i.spend)
      existing.leads += Number(i.leads)
      existing.clicks += Number(i.clicks)
      existing.impressions += Number(i.impressions)
      map.set(i.date, existing)
    })

    const arr = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
    // Calculate CPL per day
    arr.forEach((d) => {
      d.cpl = d.leads > 0 ? d.spend / d.leads : 0
    })
    // Format date labels
    return arr.map((d) => ({
      ...d,
      label: format(parseDate(d.date), 'dd/MM', { locale: ptBR }),
    }))
  }, [filteredInsights])

  // Campaign summary with sorting
  const campaignSummary = useMemo(() => {
    const map = new Map<string, {
      campaign_name: string
      spend: number
      impressions: number
      clicks: number
      reach: number
      leads: number
      days: number
      ctr: number
      cpl: number
    }>()

    filteredInsights.forEach((i) => {
      const existing = map.get(i.campaign_name) || {
        campaign_name: i.campaign_name,
        spend: 0, impressions: 0, clicks: 0, reach: 0, leads: 0, days: 0, ctr: 0, cpl: 0,
      }
      existing.spend += Number(i.spend)
      existing.impressions += Number(i.impressions)
      existing.clicks += Number(i.clicks)
      existing.reach += Number(i.reach)
      existing.leads += Number(i.leads)
      existing.days += 1
      map.set(i.campaign_name, existing)
    })

    const arr = Array.from(map.values())
    // Calculate derived metrics
    arr.forEach((c) => {
      c.ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0
      c.cpl = c.leads > 0 ? c.spend / c.leads : 0
    })

    // Sort
    arr.sort((a, b) => {
      const aVal = a[sortKey] ?? 0
      const bVal = b[sortKey] ?? 0
      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal)
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
    })

    return arr
  }, [filteredInsights, sortKey, sortDir])

  // Max spend for progress bars
  const maxCampaignSpend = useMemo(() => {
    return Math.max(...campaignSummary.map((c) => c.spend), 1)
  }, [campaignSummary])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ChevronDown className="h-3 w-3 opacity-30" />
    return sortDir === 'desc'
      ? <ChevronDown className="h-3 w-3" />
      : <ChevronUp className="h-3 w-3" />
  }

  // Chart config
  const chartConfig = {
    spend: { label: 'Investimento', color: '#3b82f6', format: formatCurrency },
    leads: { label: 'Leads', color: '#10b981', format: formatFullNumber },
    clicks: { label: 'Cliques', color: '#8b5cf6', format: formatFullNumber },
    cpl: { label: 'CPL', color: '#f59e0b', format: formatCurrency },
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando dados...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/ads">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Dashboard Meta Ads</h2>
            <p className="text-sm text-muted-foreground">
              {currentOrg?.name} — Performance das campanhas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={cn('mr-2 h-3.5 w-3.5', syncing && 'animate-spin')} />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <div className="w-[320px]">
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger>
              <Target className="mr-2 h-4 w-4 shrink-0" />
              <SelectValue placeholder="Todas as campanhas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as campanhas ({campaigns.length})</SelectItem>
              {campaigns.map((c) => (
                <SelectItem key={c} value={c}>
                  {c.length > 50 ? c.substring(0, 50) + '...' : c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {filteredInsights.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {filteredInsights.length} registros · {format(dateRange.from, 'dd/MM', { locale: ptBR })} a {format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}
          </span>
        )}
      </div>

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <KpiCard
          title="Investimento"
          value={formatCurrency(kpis.totalSpend)}
          subtitle={`CPC: ${formatCurrency(kpis.avgCPC)}`}
          change={calcChange(kpis.totalSpend, prevKpis.totalSpend)}
          icon={DollarSign}
          iconColor="bg-amber-500"
          invertChange
        />
        <KpiCard
          title="Leads"
          value={formatFullNumber(kpis.totalLeads)}
          subtitle={`CPL: ${formatCurrency(kpis.avgCPL)}`}
          change={calcChange(kpis.totalLeads, prevKpis.totalLeads)}
          icon={Users}
          iconColor="bg-emerald-500"
        />
        <KpiCard
          title="Taxa de Conversao"
          value={kpis.totalClicks > 0 ? formatPercent((kpis.totalLeads / kpis.totalClicks) * 100) : '0%'}
          subtitle="Leads / Cliques"
          change={null}
          icon={TrendingUp}
          iconColor="bg-teal-500"
        />
        <KpiCard
          title="Impressões"
          value={formatNumber(kpis.totalImpressions)}
          subtitle={`Alcance: ${formatNumber(kpis.totalReach)}`}
          change={calcChange(kpis.totalImpressions, prevKpis.totalImpressions)}
          icon={Eye}
          iconColor="bg-blue-500"
        />
        <KpiCard
          title="Cliques"
          value={formatFullNumber(kpis.totalClicks)}
          subtitle={`CTR: ${formatPercent(kpis.avgCTR)}`}
          change={calcChange(kpis.totalClicks, prevKpis.totalClicks)}
          icon={MousePointerClick}
          iconColor="bg-violet-500"
        />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Tendência Diária</CardTitle>
              <CardDescription>
                {chartConfig[chartMetric].label} por dia no período
              </CardDescription>
            </div>
            <div className="flex gap-1">
              {(Object.keys(chartConfig) as Array<keyof typeof chartConfig>).map((key) => (
                <Button
                  key={key}
                  variant={chartMetric === key ? 'default' : 'ghost'}
                  size="sm"
                  className="text-xs h-7 px-3"
                  onClick={() => setChartMetric(key)}
                >
                  {chartConfig[key].label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {dailyData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BarChart3 className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">Sem dados para o período selecionado</p>
            </div>
          ) : (
            <div className="h-[320px] mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartConfig[chartMetric].color} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={chartConfig[chartMetric].color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    dy={8}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => chartMetric === 'spend' || chartMetric === 'cpl' ? formatCompactCurrency(v) : formatNumber(v)}
                    width={65}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey={chartMetric}
                    name={chartConfig[chartMetric].label}
                    stroke={chartConfig[chartMetric].color}
                    strokeWidth={2}
                    fill="url(#colorMetric)"
                    dot={{ r: 3, strokeWidth: 2, fill: 'white' }}
                    activeDot={{ r: 5, strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Performance por Campanha</CardTitle>
          <CardDescription>
            {campaignSummary.length} campanha{campaignSummary.length !== 1 ? 's' : ''} no período
          </CardDescription>
        </CardHeader>
        <CardContent>
          {campaignSummary.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Target className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">Nenhuma campanha encontrada no período</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[250px]">
                      <button onClick={() => handleSort('campaign_name')} className="flex items-center gap-1 hover:text-foreground">
                        Campanha <SortIcon column="campaign_name" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right w-[140px]">
                      <button onClick={() => handleSort('spend')} className="flex items-center gap-1 ml-auto hover:text-foreground">
                        Investimento <SortIcon column="spend" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right w-[110px]">
                      <button onClick={() => handleSort('impressions')} className="flex items-center gap-1 ml-auto hover:text-foreground">
                        Impressões <SortIcon column="impressions" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right w-[90px]">
                      <button onClick={() => handleSort('clicks')} className="flex items-center gap-1 ml-auto hover:text-foreground">
                        Cliques <SortIcon column="clicks" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right w-[80px]">
                      <button onClick={() => handleSort('ctr')} className="flex items-center gap-1 ml-auto hover:text-foreground">
                        CTR <SortIcon column="ctr" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right w-[80px]">
                      <span className="text-xs">Conv.</span>
                    </TableHead>
                    <TableHead className="text-right w-[80px]">
                      <button onClick={() => handleSort('leads')} className="flex items-center gap-1 ml-auto hover:text-foreground">
                        Leads <SortIcon column="leads" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right w-[100px]">
                      <button onClick={() => handleSort('cpl')} className="flex items-center gap-1 ml-auto hover:text-foreground">
                        CPL <SortIcon column="cpl" />
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaignSummary.map((c) => (
                    <TableRow key={c.campaign_name} className="group">
                      <TableCell>
                        <div className="space-y-1.5">
                          <span className="font-medium text-sm block break-words" title={c.campaign_name}>
                            {c.campaign_name}
                          </span>
                          {/* Spend progress bar */}
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${(c.spend / maxCampaignSpend) * 100}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(c.spend)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatNumber(c.impressions)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatFullNumber(c.clicks)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          'text-xs font-medium px-1.5 py-0.5 rounded',
                          c.ctr >= 2 ? 'bg-emerald-500/10 text-emerald-600' :
                          c.ctr >= 1 ? 'bg-amber-500/10 text-amber-600' :
                          'bg-red-500/10 text-red-600'
                        )}>
                          {formatPercent(c.ctr)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {c.clicks > 0 && c.leads > 0 ? (
                          <span className={cn(
                            'text-xs font-medium px-1.5 py-0.5 rounded',
                            (c.leads / c.clicks) * 100 >= 5 ? 'bg-emerald-500/10 text-emerald-600' :
                            (c.leads / c.clicks) * 100 >= 2 ? 'bg-amber-500/10 text-amber-600' :
                            'bg-red-500/10 text-red-600'
                          )}>
                            {formatPercent((c.leads / c.clicks) * 100)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.leads > 0 ? (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {c.leads}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.cpl > 0 ? (
                          <span className={cn(
                            'text-sm font-medium',
                            c.cpl <= 50 ? 'text-emerald-600' :
                            c.cpl <= 80 ? 'text-amber-600' :
                            'text-red-600'
                          )}>
                            {formatCurrency(c.cpl)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="bg-muted/50 font-semibold border-t-2">
                    <TableCell className="text-sm">
                      TOTAL ({campaignSummary.length} campanhas)
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(kpis.totalSpend)}</TableCell>
                    <TableCell className="text-right">{formatNumber(kpis.totalImpressions)}</TableCell>
                    <TableCell className="text-right">{formatFullNumber(kpis.totalClicks)}</TableCell>
                    <TableCell className="text-right">
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-muted">
                        {formatPercent(kpis.avgCTR)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-muted">
                        {kpis.totalClicks > 0 ? formatPercent((kpis.totalLeads / kpis.totalClicks) * 100) : '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                      {kpis.totalLeads}
                    </TableCell>
                    <TableCell className="text-right">
                      {kpis.avgCPL > 0 ? formatCurrency(kpis.avgCPL) : '—'}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily breakdown when single campaign is selected */}
      {campaignFilter !== 'all' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detalhamento Diário</CardTitle>
            <CardDescription>
              {campaignFilter.length > 60 ? campaignFilter.substring(0, 60) + '...' : campaignFilter}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Investimento</TableHead>
                  <TableHead className="text-right">Impressões</TableHead>
                  <TableHead className="text-right">Cliques</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">CPL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInsights
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">
                        {format(parseDate(i.date), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(i.spend))}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatFullNumber(Number(i.impressions))}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatFullNumber(Number(i.clicks))}</TableCell>
                      <TableCell className="text-right">{formatPercent(Number(i.ctr))}</TableCell>
                      <TableCell className="text-right">
                        {Number(i.leads) > 0 ? (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{i.leads}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(i.cost_per_lead) > 0 ? formatCurrency(Number(i.cost_per_lead)) : '—'}
                      </TableCell>
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
