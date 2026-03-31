'use client'

import { useMemo, useState, useRef } from 'react'
import {
  Users,
  Mail,
  FileText,
  Send,
  BarChart3,
  CalendarDays,
  Megaphone,
  TrendingUp,
  Zap,
  Plus,
  UserPlus,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Star,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  subDays,
  parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatDistanceToNow } from 'date-fns'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDashboard } from '@/hooks/use-dashboard'
import { SetupChecklist } from '@/components/shared/setup-checklist'
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_COLORS,
} from '@/lib/constants'
import type { PeriodRange } from '@/lib/supabase/dashboard'

// ========== Helpers ==========

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toLocaleString('pt-BR')
}

function calcConversion(current: number, previous: number): string {
  if (previous === 0) return '0%'
  return `${((current / previous) * 100).toFixed(1)}%`
}

function calcChange(current: number, previous: number): { pct: string; direction: 'up' | 'down' | 'neutral'; diff: number } {
  const diff = current - previous
  if (previous === 0 && current === 0) return { pct: '0%', direction: 'neutral', diff: 0 }
  if (previous === 0) return { pct: '+100%', direction: 'up', diff }
  const pctChange = ((diff / previous) * 100).toFixed(1)
  if (diff > 0) return { pct: `+${pctChange}%`, direction: 'up', diff }
  if (diff < 0) return { pct: `${pctChange}%`, direction: 'down', diff }
  return { pct: '0%', direction: 'neutral', diff: 0 }
}

function getPeriodRange(periodKey: string): PeriodRange {
  const now = new Date()
  let from: Date, to: Date, prevFrom: Date, prevTo: Date

  switch (periodKey) {
    case 'last_month': {
      const lastMonth = subMonths(now, 1)
      from = startOfMonth(lastMonth)
      to = endOfMonth(lastMonth)
      const twoMonthsAgo = subMonths(now, 2)
      prevFrom = startOfMonth(twoMonthsAgo)
      prevTo = endOfMonth(twoMonthsAgo)
      break
    }
    case 'last_7': {
      from = subDays(now, 6)
      to = now
      prevFrom = subDays(now, 13)
      prevTo = subDays(now, 7)
      break
    }
    case 'last_30': {
      from = subDays(now, 29)
      to = now
      prevFrom = subDays(now, 59)
      prevTo = subDays(now, 30)
      break
    }
    case 'all': {
      from = new Date('2020-01-01')
      to = now
      prevFrom = new Date('2019-01-01')
      prevTo = new Date('2019-12-31')
      break
    }
    default: {
      // this_month
      from = startOfMonth(now)
      to = now
      const lastMonth = subMonths(now, 1)
      prevFrom = startOfMonth(lastMonth)
      prevTo = endOfMonth(lastMonth)
      break
    }
  }

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    prevFrom: prevFrom.toISOString(),
    prevTo: prevTo.toISOString(),
  }
}

const PERIOD_LABELS: Record<string, string> = {
  this_month: 'Este mes',
  last_month: 'Mes passado',
  last_7: 'Ultimos 7 dias',
  last_30: 'Ultimos 30 dias',
  all: 'Todo periodo',
}

// ========== Funnel Card Component ==========

function FunnelCard({
  label,
  value,
  conversionRate,
  change,
  borderColor,
  showArrow = false,
}: {
  label: string
  value: number
  conversionRate?: string
  change: { pct: string; direction: 'up' | 'down' | 'neutral'; diff: number }
  borderColor: string
  showArrow?: boolean
}) {
  return (
    <div className="flex items-center">
      {showArrow && (
        <div className="flex-shrink-0 mx-1 text-muted-foreground/40">
          <ChevronRight className="h-5 w-5" />
        </div>
      )}
      <Card className={`flex-1 border-t-4 ${borderColor}`}>
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold tracking-tight">{formatNumber(value)}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {conversionRate && (
              <Badge variant="secondary" className="text-xs font-medium">
                {conversionRate}
              </Badge>
            )}
            <span className={`text-xs font-medium ${
              change.direction === 'up' ? 'text-emerald-600' :
              change.direction === 'down' ? 'text-red-500' :
              'text-muted-foreground'
            }`}>
              {change.direction === 'up' && '\u2191'}
              {change.direction === 'down' && '\u2193'}
              {' '}{change.pct}
              {change.diff !== 0 && ` (${change.diff > 0 ? '+' : ''}${change.diff})`}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ========== MetricCard (reused for existing sections) ==========

