// @ts-nocheck
'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Loader2,
  DollarSign,
  TrendingUp,
  Users,
  Target,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { useOrganizationContext } from '@/contexts/organization-context'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Deal {
  id: string
  deal_id: number
  title: string
  value: number
  currency: string
  status: string
  stage_id: number
  stage_name: string
  pipeline_name: string
  person_name: string | null
  person_email: string | null
  person_phone: string | null
  org_name: string | null
  owner_name: string | null
  add_time: string | null
  update_time: string | null
  won_time: string | null
  lost_time: string | null
  lost_reason: string | null
  expected_close_date: string | null
  label: string | null
}

interface Stage {
  stage_id: number
  name: string
  order_nr: number
  pipeline_name: string
}

// --- Formatters ---
function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR')
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  try {
    return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR })
  } catch {
    return dateStr.split('T')[0] || '-'
  }
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-'
  try {
    return format(parseISO(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR })
  } catch {
    return dateStr
  }
}

// --- Status helpers ---
function statusBadge(status: string) {
  switch (status) {
    case 'won':
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Ganho</Badge>
    case 'lost':
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Perdido</Badge>
    case 'open':
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Aberto</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

type DateFilter = 'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'last_month' | 'all'

function getDateRange(filter: DateFilter): { from: Date; to: Date } | null {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (filter) {
    case 'today':
      return { from: today, to: now }
    case 'yesterday': {
      const yesterday = subDays(today, 1)
      return { from: yesterday, to: today }
    }
    case '7d':
      return { from: subDays(today, 6), to: now }
    case '30d':
      return { from: subDays(today, 29), to: now }
    case 'this_month':
      return { from: startOfMonth(today), to: endOfMonth(today) }
    case 'last_month': {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
    }
    case 'all':
      return null
  }
}

export default function PipedriveDashboardPage() {
  const { currentOrg } = useOrganizationContext()
  const orgId = currentOrg?.id

  const [deals, setDeals] = useState<Deal[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [pipelineName, setPipelineName] = useState<string>('Pipedrive')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [stageFilter, setStageFilter] = useState<string>('all')

  const loadData = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const supabase = createClient()

      const [dealsRes, stagesRes] = await Promise.all([
        supabase
          .from('pipedrive_deals')
          .select('*')
          .eq('org_id', orgId)
          .order('update_time', { ascending: false }),
        supabase
          .from('pipedrive_stages')
          .select('*')
          .eq('org_id', orgId)
          .order('order_nr', { ascending: true }),
      ])

      if (dealsRes.error) throw dealsRes.error
      setDeals(dealsRes.data || [])
      // Get pipeline name from first deal or stage
      const name = dealsRes.data?.[0]?.pipeline_name || stagesRes.data?.[0]?.pipeline_name
      if (name) setPipelineName(name)
      setStages(stagesRes.data || [])
    } catch (error) {
      console.error('Erro ao carregar dados Pipedrive:', error)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    if (!orgId) return
    loadData()
  }, [orgId, loadData])

  const handleSync = async () => {
    if (!orgId) return
    setSyncing(true)
    try {
      const res = await fetch('/api/pipedrive/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, syncType: 'full' }),
      })
      const data = await res.json()
      if (data.success) {
        setLastSync(new Date().toLocaleTimeString('pt-BR'))
        await loadData()
      } else {
        console.error('Sync error:', data.error)
      }
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setSyncing(false)
    }
  }

  // --- Filters ---
  const filteredDeals = useMemo(() => {
    let filtered = deals

    // Date filter (based on add_time)
    const range = getDateRange(dateFilter)
    if (range) {
      const fromTime = range.from.getTime()
      const toTime = range.to.getTime()
      filtered = filtered.filter((d) => {
        if (!d.add_time) return false
        try {
          const t = new Date(d.add_time).getTime()
          return t >= fromTime && t <= toTime
        } catch {
          return false
        }
      })
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((d) => d.status === statusFilter)
    }

    // Stage filter
    if (stageFilter !== 'all') {
      filtered = filtered.filter((d) => String(d.stage_id) === stageFilter)
    }

    return filtered
  }, [deals, dateFilter, statusFilter, stageFilter])

  // --- KPIs ---
  const kpis = useMemo(() => {
    const total = filteredDeals.length
    const open = filteredDeals.filter((d) => d.status === 'open')
    const won = filteredDeals.filter((d) => d.status === 'won')
    const lost = filteredDeals.filter((d) => d.status === 'lost')

    const totalValue = filteredDeals.reduce((s, d) => s + Number(d.value || 0), 0)
    const wonValue = won.reduce((s, d) => s + Number(d.value || 0), 0)
    const openValue = open.reduce((s, d) => s + Number(d.value || 0), 0)
    const lostValue = lost.reduce((s, d) => s + Number(d.value || 0), 0)

    const winRate = (won.length + lost.length) > 0
      ? (won.length / (won.length + lost.length)) * 100
      : 0

    const avgTicket = won.length > 0 ? wonValue / won.length : 0

    return {
      total, totalValue,
      open: open.length, openValue,
      won: won.length, wonValue,
      lost: lost.length, lostValue,
      winRate, avgTicket,
    }
  }, [filteredDeals])

  // --- Funnel data (deals by stage) ---
  const funnelData = useMemo(() => {
    const stageMap = new Map<number, { name: string; order: number; count: number; value: number }>()

    // Init with all stages
    stages.forEach((s) => {
      stageMap.set(s.stage_id, { name: s.name, order: s.order_nr, count: 0, value: 0 })
    })

    // Count open deals by stage
    filteredDeals
      .filter((d) => d.status === 'open')
      .forEach((d) => {
        const stage = stageMap.get(d.stage_id)
        if (stage) {
          stage.count++
          stage.value += Number(d.value || 0)
        } else {
          stageMap.set(d.stage_id, {
            name: d.stage_name || `Stage ${d.stage_id}`,
            order: d.stage_id,
            count: 1,
            value: Number(d.value || 0),
          })
        }
      })

    return Array.from(stageMap.values())
      .filter((s) => s.count > 0 || stages.some((st) => st.stage_id))
      .sort((a, b) => a.order - b.order)
  }, [filteredDeals, stages])

  const maxFunnelCount = Math.max(...funnelData.map((s) => s.count), 1)

  // --- Unique stages for filter ---
  const stageOptions = useMemo(() => {
    const map = new Map<string, string>()
    stages.forEach((s) => map.set(String(s.stage_id), s.name))
    deals.forEach((d) => {
      if (!map.has(String(d.stage_id))) {
        map.set(String(d.stage_id), d.stage_name || `Stage ${d.stage_id}`)
      }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [deals, stages])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (deals.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">CRM Funil — {pipelineName}</h2>
            <p className="text-sm text-muted-foreground">{currentOrg?.name}</p>
          </div>
          <Button onClick={handleSync} disabled={syncing}>
            <RefreshCw className={cn('mr-2 h-4 w-4', syncing && 'animate-spin')} />
            {syncing ? 'Sincronizando...' : 'Sincronizar Pipedrive'}
          </Button>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum deal encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Clique em "Sincronizar Pipedrive" para puxar os dados do seu funil.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">CRM Funil — {pipelineName}</h2>
          <p className="text-sm text-muted-foreground">
            {currentOrg?.name} — Pipeline {pipelineName} — {formatNumber(deals.length)} deals
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
          <RefreshCw className={cn('mr-2 h-3.5 w-3.5', syncing && 'animate-spin')} />
          {syncing ? 'Sincronizando...' : 'Sincronizar'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
          <SelectTrigger className="w-[160px] h-9">
            <Clock className="mr-2 h-3.5 w-3.5 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="yesterday">Ontem</SelectItem>
            <SelectItem value="7d">Ultimos 7 dias</SelectItem>
            <SelectItem value="30d">Ultimos 30 dias</SelectItem>
            <SelectItem value="this_month">Este mes</SelectItem>
            <SelectItem value="last_month">Mes passado</SelectItem>
            <SelectItem value="all">Todo periodo</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="mr-2 h-4 w-4 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="open">Abertos</SelectItem>
            <SelectItem value="won">Ganhos</SelectItem>
            <SelectItem value="lost">Perdidos</SelectItem>
          </SelectContent>
        </Select>

        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[200px]">
            <Target className="mr-2 h-4 w-4 shrink-0" />
            <SelectValue placeholder="Todas etapas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas etapas</SelectItem>
            {stageOptions.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filteredDeals.length !== deals.length && (
          <span className="text-xs text-muted-foreground">
            {formatNumber(filteredDeals.length)} de {formatNumber(deals.length)} deals
          </span>
        )}
      </div>

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Deals</p>
                <p className="text-2xl font-bold tracking-tight">{formatNumber(kpis.total)}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(kpis.totalValue)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/50 text-blue-600"><BarChart3 className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Em Aberto</p>
                <p className="text-2xl font-bold tracking-tight">{formatNumber(kpis.open)}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(kpis.openValue)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/50 text-amber-600"><Clock className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ganhos</p>
                <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{formatNumber(kpis.won)}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(kpis.wonValue)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/50 text-emerald-600"><CheckCircle2 className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Win Rate</p>
                <p className="text-2xl font-bold tracking-tight">{kpis.winRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Ticket: {formatCurrency(kpis.avgTicket)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/50 text-purple-600"><TrendingUp className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel visualization */}
      {funnelData.length > 0 && statusFilter !== 'won' && statusFilter !== 'lost' && (
        <Card className="border-0 shadow-md bg-gradient-to-br from-card to-muted/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Funil de Vendas</CardTitle>
            <CardDescription className="text-xs">Deals abertos por etapa — {formatCurrency(kpis.openValue)} em pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {funnelData.map((stage, i) => {
                const pct = Math.max((stage.count / maxFunnelCount) * 100, 6)
                const colors = ['bg-sky-400/20', 'bg-blue-400/20', 'bg-indigo-400/20', 'bg-violet-400/20', 'bg-purple-400/20', 'bg-pink-400/20', 'bg-rose-400/20', 'bg-amber-400/20', 'bg-emerald-400/20']
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-medium w-[160px] truncate text-muted-foreground">{stage.name}</span>
                    <div className="flex-1">
                      <div className={cn('h-8 rounded-lg flex items-center px-3 transition-all', colors[i % colors.length])} style={{ width: `${pct}%` }}>
                        <span className="text-xs font-bold whitespace-nowrap">{stage.count}</span>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground w-[100px] text-right">{formatCurrency(stage.value)}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Origem dos leads (UTM) */}
      {(() => {
        const sourceMap = new Map()
        filteredDeals.forEach(d => {
          const src = d.utm_source || 'Direto / Sem UTM'
          const med = d.utm_medium || ''
          const key = med ? `${src} / ${med}` : src
          const e = sourceMap.get(key) || { source: key, deals: 0, open: 0, won: 0, lost: 0 }
          e.deals++
          if (d.status === 'open') e.open++
          if (d.status === 'won') e.won++
          if (d.status === 'lost') e.lost++
          sourceMap.set(key, e)
        })
        const sources = Array.from(sourceMap.values()).sort((a, b) => b.deals - a.deals)
        const maxDeals = sources[0]?.deals || 1

        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Origem dos Leads</CardTitle>
              <CardDescription>De onde os deals estao vindo (UTM source / medium)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sources.slice(0, 8).map(s => (
                  <div key={s.source} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-[200px] truncate">{s.source}</span>
                    <div className="flex-1">
                      <div className="h-7 bg-blue-500/20 rounded flex items-center px-3" style={{ width: `${Math.max((s.deals / maxDeals) * 100, 8)}%` }}>
                        <span className="text-xs font-semibold">{s.deals} deals</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-[140px] justify-end">
                      <span className="text-xs text-blue-600">{s.open} abertos</span>
                      <span className="text-xs text-green-600">{s.won} ganhos</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* Deals table */}
      <Card>
        <CardHeader>
          <CardTitle>Deals ({formatNumber(filteredDeals.length)})</CardTitle>
          <CardDescription>
            {dateFilter !== 'all' ? 'Filtrado por periodo' : 'Todos os deals do funil'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead>Atualizado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeals.slice(0, 100).map((deal) => (
                <TableRow key={deal.id} className="cursor-pointer hover:bg-muted/50" onClick={() => window.location.href = `/pipedrive/${deal.deal_id}`}>
                  <TableCell className="font-medium max-w-[200px]">
                    <span className="block break-words text-blue-600 dark:text-blue-400 hover:underline" title={deal.title}>
                      {deal.title}
                    </span>
                    {deal.owner_name && (
                      <span className="text-xs text-muted-foreground">{deal.owner_name}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {deal.person_name || '-'}
                      {deal.person_email && (
                        <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {deal.person_email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{deal.org_name || '-'}</TableCell>
                  <TableCell>
                    <span className="text-sm">{deal.stage_name || '-'}</span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {Number(deal.value) > 0 ? formatCurrency(Number(deal.value)) : '-'}
                  </TableCell>
                  <TableCell>{statusBadge(deal.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(deal.add_time)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(deal.update_time)}
                  </TableCell>
                </TableRow>
              ))}
              {filteredDeals.length > 100 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Mostrando 100 de {formatNumber(filteredDeals.length)} deals
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Lost reasons */}
      {kpis.lost > 0 && statusFilter !== 'open' && statusFilter !== 'won' && (
        <Card>
          <CardHeader>
            <CardTitle>Motivos de Perda</CardTitle>
            <CardDescription>{kpis.lost} deals perdidos — {formatCurrency(kpis.lostValue)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(() => {
                const reasons = new Map<string, { count: number; value: number }>()
                filteredDeals
                  .filter((d) => d.status === 'lost')
                  .forEach((d) => {
                    const reason = d.lost_reason || 'Sem motivo informado'
                    const existing = reasons.get(reason) || { count: 0, value: 0 }
                    existing.count++
                    existing.value += Number(d.value || 0)
                    reasons.set(reason, existing)
                  })
                return Array.from(reasons.entries())
                  .sort((a, b) => b[1].count - a[1].count)
                  .map(([reason, data]) => (
                    <div key={reason} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <span className="text-sm font-medium">{reason}</span>
                        <span className="text-xs text-muted-foreground ml-2">({data.count}x)</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{formatCurrency(data.value)}</span>
                    </div>
                  ))
              })()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
