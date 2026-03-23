// @ts-nocheck
'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Loader2,
  ArrowLeft,
  FlaskConical,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Trophy,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Copy,
  Check,
  X,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// --- Types ---
interface CreativeRanking {
  name: string
  adId: string
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  cpl: number
  spend: number
  leads: number
  convRate: number
  deals: number
  won: number
  lost: number
  winRate: number
  score: number
  imageUrl: string
}

interface ABTest {
  title: string
  creativeA: string
  creativeB: string
  hypothesis: string
  variations: string[]
  budgetRecommendation: string
  expectedImpact: string
  priority: string
}

interface Variation {
  headline: string
  primaryText: string
  cta: string
  rationale: string
}

// --- Formatters ---
function fmt$(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtN(v: number): string {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
  return v.toLocaleString('pt-BR')
}

function fmtPct(v: number): string {
  return `${v.toFixed(2)}%`
}

// --- Score helpers ---
function calcPerformanceScore(ctr: number, convRate: number, winRate: number): number {
  // Normalize each metric to 0-1 range (using reasonable benchmarks)
  const nCtr = Math.min(ctr / 5, 1) // 5% CTR = max
  const nConv = Math.min(convRate / 15, 1) // 15% conv rate = max
  const nWin = Math.min(winRate / 60, 1) // 60% win rate = max
  return (nCtr * 0.2 + nConv * 0.3 + nWin * 0.5) * 100
}

function scoreColor(score: number, max: number): string {
  const pct = max > 0 ? score / max : 0
  if (pct >= 0.7) return 'text-emerald-600 dark:text-emerald-400'
  if (pct >= 0.4) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function scoreBg(score: number, max: number): string {
  const pct = max > 0 ? score / max : 0
  if (pct >= 0.7) return 'bg-emerald-500/10'
  if (pct >= 0.4) return 'bg-amber-500/10'
  return 'bg-red-500/10'
}

function priorityColor(p: string): string {
  if (p === 'alta') return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  if (p === 'media') return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
  return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
}

// --- Sort ---
type SortKey = 'name' | 'score' | 'ctr' | 'cpl' | 'convRate' | 'winRate' | 'spend' | 'leads' | 'deals' | 'won'
type SortDir = 'asc' | 'desc'

// ==================== MAIN COMPONENT ====================
export default function ABTestingPage() {
  const { currentOrg } = useOrganizationContext()
  const orgId = currentOrg?.id
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [adInsights, setAdInsights] = useState<any[]>([])
  const [adsMeta, setAdsMeta] = useState<any[]>([])
  const [deals, setDeals] = useState<any[]>([])

  // AI suggestions
  const [suggestions, setSuggestions] = useState<ABTest[]>([])
  const [generalInsights, setGeneralInsights] = useState<string[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)

  // Variation dialog
  const [variationDialog, setVariationDialog] = useState(false)
  const [variationCreative, setVariationCreative] = useState('')
  const [variations, setVariations] = useState<Variation[]>([])
  const [variationLoading, setVariationLoading] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // --- Load data ---
  const loadData = useCallback(async () => {
    if (!orgId) { setLoading(false); return }
    setLoading(true)
    try {
      const sb = createClient()
      const [ai, am, d] = await Promise.all([
        sb.from('meta_ad_insights').select('*').eq('org_id', orgId).range(0, 1999),
        sb.from('meta_ads').select('*').eq('org_id', orgId).range(0, 999),
        sb.from('pipedrive_deals').select('*').eq('org_id', orgId).order('add_time', { ascending: false }).range(0, 1999),
      ])
      setAdInsights(ai.data || [])
      setAdsMeta(am.data || [])
      setDeals(d.data || [])
    } catch (e) {
      console.error('AB Testing loadData error:', e)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => { if (orgId) loadData() }, [orgId, loadData])

  // --- Maps ---
  const adMetaMap = useMemo(() => {
    const m = new Map()
    adsMeta.forEach(a => m.set(a.ad_id, a))
    return m
  }, [adsMeta])

  // --- CRM creative map (via utm_term) ---
  const crmByCreative = useMemo(() => {
    const map = new Map<string, { deals: number; won: number; lost: number; wonValue: number }>()
    deals.forEach(d => {
      const term = d.utm_term
      if (!term || term === '{{ad.name}}') return
      const e = map.get(term) || { deals: 0, won: 0, lost: 0, wonValue: 0 }
      e.deals++
      if (d.status === 'won') { e.won++; e.wonValue += Number(d.value || 0) }
      if (d.status === 'lost') e.lost++
      map.set(term, e)
    })
    return map
  }, [deals])

  // --- Build creative ranking ---
  const creativeRanking: CreativeRanking[] = useMemo(() => {
    const map = new Map<string, CreativeRanking>()

    adInsights.forEach(row => {
      const meta = adMetaMap.get(row.ad_id)
      const name = meta?.name || row.ad_id
      const existing = map.get(name) || {
        name,
        adId: row.ad_id,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        cpc: 0,
        cpl: 0,
        spend: 0,
        leads: 0,
        convRate: 0,
        deals: 0,
        won: 0,
        lost: 0,
        winRate: 0,
        score: 0,
        imageUrl: meta?.image_url || '',
      }
      existing.spend += Number(row.spend)
      existing.impressions += Number(row.impressions)
      existing.clicks += Number(row.clicks)
      existing.leads += Number(row.leads)
      if (!existing.imageUrl && meta?.image_url) existing.imageUrl = meta.image_url
      map.set(name, existing)
    })

    // Calculate derived metrics + CRM data
    map.forEach((c, name) => {
      c.ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0
      c.cpc = c.clicks > 0 ? c.spend / c.clicks : 0
      c.cpl = c.leads > 0 ? c.spend / c.leads : 0
      c.convRate = c.clicks > 0 ? (c.leads / c.clicks) * 100 : 0

      // CRM data via utm_term match
      const crm = crmByCreative.get(name)
      if (crm) {
        c.deals = crm.deals
        c.won = crm.won
        c.lost = crm.lost
        c.winRate = (crm.won + crm.lost) > 0 ? (crm.won / (crm.won + crm.lost)) * 100 : 0
      }

      c.score = calcPerformanceScore(c.ctr, c.convRate, c.winRate)
    })

    return Array.from(map.values())
  }, [adInsights, adMetaMap, crmByCreative])

  // --- Sorted ranking ---
  const sortedRanking = useMemo(() => {
    const arr = [...creativeRanking]
    arr.sort((a, b) => {
      const aVal = a[sortKey] ?? 0
      const bVal = b[sortKey] ?? 0
      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal)
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
    })
    return arr
  }, [creativeRanking, sortKey, sortDir])

  const maxScore = useMemo(() => Math.max(...creativeRanking.map(c => c.score), 1), [creativeRanking])

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

  // --- Generate AI suggestions ---
  const handleGenerateSuggestions = async () => {
    if (sortedRanking.length === 0) {
      toast({ title: 'Sem dados', description: 'Nenhum criativo encontrado para analisar.', variant: 'destructive' })
      return
    }
    setSuggestionsLoading(true)
    try {
      const res = await fetch('/api/ads/ab-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatives: sortedRanking.slice(0, 10).map(c => ({
            name: c.name,
            ctr: c.ctr,
            cpl: c.cpl,
            convRate: c.convRate,
            winRate: c.winRate,
            score: c.score,
            spend: c.spend,
            leads: c.leads,
            deals: c.deals,
            won: c.won,
          })),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSuggestions(data.tests || [])
        setGeneralInsights(data.generalInsights || [])
      } else {
        toast({ title: 'Erro', description: data.error || 'Erro ao gerar sugestoes', variant: 'destructive' })
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setSuggestionsLoading(false)
    }
  }

  // --- Generate variation ---
  const handleGenerateVariation = async (creativeName: string) => {
    setVariationCreative(creativeName)
    setVariations([])
    setVariationDialog(true)
    setVariationLoading(true)
    try {
      const res = await fetch('/api/ads/ab-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'variation', creativeName }),
      })
      const data = await res.json()
      if (data.success) {
        setVariations(data.variations || [])
      } else {
        toast({ title: 'Erro', description: data.error || 'Erro ao gerar variacoes', variant: 'destructive' })
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setVariationLoading(false)
    }
  }

  const handleCopyVariation = (idx: number, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
    toast({ title: 'Copiado!', description: 'Texto copiado para a area de transferencia.' })
  }

  // --- Stats ---
  const stats = useMemo(() => {
    const total = creativeRanking.length
    const withDeals = creativeRanking.filter(c => c.deals > 0).length
    const withWins = creativeRanking.filter(c => c.won > 0).length
    const avgScore = total > 0 ? creativeRanking.reduce((s, c) => s + c.score, 0) / total : 0
    const topPerformer = sortedRanking[0]
    return { total, withDeals, withWins, avgScore, topPerformer }
  }, [creativeRanking, sortedRanking])

  // --- Loading state ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando dados de criativos...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/ads/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-violet-500" />
              <h2 className="text-2xl font-bold tracking-tight">A/B Testing & Analise de Criativos</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {currentOrg?.name} — Ranking de performance com dados de Ads + CRM
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Criativos</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
            <p className="text-xs text-muted-foreground">{stats.withDeals} com deals no CRM</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Score Medio</p>
            <p className="text-2xl font-bold mt-1">{stats.avgScore.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">de 100 pontos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Top Performer</p>
            <p className="text-lg font-bold mt-1 truncate" title={stats.topPerformer?.name}>
              {stats.topPerformer?.name ? (stats.topPerformer.name.length > 25 ? stats.topPerformer.name.slice(0, 25) + '...' : stats.topPerformer.name) : '-'}
            </p>
            <p className="text-xs text-muted-foreground">Score: {stats.topPerformer?.score?.toFixed(1) || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Conversoes CRM</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{stats.withWins}</p>
            <p className="text-xs text-muted-foreground">criativos com vendas ganhas</p>
          </CardContent>
        </Card>
      </div>

      {/* Creative Performance Ranking Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Ranking de Performance dos Criativos
              </CardTitle>
              <CardDescription>
                Metricas de Ads + CRM combinadas — Score = (CTR x 0.2 + Conv x 0.3 + WinRate x 0.5)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sortedRanking.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FlaskConical className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">Nenhum criativo encontrado</p>
              <p className="text-xs mt-1">Sincronize os dados do Meta Ads primeiro</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-8 text-center text-xs">#</TableHead>
                    <TableHead className="min-w-[220px]">
                      <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-foreground text-xs">
                        Criativo <SortIcon column="name" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right text-xs">
                      <button onClick={() => handleSort('spend')} className="flex items-center gap-1 ml-auto hover:text-foreground">
                        Invest. <SortIcon column="spend" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right text-xs">Impr.</TableHead>
                    <TableHead className="text-right text-xs">Cliques</TableHead>
                    <TableHead className="text-right text-xs">
                      <button onClick={() => handleSort('ctr')} className="flex items-center gap-1 ml-auto hover:text-foreground">
                        CTR <SortIcon column="ctr" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right text-xs">CPC</TableHead>
                    <TableHead className="text-right text-xs">
                      <button onClick={() => handleSort('leads')} className="flex items-center gap-1 ml-auto hover:text-foreground">
                        Leads <SortIcon column="leads" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right text-xs">
                      <button onClick={() => handleSort('cpl')} className="flex items-center gap-1 ml-auto hover:text-foreground">
                        CPL <SortIcon column="cpl" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right text-xs">
                      <button onClick={() => handleSort('convRate')} className="flex items-center gap-1 ml-auto hover:text-foreground">
                        Conv. <SortIcon column="convRate" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right text-xs">
                      <button onClick={() => handleSort('deals')} className="flex items-center gap-1 ml-auto hover:text-foreground">
                        Deals <SortIcon column="deals" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right text-xs">
                      <button onClick={() => handleSort('won')} className="flex items-center gap-1 ml-auto hover:text-foreground">
                        Won <SortIcon column="won" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right text-xs">
                      <button onClick={() => handleSort('winRate')} className="flex items-center gap-1 ml-auto hover:text-foreground">
                        Win% <SortIcon column="winRate" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right text-xs w-[80px]">
                      <button onClick={() => handleSort('score')} className="flex items-center gap-1 ml-auto hover:text-foreground font-semibold">
                        Score <SortIcon column="score" />
                      </button>
                    </TableHead>
                    <TableHead className="text-center text-xs w-[90px]">Acao</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRanking.map((c, idx) => {
                    const rank = idx + 1
                    return (
                      <TableRow key={c.name} className={cn('group', rank <= 3 && 'bg-emerald-500/5')}>
                        <TableCell className="text-center">
                          {rank <= 3 ? (
                            <span className={cn(
                              'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
                              rank === 1 && 'bg-amber-500 text-white',
                              rank === 2 && 'bg-gray-400 text-white',
                              rank === 3 && 'bg-amber-700 text-white',
                            )}>
                              {rank}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">{rank}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {c.imageUrl && (
                              <img
                                src={c.imageUrl}
                                alt=""
                                className="w-8 h-8 rounded object-cover flex-shrink-0"
                              />
                            )}
                            <span className="text-sm font-medium truncate max-w-[200px]" title={c.name}>
                              {c.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm">{fmt$(c.spend)}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{fmtN(c.impressions)}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{fmtN(c.clicks)}</TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            'text-xs font-medium px-1.5 py-0.5 rounded',
                            c.ctr >= 2 ? 'bg-emerald-500/10 text-emerald-600' :
                            c.ctr >= 1 ? 'bg-amber-500/10 text-amber-600' :
                            'bg-red-500/10 text-red-600'
                          )}>
                            {fmtPct(c.ctr)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm">{fmt$(c.cpc)}</TableCell>
                        <TableCell className="text-right">
                          {c.leads > 0 ? (
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{c.leads}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {c.cpl > 0 ? (
                            <span className={cn(
                              'text-xs font-medium',
                              c.cpl <= 50 ? 'text-emerald-600' :
                              c.cpl <= 80 ? 'text-amber-600' :
                              'text-red-600'
                            )}>
                              {fmt$(c.cpl)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {c.convRate > 0 ? (
                            <span className={cn(
                              'text-xs font-medium px-1.5 py-0.5 rounded',
                              c.convRate >= 5 ? 'bg-emerald-500/10 text-emerald-600' :
                              c.convRate >= 2 ? 'bg-amber-500/10 text-amber-600' :
                              'bg-red-500/10 text-red-600'
                            )}>
                              {fmtPct(c.convRate)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {c.deals > 0 ? c.deals : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          {c.won > 0 ? (
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{c.won}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {c.winRate > 0 ? (
                            <span className={cn(
                              'text-xs font-medium px-1.5 py-0.5 rounded',
                              c.winRate >= 40 ? 'bg-emerald-500/10 text-emerald-600' :
                              c.winRate >= 20 ? 'bg-amber-500/10 text-amber-600' :
                              'bg-red-500/10 text-red-600'
                            )}>
                              {fmtPct(c.winRate)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={cn('inline-flex items-center justify-center rounded-md px-2 py-1', scoreBg(c.score, maxScore))}>
                            <span className={cn('text-sm font-bold', scoreColor(c.score, maxScore))}>
                              {c.score.toFixed(1)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 px-2"
                            onClick={() => handleGenerateVariation(c.name)}
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            Variar
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Suggestions Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Sugestoes de Teste A/B com IA
              </CardTitle>
              <CardDescription>
                Analise inteligente dos seus criativos para encontrar oportunidades de otimizacao
              </CardDescription>
            </div>
            <Button
              onClick={handleGenerateSuggestions}
              disabled={suggestionsLoading || sortedRanking.length === 0}
              className="gap-2"
            >
              {suggestionsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {suggestionsLoading ? 'Analisando...' : 'Gerar Sugestoes de Teste A/B'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {suggestions.length === 0 && generalInsights.length === 0 && !suggestionsLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Lightbulb className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">Clique no botao acima para gerar sugestoes de testes A/B</p>
              <p className="text-xs mt-1">A IA vai analisar seus top criativos e sugerir experimentos</p>
            </div>
          )}

          {suggestionsLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analisando criativos e gerando sugestoes...</p>
            </div>
          )}

          {/* General Insights */}
          {generalInsights.length > 0 && (
            <div className="mb-6 p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Insights Gerais
              </h4>
              <ul className="space-y-2">
                {generalInsights.map((insight, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5 flex-shrink-0">*</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Test Suggestions */}
          {suggestions.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {suggestions.map((test, i) => (
                <Card key={i} className="border-l-4 border-l-violet-500">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-sm font-semibold">{test.title}</h4>
                      <Badge className={cn('text-xs', priorityColor(test.priority))}>
                        {test.priority}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="font-mono">A</Badge>
                        <span className="truncate" title={test.creativeA}>{test.creativeA}</span>
                        <span className="text-muted-foreground">vs</span>
                        <Badge variant="outline" className="font-mono">B</Badge>
                        <span className="truncate" title={test.creativeB}>{test.creativeB}</span>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Hipotese:</p>
                        <p className="text-sm">{test.hypothesis}</p>
                      </div>

                      {test.variations && test.variations.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Variacoes sugeridas:</p>
                          <ul className="space-y-1">
                            {test.variations.map((v, vi) => (
                              <li key={vi} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <span className="text-violet-500 mt-0.5">-</span>
                                {v}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground">Budget recomendado</p>
                          <p className="text-xs font-medium">{test.budgetRecommendation}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Impacto esperado</p>
                          <p className="text-xs font-medium">{test.expectedImpact}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Variation Dialog */}
      <Dialog open={variationDialog} onOpenChange={setVariationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              Variacoes de Copy — {variationCreative.length > 40 ? variationCreative.slice(0, 40) + '...' : variationCreative}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {variationLoading && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Gerando variacoes com IA...</p>
              </div>
            )}

            {!variationLoading && variations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Nao foi possivel gerar variacoes</p>
              </div>
            )}

            {variations.map((v, i) => (
              <Card key={i} className="relative">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge className="bg-violet-500/10 text-violet-600 border-0">
                      Variacao {i + 1}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleCopyVariation(i, `Titulo: ${v.headline}\nTexto: ${v.primaryText}\nCTA: ${v.cta}`)}
                    >
                      {copiedIdx === i ? (
                        <Check className="h-3 w-3 mr-1 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      {copiedIdx === i ? 'Copiado!' : 'Copiar'}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Titulo:</p>
                      <p className="text-sm font-semibold">{v.headline}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Texto principal:</p>
                      <p className="text-sm">{v.primaryText}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">CTA:</p>
                        <Badge variant="outline">{v.cta}</Badge>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs font-medium text-muted-foreground">Racional:</p>
                      <p className="text-xs text-muted-foreground italic">{v.rationale}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVariationDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