function MetricCard({
  label,
  value,
  icon: Icon,
  href,
  color = 'text-primary',
  subtitle,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  href?: string
  color?: string
  subtitle?: string
}) {
  const content = (
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className={`p-2.5 rounded-xl bg-muted/50 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href}>
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-5">{content}</CardContent>
        </Card>
      </Link>
    )
  }

  return (
    <Card>
      <CardContent className="p-5">{content}</CardContent>
    </Card>
  )
}

// ========== Main Page ==========

export default function DashboardPage() {
  const [periodKey, setPeriodKey] = useState('this_month')
  const period = useMemo(() => getPeriodRange(periodKey), [periodKey])
  const { data, loading } = useDashboard(period)
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Chart data: merge current + prev daily leads by day-of-month
  const chartData = useMemo(() => {
    if (!data) return []
    const current = data.dailyLeads || []
    const prev = data.prevDailyLeads || []

    // Build map by day number (01..31)
    const dayMap = new Map<string, { day: string; atual: number; anterior: number }>()

    for (const entry of current) {
      const dayNum = entry.date.slice(8, 10) // DD
      const existing = dayMap.get(dayNum) || { day: dayNum, atual: 0, anterior: 0 }
      existing.atual = entry.cumulative
      dayMap.set(dayNum, existing)
    }

    for (const entry of prev) {
      const dayNum = entry.date.slice(8, 10)
      const existing = dayMap.get(dayNum) || { day: dayNum, atual: 0, anterior: 0 }
      existing.anterior = entry.cumulative
      dayMap.set(dayNum, existing)
    }

    // Fill in missing days for a smooth chart
    const allDays = Array.from(dayMap.values()).sort((a, b) => a.day.localeCompare(b.day))

    // Forward-fill cumulative values
    let lastAtual = 0
    let lastAnterior = 0
    for (const d of allDays) {
      if (d.atual === 0 && lastAtual > 0) d.atual = lastAtual
      else lastAtual = d.atual
      if (d.anterior === 0 && lastAnterior > 0) d.anterior = lastAnterior
      else lastAnterior = d.anterior
    }

    return allDays
  }, [data])

  const totalNewLeads = data?.dailyLeads?.reduce((acc, d) => acc + d.count, 0) || 0

  const scrollCards = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -280 : 280
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-72" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-5"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    )
  }

  const leadsInPeriod = (data?.dailyLeads || []).reduce((acc, d) => acc + d.count, 0)

  // Funnel data
  const funnelSteps = [
    {
      label: 'Impressoes',
      value: data?.impressions ?? 0,
      prevValue: data?.prevImpressions ?? 0,
      borderColor: 'border-t-blue-500',
    },
    {
      label: 'Leads',
      value: leadsInPeriod,
      prevValue: data?.prevLeads ?? 0,
      borderColor: 'border-t-green-500',
      conversionFrom: data?.impressions ?? 0,
    },
    {
      label: 'Leads Qualificados',
      value: data?.qualifiedLeads ?? 0,
      prevValue: data?.prevQualifiedLeads ?? 0,
      borderColor: 'border-t-yellow-500',
      conversionFrom: leadsInPeriod,
    },
    {
      label: 'Oportunidades',
      value: data?.opportunities ?? 0,
      prevValue: data?.prevOpportunities ?? 0,
      borderColor: 'border-t-orange-500',
      conversionFrom: data?.qualifiedLeads ?? 0,
    },
    {
      label: 'Vendas',
      value: data?.sales ?? 0,
      prevValue: data?.prevSales ?? 0,
      borderColor: 'border-t-emerald-600',
      conversionFrom: data?.opportunities ?? 0,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header + Period Filter */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Painel Geral</h2>
          <p className="text-sm text-muted-foreground">
            Ultima atualizacao em: {format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={periodKey} onValueChange={setPeriodKey}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PERIOD_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button size="sm" asChild>
              <Link href="/campaigns/new"><Plus className="h-4 w-4 mr-1" /> Nova Campanha</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/growth/chat"><TrendingUp className="h-4 w-4 mr-1" /> Growth IA</Link>
            </Button>
          </div>
        </div>
      </div>

      <SetupChecklist />

      {/* ===== Funnel KPIs (5 cards with arrows) ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-0">
        {funnelSteps.map((step, idx) => (
          <FunnelCard
            key={step.label}
            label={step.label}
            value={step.value}
            borderColor={step.borderColor}
            showArrow={idx > 0}
            conversionRate={idx > 0 && step.conversionFrom !== undefined
              ? calcConversion(step.value, step.conversionFrom)
              : undefined
            }
            change={calcChange(step.value, step.prevValue)}
          />
        ))}
      </div>

      {data?.salesValue ? (
        <div className="text-sm text-muted-foreground">
          Valor total de vendas no periodo: <span className="font-semibold text-foreground">{formatCurrency(data.salesValue)}</span>
        </div>
      ) : null}

      {/* ===== Leads Over Time Chart ===== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{totalNewLeads} novos leads</CardTitle>
          <CardDescription className="text-xs">
            Evolucao acumulada de leads — periodo atual vs anterior
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorAtual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAnterior" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#9ca3af" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="day"
                  className="text-xs"
                  tick={{ fill: 'currentColor', fontSize: 11 }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: 'currentColor', fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => [
                    value,
                    name === 'atual' ? 'Periodo atual' : 'Periodo anterior',
                  ]}
                  labelFormatter={(label) => `Dia ${label}`}
                />
                <Legend
                  formatter={(value) => value === 'atual' ? 'Periodo atual' : 'Periodo anterior'}
                  wrapperStyle={{ fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="anterior"
                  stroke="#9ca3af"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorAnterior)"
                  strokeDasharray="4 4"
                />
                <Area
                  type="monotone"
                  dataKey="atual"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorAtual)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              Nenhum dado de leads no periodo selecionado
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== Origem dos Leads (bar chart) ===== */}
      {data?.leadsBySource && data.leadsBySource.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Origem dos Leads</CardTitle>
                <CardDescription className="text-xs">De onde seus leads estao chegando</CardDescription>
              </div>
              <Link href="/leads" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                Ver leads <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.leadsBySource.slice(0, 8).map((s) => {
                const maxCount = data.leadsBySource[0]?.count || 1
                const pct = Math.max((s.count / maxCount) * 100, 6)
                const sourceLabels: Record<string, { label: string; color: string }> = {
                  facebook: { label: 'Facebook Ads', color: 'bg-blue-500/20 text-blue-700' },
                  google: { label: 'Google Ads', color: 'bg-red-500/20 text-red-700' },
                  ig: { label: 'Instagram', color: 'bg-pink-500/20 text-pink-700' },
                  instagram: { label: 'Instagram', color: 'bg-pink-500/20 text-pink-700' },
                  pipedrive: { label: 'Pipedrive', color: 'bg-green-500/20 text-green-700' },
                  csv: { label: 'Importacao CSV', color: 'bg-gray-500/20 text-gray-700' },
                  form: { label: 'Formulario', color: 'bg-purple-500/20 text-purple-700' },
                  api: { label: 'API/Webhook', color: 'bg-orange-500/20 text-orange-700' },
                  manychat: { label: 'ManyChat', color: 'bg-cyan-500/20 text-cyan-700' },
                  direto: { label: 'Direto', color: 'bg-slate-500/20 text-slate-700' },
                }
                const info = sourceLabels[s.source] || { label: s.source, color: 'bg-muted text-muted-foreground' }
                return (
                  <div key={s.source} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-[140px] truncate">{info.label}</span>
                    <div className="flex-1">
                      <div className={`h-7 rounded-md flex items-center px-3 ${info.color}`} style={{ width: `${pct}%` }}>
                        <span className="text-xs font-semibold whitespace-nowrap">{s.count}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-[50px] text-right">
                      {((s.count / (data?.totalLeads || 1)) * 100).toFixed(1)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== Ultimas Conversoes de Leads (horizontal scroll) ===== */}
      {data?.latestLeads && data.latestLeads.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Ultimas Conversoes de Leads</CardTitle>
                <CardDescription className="text-xs">Leads mais recentes que entraram na base</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => scrollCards('left')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => scrollCards('right')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Link href="/leads" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 ml-2">
                  Visualizar todos <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div
              ref={scrollRef}
              className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted"
              style={{ scrollbarWidth: 'thin' }}
            >
              {data.latestLeads.map((lead) => {
                const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email
                return (
                  <div
                    key={lead.id}
                    className="flex-shrink-0 w-[260px] p-4 rounded-xl border bg-card hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/leads/${lead.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-semibold truncate max-w-[200px]">{name}</p>
                      {lead.company && (
                        <Star className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0 ml-1" />
                      )}
                    </div>
                    {lead.position && (
                      <p className="text-xs text-muted-foreground truncate mb-1">{lead.position}</p>
                    )}
                    <p className="text-xs text-muted-foreground truncate mb-2">
                      {lead.source || 'Direto'}
                      {lead.company && ` — ${lead.company}`}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70">
                      {format(parseISO(lead.created_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== Last LP + Last Email (2 columns) ===== */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ultima Landing Page */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ultima Landing Page</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.lastLP ? (
              <div>
                <Link href={`/landing-pages/${data.lastLP.id}`} className="text-sm font-semibold text-primary hover:underline">
                  {data.lastLP.title}
                </Link>
                <p className="text-xs text-muted-foreground mt-1">
                  Criada em {format(parseISO(data.lastLP.created_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
                </p>
                <div className="flex gap-8 mt-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{formatNumber(data.lastLP.visits)}</p>
                    <p className="text-xs text-muted-foreground">Visitantes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{formatNumber(data.lastLP.leads)}</p>
                    <p className="text-xs text-muted-foreground">Leads</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma LP criada ainda</p>
            )}
          </CardContent>
        </Card>

        {/* Ultimo Email Marketing */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ultimo Email Marketing</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.lastEmailCampaign ? (
              <div>
                <Link href={`/campaigns`} className="text-sm font-semibold text-primary hover:underline">
                  {data.lastEmailCampaign.name}
                </Link>
                <p className="text-xs text-muted-foreground mt-1">
                  Criado em {format(parseISO(data.lastEmailCampaign.created_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
                </p>
                <div className="flex gap-4 mt-4">
                  {[
                    { label: 'Enviados', value: data.lastEmailCampaign.sent, color: 'text-blue-600' },
                    { label: 'Entregues', value: data.lastEmailCampaign.delivered, color: 'text-green-600', pct: data.lastEmailCampaign.sent > 0 ? Math.round((data.lastEmailCampaign.delivered / data.lastEmailCampaign.sent) * 100) : 0 },
                    { label: 'Abertos', value: data.lastEmailCampaign.opened, color: 'text-purple-600', pct: data.lastEmailCampaign.delivered > 0 ? Math.round((data.lastEmailCampaign.opened / data.lastEmailCampaign.delivered) * 100) : 0 },
                    { label: 'Clicados', value: data.lastEmailCampaign.clicked, color: 'text-orange-600', pct: data.lastEmailCampaign.delivered > 0 ? Math.round((data.lastEmailCampaign.clicked / data.lastEmailCampaign.delivered) * 100) : 0 },
                  ].map(m => (
                    <div key={m.label} className="text-center flex-1">
                      <p className={`text-lg font-bold ${m.color}`}>{formatNumber(m.value)}</p>
                      {m.pct !== undefined && m.pct > 0 && <p className="text-[10px] text-muted-foreground">{m.pct}%</p>}
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma campanha enviada ainda</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== Paginas Mais Acessadas ===== */}
      {data?.topPages && data.topPages.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Paginas Mais Acessadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-xs font-medium text-muted-foreground uppercase">Paginas</span>
                <span className="text-xs font-medium text-muted-foreground uppercase">Visualizacoes</span>
              </div>
              {data.topPages.map((page, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                  <span className="text-sm truncate max-w-[70%]">{page.path}</span>
                  <span className="text-sm font-semibold">{formatNumber(page.views)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== Quick Actions ===== */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Adicionar Lead', href: '/leads/new', icon: UserPlus },
          { label: 'Gerar Conteudo', href: '/content-calendar', icon: Sparkles },
          { label: 'Criar Template', href: '/templates/new', icon: FileText },
          { label: 'Criar Anuncio', href: '/ads', icon: Megaphone },
          { label: 'Nova Automacao', href: '/automations/new', icon: Zap },
          { label: 'Estrategia', href: '/marketing', icon: BarChart3 },
        ].map(action => (
          <Button key={action.href} size="sm" variant="ghost" className="h-8 text-xs" asChild>
            <Link href={action.href}>
              <action.icon className="h-3 w-3 mr-1" /> {action.label}
            </Link>
          </Button>
        ))}
      </div>

      {/* ===== Recent Activity - 2 columns ===== */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Campaigns */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Campanhas Recentes</CardTitle>
              <Link href="/campaigns" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                Ver todas <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data?.recentCampaigns && data.recentCampaigns.length > 0 ? (
              <div className="space-y-2">
                {data.recentCampaigns.slice(0, 5).map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/campaigns/${campaign.id}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                        <Send className="h-4 w-4 text-violet-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{campaign.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(campaign.sent_at || campaign.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <Badge className={CAMPAIGN_STATUS_COLORS[campaign.status] || ''} variant="secondary">
                      {CAMPAIGN_STATUS_LABELS[campaign.status] || campaign.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Send className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma campanha ainda</p>
                <Button size="sm" variant="outline" className="mt-3" asChild>
                  <Link href="/campaigns/new"><Plus className="h-3 w-3 mr-1" /> Criar primeira campanha</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Leads Recentes</CardTitle>
              <Link href="/leads" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                Ver todos <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data?.recentLeads && data.recentLeads.length > 0 ? (
              <div className="space-y-2">
                {data.recentLeads.slice(0, 5).map((lead) => {
                  const name = lead.first_name || lead.last_name
                    ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
                    : lead.email
                  return (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/leads/${lead.id}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{name}</p>
                          {name !== lead.email && (
                            <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum lead ainda</p>
                <Button size="sm" variant="outline" className="mt-3" asChild>
                  <Link href="/leads/new"><UserPlus className="h-3 w-3 mr-1" /> Adicionar lead</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
