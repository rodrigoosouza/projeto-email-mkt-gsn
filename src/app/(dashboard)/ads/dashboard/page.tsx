'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  Users,
  MousePointerClick,
  Target,
  BarChart3,
  Calendar,
  ArrowLeft,
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
import { useOrganizationContext } from '@/contexts/organization-context'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

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

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR')
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

export default function AdsDashboardPage() {
  const { currentOrg } = useOrganizationContext()
  const orgId = currentOrg?.id

  const [insights, setInsights] = useState<CampaignInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState('all')
  const [campaignFilter, setCampaignFilter] = useState('all')

  useEffect(() => {
    if (!orgId) return
    loadInsights()
  }, [orgId])

  async function loadInsights() {
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
  }

  // Filtros
  const dates = useMemo(() => {
    const uniqueDates = Array.from(new Set(insights.map((i) => i.date))).sort().reverse()
    return uniqueDates
  }, [insights])

  const campaigns = useMemo(() => {
    const uniqueCampaigns = Array.from(new Set(insights.map((i) => i.campaign_name)))
    return uniqueCampaigns.sort()
  }, [insights])

  const filteredInsights = useMemo(() => {
    let filtered = insights
    if (dateFilter !== 'all') {
      filtered = filtered.filter((i) => i.date === dateFilter)
    }
    if (campaignFilter !== 'all') {
      filtered = filtered.filter((i) => i.campaign_name === campaignFilter)
    }
    return filtered
  }, [insights, dateFilter, campaignFilter])

  // KPIs agregados
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

  // Dados por campanha (agrupados)
  const campaignSummary = useMemo(() => {
    const map = new Map<string, {
      campaign_name: string
      spend: number
      impressions: number
      clicks: number
      reach: number
      leads: number
      days: number
    }>()

    filteredInsights.forEach((i) => {
      const existing = map.get(i.campaign_name) || {
        campaign_name: i.campaign_name,
        spend: 0,
        impressions: 0,
        clicks: 0,
        reach: 0,
        leads: 0,
        days: 0,
      }
      existing.spend += Number(i.spend)
      existing.impressions += Number(i.impressions)
      existing.clicks += Number(i.clicks)
      existing.reach += Number(i.reach)
      existing.leads += Number(i.leads)
      existing.days += 1
      map.set(i.campaign_name, existing)
    })

    return Array.from(map.values()).sort((a, b) => b.spend - a.spend)
  }, [filteredInsights])

  // Dados por dia (para o grafico de tendencia)
  const dailyTrend = useMemo(() => {
    const map = new Map<string, { date: string; spend: number; leads: number; clicks: number; impressions: number }>()

    const filtered = campaignFilter !== 'all'
      ? insights.filter((i) => i.campaign_name === campaignFilter)
      : insights

    filtered.forEach((i) => {
      const existing = map.get(i.date) || { date: i.date, spend: 0, leads: 0, clicks: 0, impressions: 0 }
      existing.spend += Number(i.spend)
      existing.leads += Number(i.leads)
      existing.clicks += Number(i.clicks)
      existing.impressions += Number(i.impressions)
      map.set(i.date, existing)
    })

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [insights, campaignFilter])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const maxSpend = Math.max(...dailyTrend.map((d) => d.spend), 1)
  const maxLeads = Math.max(...dailyTrend.map((d) => d.leads), 1)

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
            <h2 className="text-2xl font-bold tracking-tight">Dashboard ADS</h2>
            <p className="text-muted-foreground">
              Performance das campanhas Meta Ads em tempo real
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={loadInsights}>
          <BarChart3 className="mr-2 h-4 w-4" />
          Atualizar Dados
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <div className="w-[220px]">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger>
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filtrar por dia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os dias</SelectItem>
              {dates.map((date) => (
                <SelectItem key={date} value={date}>
                  {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 max-w-[500px]">
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger>
              <Target className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filtrar por campanha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as campanhas</SelectItem>
              {campaigns.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Investimento Total</p>
                <p className="text-2xl font-bold">{formatCurrency(kpis.totalSpend)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Leads Gerados</p>
                <p className="text-2xl font-bold">{formatNumber(kpis.totalLeads)}</p>
                {kpis.avgCPL > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    CPL: {formatCurrency(kpis.avgCPL)}
                  </p>
                )}
              </div>
              <Users className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Impressoes</p>
                <p className="text-2xl font-bold">{formatNumber(kpis.totalImpressions)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Alcance: {formatNumber(kpis.totalReach)}
                </p>
              </div>
              <Eye className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cliques</p>
                <p className="text-2xl font-bold">{formatNumber(kpis.totalClicks)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  CTR: {formatPercent(kpis.avgCTR)} | CPC: {formatCurrency(kpis.avgCPC)}
                </p>
              </div>
              <MousePointerClick className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grafico de tendencia diaria (CSS bars) */}
      <Card>
        <CardHeader>
          <CardTitle>Tendencia Diaria</CardTitle>
          <CardDescription>
            Investimento e leads por dia
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dailyTrend.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Sem dados para exibir</p>
          ) : (
            <div className="space-y-1">
              {/* Header */}
              <div className="flex items-center text-xs text-muted-foreground mb-2">
                <span className="w-[80px]">Data</span>
                <span className="flex-1">Investimento</span>
                <span className="w-[80px] text-right">Leads</span>
                <span className="w-[100px] text-right">Gasto</span>
              </div>
              {dailyTrend.map((day) => (
                <div key={day.date} className="flex items-center gap-2 py-1">
                  <span className="text-xs text-muted-foreground w-[80px] shrink-0">
                    {new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </span>
                  <div className="flex-1 flex items-center gap-1">
                    <div
                      className="h-6 bg-blue-500/20 rounded-sm flex items-center"
                      style={{ width: `${Math.max((day.spend / maxSpend) * 100, 2)}%` }}
                    >
                      <div
                        className="h-6 bg-green-500/60 rounded-sm"
                        style={{ width: `${maxLeads > 0 ? Math.max((day.leads / maxLeads) * 100, 0) : 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium w-[80px] text-right">
                    {day.leads > 0 ? (
                      <span className="text-green-600 dark:text-green-400">{day.leads}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground w-[100px] text-right">
                    {formatCurrency(day.spend)}
                  </span>
                </div>
              ))}
              {/* Legenda */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-500/20 rounded-sm" />
                  <span>Investimento</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500/60 rounded-sm" />
                  <span>Leads</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela por campanha */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por Campanha</CardTitle>
          <CardDescription>
            {dateFilter !== 'all'
              ? `Dados de ${new Date(dateFilter + 'T12:00:00').toLocaleDateString('pt-BR')}`
              : 'Dados acumulados do periodo'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {campaignSummary.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum dado encontrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campanha</TableHead>
                  <TableHead className="text-right">Investimento</TableHead>
                  <TableHead className="text-right">Impressoes</TableHead>
                  <TableHead className="text-right">Cliques</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">CPL</TableHead>
                  <TableHead className="text-right">Dias</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignSummary.map((c) => {
                  const ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0
                  const cpl = c.leads > 0 ? c.spend / c.leads : 0
                  return (
                    <TableRow key={c.campaign_name}>
                      <TableCell className="font-medium max-w-[300px]">
                        <span className="block truncate" title={c.campaign_name}>
                          {c.campaign_name}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(c.spend)}</TableCell>
                      <TableCell className="text-right">{formatNumber(c.impressions)}</TableCell>
                      <TableCell className="text-right">{formatNumber(c.clicks)}</TableCell>
                      <TableCell className="text-right">{formatPercent(ctr)}</TableCell>
                      <TableCell className="text-right">
                        {c.leads > 0 ? (
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            {c.leads}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {cpl > 0 ? formatCurrency(cpl) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {c.days}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {/* Totais */}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right">{formatCurrency(kpis.totalSpend)}</TableCell>
                  <TableCell className="text-right">{formatNumber(kpis.totalImpressions)}</TableCell>
                  <TableCell className="text-right">{formatNumber(kpis.totalClicks)}</TableCell>
                  <TableCell className="text-right">{formatPercent(kpis.avgCTR)}</TableCell>
                  <TableCell className="text-right text-green-600 dark:text-green-400">
                    {kpis.totalLeads}
                  </TableCell>
                  <TableCell className="text-right">
                    {kpis.avgCPL > 0 ? formatCurrency(kpis.avgCPL) : '-'}
                  </TableCell>
                  <TableCell className="text-right">{filteredInsights.length}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dados diarios detalhados */}
      {dateFilter === 'all' && campaignFilter !== 'all' && (
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento Diario</CardTitle>
            <CardDescription>
              {campaignFilter}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Investimento</TableHead>
                  <TableHead className="text-right">Impressoes</TableHead>
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
                      <TableCell>
                        {new Date(i.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(i.spend))}</TableCell>
                      <TableCell className="text-right">{formatNumber(Number(i.impressions))}</TableCell>
                      <TableCell className="text-right">{formatNumber(Number(i.clicks))}</TableCell>
                      <TableCell className="text-right">{formatPercent(Number(i.ctr))}</TableCell>
                      <TableCell className="text-right">
                        {Number(i.leads) > 0 ? (
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            {i.leads}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(i.cost_per_lead) > 0 ? formatCurrency(Number(i.cost_per_lead)) : '-'}
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
