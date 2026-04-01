// @ts-nocheck
'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Loader2, DollarSign, TrendingUp, Users, Target, MousePointerClick,
  Eye, ArrowRight, Clock, CheckCircle2, RefreshCw,
  Image, Layers, Video, BarChart3, ArrowDown, Percent,
  Globe, Monitor, Smartphone, Tablet, MapPin, Zap, FileText,
  Activity, Timer, Megaphone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useOrganizationContext } from '@/contexts/organization-context'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { subDays, startOfMonth, endOfMonth } from 'date-fns'

function fmt$(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtN(v: number) { if (v >= 1e6) return `${(v/1e6).toFixed(1)}M`; if (v >= 1e3) return `${(v/1e3).toFixed(1)}k`; return v.toLocaleString('pt-BR') }
function fmtP(v: number) { return `${v.toFixed(2)}%` }

type DateFilter = 'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'last_month' | 'all'
function getRange(f: DateFilter) {
  const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
  switch (f) {
    case 'today': return { from: today, to: endOfToday }
    case 'yesterday': return { from: subDays(today, 1), to: new Date(today.getTime() - 1) }
    case '7d': return { from: subDays(today, 6), to: endOfToday }
    case '30d': return { from: subDays(today, 29), to: endOfToday }
    case 'this_month': return { from: startOfMonth(today), to: endOfMonth(today) }
    case 'last_month': { const lm = new Date(today.getFullYear(), today.getMonth()-1, 1); return { from: startOfMonth(lm), to: endOfMonth(lm) } }
    case 'all': return null
  }
}
function filterDate<T extends Record<string, any>>(items: T[], from: Date | null, to: Date | null) {
  if (!from || !to) return items
  const fromTime = from.getTime()
  const toTime = to.getTime()
  return items.filter(i => {
    const ds = i.date || i.add_time
    if (!ds) return false
    try {
      // date field = "2026-03-22", add_time = "2026-03-22 13:00:54+00" or ISO
      const d = typeof ds === 'string' && ds.length === 10
        ? new Date(ds + 'T12:00:00')
        : new Date(ds)
      const t = d.getTime()
      return t >= fromTime && t <= toTime
    } catch { return false }
  })
}

// --- Reusable KPI Card ---
function KpiCard({ label, value, sub, icon: Icon, color = 'text-primary', trend }: {
  label: string; value: string; sub?: string; icon: any; color?: string; trend?: 'up' | 'down' | null
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
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

// --- Funnel Step ---
function FunnelStep({ label, value, rate, icon: Icon, color, isLast }: {
  label: string; value: number; rate?: number; icon: any; color: string; isLast?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5 flex-1">
      <div className={cn('rounded-xl p-4 flex-1 text-center border transition-all hover:shadow-md', color)}>
        <Icon className="h-5 w-5 mx-auto mb-1.5 opacity-80" />
        <p className="text-xl font-bold">{fmtN(value)}</p>
        <p className="text-[11px] font-medium opacity-80">{label}</p>
        {rate !== undefined && rate > 0 && (
          <p className="text-[10px] mt-1 font-semibold opacity-70">{fmtP(rate)}</p>
        )}
      </div>
      {!isLast && <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0 hidden md:block" />}
    </div>
  )
}

export default function GrowthAnalysisPage() {
  const { currentOrg } = useOrganizationContext()
  const orgId = currentOrg?.id
  const [campaignInsights, setCampaignInsights] = useState<any[]>([])
  const [adInsights, setAdInsights] = useState<any[]>([])
  const [adsetInsights, setAdsetInsights] = useState<any[]>([])
  const [adsMeta, setAdsMeta] = useState<any[]>([])
  const [adsetsMeta, setAdsetsMeta] = useState<any[]>([])
  const [deals, setDeals] = useState<any[]>([])
  const [stages, setStages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [dateFilter, setDateFilter] = useState<DateFilter>('30d')
  const [sortConfig, setSortConfig] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'leads', dir: 'desc' })
  const toggleSort = (key: string) => setSortConfig(prev => ({ key, dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc' }))
  const sortFn = (a: any, b: any) => {
    const av = Number(a[sortConfig.key]) || 0, bv = Number(b[sortConfig.key]) || 0
    return sortConfig.dir === 'desc' ? bv - av : av - bv
  }
  const SortHead = ({ label, field, className }: { label: string; field: string; className?: string }) => (
    <TableHead className={cn('text-xs cursor-pointer hover:text-foreground select-none', className)} onClick={() => toggleSort(field)}>
      {label} {sortConfig.key === field ? (sortConfig.dir === 'desc' ? '↓' : '↑') : ''}
    </TableHead>
  )
  const [ga4Data, setGa4Data] = useState<any>(null)
  const [ga4Loading, setGa4Loading] = useState(false)
  const [ga4Error, setGa4Error] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!orgId) { setLoading(false); return }
    setLoading(true)
    try {
      const sb = createClient()
      // Get pipeline_name from pipedrive_connections for this org
      const { data: pipeConn } = await sb.from('pipedrive_connections').select('pipeline_name').eq('org_id', orgId).eq('status', 'active').maybeSingle()
      const pipelineName = pipeConn?.pipeline_name || null

      const dealsBase = sb.from('pipedrive_deals').select('deal_id,title,value,currency,status,stage_id,stage_name,pipeline_name,person_name,person_email,org_name,owner_name,add_time,update_time,won_time,lost_time,lost_reason,utm_source,utm_medium,utm_campaign,utm_content,utm_term').eq('org_id', orgId)
      const stagesBase = sb.from('pipedrive_stages').select('stage_id,name,order_nr,pipeline_name').eq('org_id', orgId)

      const [c, ai, asi, am, asm, d, s] = await Promise.all([
        sb.from('meta_campaign_insights').select('id,campaign_id,campaign_name,date,impressions,reach,clicks,link_clicks,spend,cpc,cpm,ctr,leads,cost_per_lead,frequency').eq('org_id', orgId).order('date', { ascending: false }).range(0, 999),
        sb.from('meta_ad_insights').select('id,ad_id,date,impressions,reach,clicks,link_clicks,spend,cpc,cpm,ctr,conversions,leads,actions').eq('org_id', orgId).range(0, 999),
        sb.from('meta_adset_insights').select('id,adset_id,date,impressions,reach,clicks,link_clicks,spend,cpc,cpm,ctr,leads').eq('org_id', orgId).range(0, 999),
        sb.from('meta_ads').select('id,ad_id,adset_id,campaign_id,name,status,image_url,headline').eq('org_id', orgId).range(0, 999),
        sb.from('meta_adsets').select('id,adset_id,campaign_id,name,status,targeting').eq('org_id', orgId).range(0, 999),
        pipelineName ? dealsBase.eq('pipeline_name', pipelineName).order('add_time', { ascending: false }).range(0, 999) : dealsBase.order('add_time', { ascending: false }).range(0, 999),
        pipelineName ? stagesBase.eq('pipeline_name', pipelineName).order('order_nr', { ascending: true }) : stagesBase.order('order_nr', { ascending: true }),
      ])
      if (c.error) console.error('campaign_insights error:', c.error)
      if (ai.error) console.error('ad_insights error:', ai.error)
      if (d.error) console.error('deals error:', d.error)
      setCampaignInsights(c.data||[]); setAdInsights(ai.data||[]); setAdsetInsights(asi.data||[])
      setAdsMeta(am.data||[]); setAdsetsMeta(asm.data||[]); setDeals(d.data||[]); setStages(s.data||[])
    } catch (e) { console.error('Growth loadData error:', e) } finally { setLoading(false) }
  }, [orgId])

  useEffect(() => { if (orgId) loadData() }, [orgId, loadData])

  // GA4 date mapping
  const ga4DateMap = useMemo((): Record<DateFilter, { start: string; end: string }> => {
    const now = new Date()
    const y = now.getFullYear(), m = now.getMonth()
    const lmDate = new Date(y, m - 1, 1) // handles Jan→Dec previous year
    const lmY = lmDate.getFullYear(), lmM = lmDate.getMonth() + 1
    const lmDays = new Date(lmY, lmDate.getMonth() + 1, 0).getDate()
    return {
      today: { start: 'today', end: 'today' },
      yesterday: { start: 'yesterday', end: 'yesterday' },
      '7d': { start: '7daysAgo', end: 'today' },
      '30d': { start: '30daysAgo', end: 'today' },
      this_month: { start: `${y}-${String(m+1).padStart(2,'0')}-01`, end: 'today' },
      last_month: { start: `${lmY}-${String(lmM).padStart(2,'0')}-01`, end: `${lmY}-${String(lmM).padStart(2,'0')}-${String(lmDays).padStart(2,'0')}` },
      all: { start: '365daysAgo', end: 'today' },
    }
  }, [])

  const loadGA4 = useCallback(async () => {
    setGa4Loading(true)
    setGa4Error(null)
    try {
      const { start, end } = ga4DateMap[dateFilter]
      const res = await fetch(`/api/analytics/ga4?startDate=${start}&endDate=${end}&orgId=${orgId}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao carregar GA4')
      }
      const data = await res.json()
      setGa4Data(data)
    } catch (e: any) {
      console.error('GA4 load error:', e)
      setGa4Error(e.message || 'Erro ao carregar dados do Google Analytics')
    } finally {
      setGa4Loading(false)
    }
  }, [dateFilter, orgId])

  const handleSync = async () => {
    if (!orgId) return; setSyncing(true)
    try {
      await Promise.all([
        fetch('/api/meta-ads/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orgId, daysBack: 30, syncLevels: ['campaigns','adsets','ads','structure'] }) }),
        fetch('/api/pipedrive/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orgId, syncType: 'full' }) }),
      ])
      await loadData()
    } catch (e) { console.error(e) } finally { setSyncing(false) }
  }

  const range = useMemo(() => getRange(dateFilter), [dateFilter])
  const rangeFrom = range?.from || null
  const rangeTo = range?.to || null
  const fCampaigns = useMemo(() => filterDate(campaignInsights, rangeFrom, rangeTo), [campaignInsights, rangeFrom, rangeTo])
  const fAds = useMemo(() => filterDate(adInsights, rangeFrom, rangeTo), [adInsights, rangeFrom, rangeTo])
  const fAdsets = useMemo(() => filterDate(adsetInsights, rangeFrom, rangeTo), [adsetInsights, rangeFrom, rangeTo])
  const fDeals = useMemo(() => filterDate(deals, rangeFrom, rangeTo), [deals, rangeFrom, rangeTo])
  // Deals won filtered by won_time (not add_time) — only 2026+
  const fWonDeals = useMemo(() => {
    if (!rangeFrom || !rangeTo) return deals.filter((d: any) => d.status === 'won' && d.won_time && d.won_time >= '2026-01-01')
    const fromTime = rangeFrom.getTime()
    const toTime = rangeTo.getTime()
    return deals.filter((d: any) => {
      if (d.status !== 'won') return false
      const wt = d.won_time
      if (!wt) return false
      try {
        const t = new Date(wt).getTime()
        return t >= fromTime && t <= toTime
      } catch { return false }
    })
  }, [deals, rangeFrom, rangeTo])

  const adMetaMap = useMemo(() => { const m = new Map(); adsMeta.forEach(a => m.set(a.ad_id, a)); return m }, [adsMeta])
  const adsetMetaMap = useMemo(() => { const m = new Map(); adsetsMeta.forEach(a => m.set(a.adset_id, a)); return m }, [adsetsMeta])
  // Map ad name → image_url (picks first one that has an image)
  const adImageByName = useMemo(() => {
    const m = new Map()
    adsMeta.forEach(a => { if (a.image_url && !m.has(a.name)) m.set(a.name, a.image_url) })
    return m
  }, [adsMeta])

  // === KPIS ===
  const mkt = useMemo(() => {
    const spend = fCampaigns.reduce((s,c)=>s+Number(c.spend),0)
    const imp = fCampaigns.reduce((s,c)=>s+Number(c.impressions),0)
    const clicks = fCampaigns.reduce((s,c)=>s+Number(c.clicks),0)
    const leads = fCampaigns.reduce((s,c)=>s+Number(c.leads),0)
    return { spend, imp, clicks, leads, cpl: leads>0?spend/leads:0, ctr: imp>0?(clicks/imp)*100:0, convRate: clicks>0?(leads/clicks)*100:0 }
  }, [fCampaigns])

  const sales = useMemo(() => {
    const open = fDeals.filter(d=>d.status==='open'), lost = fDeals.filter(d=>d.status==='lost')
    // Won comes from fWonDeals (filtered by won_time, not add_time)
    return { total: fDeals.length, open: open.length, won: fWonDeals.length, lost: lost.length,
      wonValue: fWonDeals.reduce((s,d)=>s+Number(d.value||0),0), openValue: open.reduce((s,d)=>s+Number(d.value||0),0),
      winRate: (fWonDeals.length+lost.length)>0?(fWonDeals.length/(fWonDeals.length+lost.length))*100:0 }
  }, [fDeals, fWonDeals])

  const roas = mkt.spend>0 ? sales.wonValue/mkt.spend : 0

  // === CRIATIVOS META ===
  const topCreatives = useMemo(() => {
    const map = new Map(), tracker = new Map()
    fAds.forEach(row => {
      const meta = adMetaMap.get(row.ad_id), name = meta?.name || row.ad_id
      const e = map.get(name) || { name, headline: '', image_url: '', adsets: 0, spend: 0, imp: 0, clicks: 0, leads: 0 }
      if (!e.image_url && meta?.image_url) e.image_url = meta.image_url
      if (!e.image_url) e.image_url = adImageByName.get(name) || ''
      if (!e.headline && meta?.headline) e.headline = meta.headline
      e.spend += Number(row.spend); e.imp += Number(row.impressions); e.clicks += Number(row.clicks); e.leads += Number(row.leads)
      map.set(name, e)
      const ids = tracker.get(name) || new Set(); ids.add(row.ad_id); tracker.set(name, ids)
    })
    map.forEach((v, name) => { v.adsets = tracker.get(name)?.size || 1 })
    return Array.from(map.values()).sort((a,b) => b.leads - a.leads)
  }, [fAds, adMetaMap])

  // === PÚBLICOS META ===
  const topAudiences = useMemo(() => {
    const map = new Map()
    fAdsets.forEach(row => {
      const meta = adsetMetaMap.get(row.adset_id), name = meta?.name || row.adset_id
      const e = map.get(name) || { name, spend: 0, imp: 0, clicks: 0, leads: 0 }
      e.spend += Number(row.spend); e.imp += Number(row.impressions); e.clicks += Number(row.clicks); e.leads += Number(row.leads)
      map.set(name, e)
    })
    return Array.from(map.values()).sort((a,b) => b.leads - a.leads)
  }, [fAdsets, adsetMetaMap])

  // === VENDAS POR CRIATIVO (utm_term) — para cruzar com Meta Ads ===
  const wonDeals2026 = useMemo(() => deals.filter((d: any) => d.status === 'won' && d.won_time && d.won_time >= '2026-01-01'), [deals])

  const wonByCreative = useMemo(() => {
    const map = new Map<string, { won: number; value: number }>()
    wonDeals2026.filter((d: any) => d.utm_term).forEach((d: any) => {
      const e = map.get(d.utm_term) || { won: 0, value: 0 }
      e.won++; e.value += Number(d.value || 0)
      map.set(d.utm_term, e)
    })
    return map
  }, [wonDeals2026])

  // === VENDAS POR PUBLICO (utm_content) — para cruzar com Meta Ads ===
  const wonByAudience = useMemo(() => {
    const map = new Map<string, { won: number; value: number }>()
    wonDeals2026.filter((d: any) => d.utm_content).forEach((d: any) => {
      const e = map.get(d.utm_content) || { won: 0, value: 0 }
      e.won++; e.value += Number(d.value || 0)
      map.set(d.utm_content, e)
    })
    return map
  }, [wonDeals2026])

  // === CAMPANHAS META ADS COM VENDAS ===
  const campaignStats = useMemo(() => {
    const map = new Map<string, { name: string; spend: number; imp: number; clicks: number; leads: number; won: number; wonValue: number; lost: number }>()
    fCampaigns.forEach(c => {
      const name = c.campaign_name
      const e = map.get(name) || { name, spend: 0, imp: 0, clicks: 0, leads: 0, won: 0, wonValue: 0, lost: 0 }
      e.spend += Number(c.spend); e.imp += Number(c.impressions); e.clicks += Number(c.clicks); e.leads += Number(c.leads)
      map.set(name, e)
    })
    // Cross with CRM deals by utm_campaign (fuzzy match — handles "— Cópia" suffix)
    const campaignNames = Array.from(map.keys())
    deals.forEach((d: any) => {
      if (!d.utm_campaign) return
      // Try exact match first
      let e = map.get(d.utm_campaign)
      // If no exact match, try fuzzy: remove "— Cópia", "- Copia", trailing suffixes
      if (!e) {
        const cleanDealCampaign = d.utm_campaign.replace(/\s*[—–-]\s*(C[oó]pia|Copy)\s*\d*$/i, '').trim()
        e = map.get(cleanDealCampaign)
        // Still no match? Try if any campaign name starts with the same base
        if (!e) {
          const match = campaignNames.find(name => cleanDealCampaign.startsWith(name) || name.startsWith(cleanDealCampaign))
          if (match) e = map.get(match)
        }
      }
      if (e) {
        if (d.status === 'won') { e.won++; e.wonValue += Number(d.value || 0) }
        if (d.status === 'lost') e.lost++
      }
    })
    return Array.from(map.values()).sort((a, b) => b.spend - a.spend)
  }, [fCampaigns, deals])

  // === CRIATIVOS NO CRM ===
  const wonDealsAll = useMemo(() => {
    return fWonDeals.map((d: any) => {
      let source = 'Fonte desconhecida'
      if (d.utm_source === 'facebook') source = 'Meta Ads'
      else if (d.utm_source === 'google') source = 'Google Ads'
      else if (d.utm_source === 'ig') source = 'Instagram'
      else if (d.utm_source === 'manychat') source = 'ManyChat'
      else if (d.utm_source) source = d.utm_source
      const criativo = d.utm_term || 'Sem criativo'
      const publico = d.utm_content || 'Sem publico'
      const campanha = d.utm_campaign ? d.utm_campaign.replace(/\s*[—–-]\s*(C[oó]pia|Copy)\s*\d*$/i, '').trim() : 'Sem campanha'
      return { title: d.title, personName: d.person_name, value: Number(d.value || 0), wonTime: d.won_time, utmTerm: d.utm_term, utmContent: d.utm_content, utmSource: d.utm_source, utmCampaign: campanha, source, criativo, publico }
    }).sort((a: any, b: any) => (b.wonTime || '').localeCompare(a.wonTime || ''))
  }, [fWonDeals])

  const creativesInCRM = useMemo(() => {
    const map = new Map()
    fDeals.forEach(d => {
      const term = d.utm_term; if (!term || term === '{{ad.name}}') return
      const e = map.get(term) || { name: term, deals: 0, open: 0, won: 0, lost: 0, value: 0, wonValue: 0 }
      e.deals++; if (d.status==='open'){e.open++;e.value+=Number(d.value||0)} if (d.status==='won'){e.won++;e.wonValue+=Number(d.value||0)} if (d.status==='lost') e.lost++
      map.set(term, e)
    })
    return Array.from(map.values()).sort((a,b) => b.deals - a.deals)
  }, [fDeals])

  // === PÚBLICOS NO CRM ===
  const audiencesInCRM = useMemo(() => {
    const map = new Map()
    fDeals.forEach(d => {
      const content = d.utm_content; if (!content) return
      const e = map.get(content) || { name: content, deals: 0, open: 0, won: 0, lost: 0, value: 0 }
      e.deals++; if (d.status==='open'){e.open++;e.value+=Number(d.value||0)} if (d.status==='won') e.won++; if (d.status==='lost') e.lost++
      map.set(content, e)
    })
    return Array.from(map.values()).sort((a,b) => b.deals - a.deals)
  }, [fDeals])

  // === CRM FUNNEL ===
  const crmFunnel = useMemo(() => {
    const sm = new Map(); stages.forEach(s => sm.set(s.stage_id, { name: s.name, order: s.order_nr, count: 0, value: 0 }))
    fDeals.filter(d=>d.status==='open').forEach(d => { const s = sm.get(d.stage_id); if (s){s.count++;s.value+=Number(d.value||0)} })
    return Array.from(sm.values()).filter(s=>s.count>0).sort((a,b)=>a.order-b.order)
  }, [fDeals, stages])
  const maxF = Math.max(...crmFunnel.map(s=>s.count), 1)

  // === FUNNEL STEPS ===
  const funnel = [
    { label: 'Impressoes', value: mkt.imp, icon: Eye, color: 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300' },
    { label: 'Cliques', value: mkt.clicks, icon: MousePointerClick, color: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300', rate: mkt.ctr },
    { label: 'Leads Ads', value: mkt.leads, icon: Users, color: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300', rate: mkt.convRate },
    { label: 'Deals CRM', value: sales.total, icon: Target, color: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300', rate: mkt.leads>0?(sales.total/mkt.leads)*100:0 },
    { label: 'Vendas', value: sales.won, icon: CheckCircle2, color: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300', rate: sales.total>0?(sales.won/sales.total)*100:0 },
  ]

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analise de MKT e Vendas</h2>
          <p className="text-sm text-muted-foreground">{currentOrg?.name} — Criativo → Lead → CRM → Venda</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateFilter} onValueChange={v => setDateFilter(v as DateFilter)}>
            <SelectTrigger className="w-[160px] h-9"><Clock className="mr-2 h-3.5 w-3.5" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem><SelectItem value="yesterday">Ontem</SelectItem>
              <SelectItem value="7d">7 dias</SelectItem><SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="this_month">Este mes</SelectItem><SelectItem value="last_month">Mes passado</SelectItem>
              <SelectItem value="all">Todo periodo</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleSync} disabled={syncing} variant="outline">
            <RefreshCw className={cn('mr-2 h-3.5 w-3.5', syncing && 'animate-spin')} />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
        </div>
      </div>

      {/* GROWTH FUNNEL */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-card to-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Funil de Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-stretch gap-1.5">
            {funnel.map((s, i) => (
              <FunnelStep key={s.label} {...s} isLast={i === funnel.length-1} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Investimento" value={fmt$(mkt.spend)} sub={`CPL: ${mkt.cpl>0?fmt$(mkt.cpl):'-'}`} icon={DollarSign} color="text-amber-600" />
        <KpiCard label="Taxa Conversao" value={fmtP(mkt.convRate)} sub="Leads / Cliques" icon={Percent} color="text-blue-600" />
        <KpiCard label="Receita" value={fmt$(sales.wonValue)} sub={`${sales.won} vendas`} icon={CheckCircle2} color="text-emerald-600" />
        <KpiCard label="ROAS" value={roas>0?`${roas.toFixed(1)}x`:'-'} sub="Retorno / investimento" icon={TrendingUp} color="text-purple-600" />
        <KpiCard label="Pipeline" value={fmt$(sales.openValue)} sub={`${fmtN(sales.open)} deals abertos`} icon={Target} color="text-orange-600" />
      </div>

      {/* TABS */}
      <Tabs defaultValue="creatives" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="creatives" className="gap-1.5 text-xs"><Image className="h-3.5 w-3.5" /> Criativos</TabsTrigger>
          <TabsTrigger value="audiences" className="gap-1.5 text-xs"><Layers className="h-3.5 w-3.5" /> Publicos</TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1.5 text-xs"><Megaphone className="h-3.5 w-3.5" /> Campanhas</TabsTrigger>
          <TabsTrigger value="crm_creatives" className="gap-1.5 text-xs"><TrendingUp className="h-3.5 w-3.5" /> Criativos no CRM</TabsTrigger>
          <TabsTrigger value="crm_funnel" className="gap-1.5 text-xs"><Target className="h-3.5 w-3.5" /> Funil CRM</TabsTrigger>
          <TabsTrigger value="ga4" className="gap-1.5 text-xs" onClick={() => { if (!ga4Data && !ga4Loading) loadGA4() }}><Globe className="h-3.5 w-3.5" /> Google Analytics</TabsTrigger>
        </TabsList>

        {/* === CRIATIVOS META ADS === */}
        <TabsContent value="creatives" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Top Criativos por Conversao</CardTitle>
              <CardDescription className="text-xs">Agrupados por nome — somando todos os conjuntos de anuncio</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[50px] pl-4"></TableHead><TableHead className="text-xs">Criativo</TableHead>
                      <SortHead label="Leads" field="leads" className="text-right" /><SortHead label="Vendas" field="won" className="text-right" /><SortHead label="Receita" field="wonValue" className="text-right" /><SortHead label="CPL" field="cpl" className="text-right" />
                      <SortHead label="Conv." field="conv" className="text-right" />
                      <SortHead label="Invest." field="spend" className="text-right" /><SortHead label="Cliques" field="clicks" className="text-right" /><SortHead label="CTR" field="ctr" className="text-right pr-4" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCreatives.filter(c=>c.leads>0).map(c => {
                      const ctr = c.imp>0?(c.clicks/c.imp)*100:0, cpl = c.leads>0?c.spend/c.leads:0, conv = c.clicks>0?(c.leads/c.clicks)*100:0
                      const crmData = wonByCreative.get(c.name) || { won: 0, value: 0 }
                      return { ...c, won: crmData.won, wonValue: crmData.value, cpl, conv, ctr }
                    }).sort(sortFn).slice(0,15).map((c, i) => {
                      const { ctr, cpl, conv } = c
                      const crmData = { won: c.won, value: c.wonValue }
                      const isVideo = c.name?.toLowerCase().includes('video')
                      const isTop3 = i < 3
                      return (
                        <TableRow key={c.name} className={cn(isTop3 && 'bg-emerald-50/50 dark:bg-emerald-950/10')}>
                          <TableCell className="pl-4">
                            <div className="relative">
                              {c.image_url ? <img src={c.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shadow-sm" /> : isVideo ? <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center shadow-sm"><Video className="h-4 w-4 text-purple-600 dark:text-purple-300" /></div> : <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shadow-sm"><Image className="h-4 w-4 text-muted-foreground" /></div>}
                              {isTop3 && <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center">{i+1}</div>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-sm block break-words">{c.name}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">{c.headline && <span className="text-[11px] text-muted-foreground">{c.headline}</span>}{c.adsets>1 && <Badge variant="outline" className="text-[10px] py-0 h-4">{c.adsets} conj.</Badge>}</div>
                          </TableCell>
                          <TableCell className="text-right"><span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{c.leads}</span></TableCell>
                          <TableCell className="text-right">{crmData.won > 0 ? <span className="font-bold text-green-600 dark:text-green-400 text-sm">{crmData.won}</span> : <span className="text-muted-foreground text-sm">-</span>}</TableCell>
                          <TableCell className="text-right">{crmData.value > 0 ? <span className="text-sm font-medium text-green-600 dark:text-green-400">{fmt$(crmData.value)}</span> : <span className="text-muted-foreground text-sm">-</span>}</TableCell>
                          <TableCell className="text-right text-sm">{fmt$(cpl)}</TableCell>
                          <TableCell className="text-right"><span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded', conv>mkt.convRate ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'text-muted-foreground')}>{fmtP(conv)}</span></TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">{fmt$(c.spend)}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">{fmtN(c.clicks)}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground pr-4">{fmtP(ctr)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              {topCreatives.filter(c=>c.leads>0).length===0 && <p className="text-center text-muted-foreground py-8 text-sm">Nenhum criativo com leads no periodo</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === PÚBLICOS META ADS === */}
        <TabsContent value="audiences" className="space-y-4">
          {/* Type breakdown cards */}
          {(() => {
            const t = { rmk: { l: 'Remarketing', s: 0, ld: 0, cl: 0, im: 0, c: 'border-orange-200 dark:border-orange-800' }, lal: { l: 'Lookalike', s: 0, ld: 0, cl: 0, im: 0, c: 'border-purple-200 dark:border-purple-800' }, int: { l: 'Interesses', s: 0, ld: 0, cl: 0, im: 0, c: 'border-blue-200 dark:border-blue-800' } }
            topAudiences.forEach(a => { const k = a.name?.toLowerCase().includes('remarketing')?'rmk':a.name?.toLowerCase().includes('lookalike')?'lal':'int'; t[k].s+=a.spend; t[k].ld+=a.leads; t[k].cl+=a.clicks; t[k].im+=a.imp })
            return (
              <div className="grid gap-3 md:grid-cols-3">
                {Object.values(t).map(v => (
                  <Card key={v.l} className={cn('border-l-4', v.c)}>
                    <CardContent className="p-4">
                      <p className="font-semibold text-sm mb-3">{v.l}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div><p className="text-[11px] text-muted-foreground">Leads</p><p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{v.ld}</p></div>
                        <div><p className="text-[11px] text-muted-foreground">CPL</p><p className="text-lg font-bold">{v.ld>0?fmt$(v.s/v.ld):'-'}</p></div>
                        <div><p className="text-[11px] text-muted-foreground">Conv. Rate</p><p className="text-sm font-semibold">{v.cl>0?fmtP((v.ld/v.cl)*100):'-'}</p></div>
                        <div><p className="text-[11px] text-muted-foreground">Investimento</p><p className="text-sm font-semibold">{fmt$(v.s)}</p></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          })()}

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Detalhamento por Conjunto de Anuncio</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow className="bg-muted/30">
                    <TableHead className="text-xs pl-4 min-w-[350px]">Publico</TableHead>
                    <SortHead label="Leads" field="leads" className="text-right" />
                    <SortHead label="Vendas" field="won" className="text-right" /><SortHead label="Receita" field="wonValue" className="text-right" />
                    <SortHead label="CPL" field="cpl" className="text-right" /><SortHead label="Conv." field="conv" className="text-right" />
                    <SortHead label="Invest." field="spend" className="text-right" /><SortHead label="CTR" field="ctr" className="text-right pr-4" />
                  </TableRow></TableHeader>
                  <TableBody>
                    {topAudiences.filter(a=>a.leads>0).map(a => {
                      const cpl=a.leads>0?a.spend/a.leads:0, ctr=a.imp>0?(a.clicks/a.imp)*100:0, conv=a.clicks>0?(a.leads/a.clicks)*100:0
                      const audCrm = wonByAudience.get(a.name) || { won: 0, value: 0 }
                      return { ...a, won: audCrm.won, wonValue: audCrm.value, cpl, conv, ctr }
                    }).sort(sortFn).slice(0,15).map(a => {
                      const { cpl, ctr, conv } = a
                      const audCrm = { won: a.won, value: a.wonValue }
                      const isRmk=a.name?.toLowerCase().includes('remarketing'), isLAL=a.name?.toLowerCase().includes('lookalike')
                      return (
                        <TableRow key={a.name}>
                          <TableCell className="pl-4"><div className="flex items-center gap-2"><span className={cn('w-1.5 h-6 rounded-full shrink-0', isRmk?'bg-orange-400':isLAL?'bg-purple-400':'bg-blue-400')} /><span className="text-sm break-words">{a.name}</span></div></TableCell>
                          <TableCell className="text-right"><span className="font-bold text-emerald-600 dark:text-emerald-400">{a.leads}</span></TableCell>
                          <TableCell className="text-right">{audCrm.won > 0 ? <span className="font-bold text-green-600 dark:text-green-400">{audCrm.won}</span> : <span className="text-muted-foreground">-</span>}</TableCell>
                          <TableCell className="text-right">{audCrm.value > 0 ? <span className="text-sm font-medium text-green-600 dark:text-green-400">{fmt$(audCrm.value)}</span> : <span className="text-muted-foreground">-</span>}</TableCell>
                          <TableCell className="text-right text-sm">{fmt$(cpl)}</TableCell>
                          <TableCell className="text-right"><span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded', conv>mkt.convRate?'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400':'text-muted-foreground')}>{fmtP(conv)}</span></TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">{fmt$(a.spend)}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground pr-4">{fmtP(ctr)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === CAMPANHAS COM VENDAS === */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Performance por Campanha</CardTitle>
              <CardDescription className="text-xs">Campanhas Meta Ads cruzadas com vendas do CRM</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs pl-4 min-w-[300px]">Campanha</TableHead>
                      <SortHead label="Leads" field="leads" className="text-right" />
                      <SortHead label="Vendas" field="won" className="text-right" />
                      <SortHead label="Receita" field="wonValue" className="text-right" />
                      <SortHead label="ROAS" field="roas" className="text-right" />
                      <SortHead label="CPL" field="cpl" className="text-right" />
                      <SortHead label="Conv." field="conv" className="text-right" />
                      <SortHead label="Invest." field="spend" className="text-right" />
                      <SortHead label="Cliques" field="clicks" className="text-right" />
                      <SortHead label="CTR" field="ctr" className="text-right pr-4" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaignStats.filter(c => c.leads > 0 || c.won > 0).map(c => {
                      const ctr = c.imp > 0 ? (c.clicks / c.imp) * 100 : 0
                      const cpl = c.leads > 0 ? c.spend / c.leads : 0
                      const conv = c.clicks > 0 ? (c.leads / c.clicks) * 100 : 0
                      const roas = c.spend > 0 ? c.wonValue / c.spend : 0
                      return { ...c, ctr, cpl, conv, roas }
                    }).sort(sortFn).map((c, i) => (
                        <TableRow key={c.name} className={cn(c.won > 0 && 'bg-emerald-50/50 dark:bg-emerald-950/10')}>
                          <TableCell className="pl-4">
                            <span className="text-sm break-words max-w-[300px] block">{c.name}</span>
                          </TableCell>
                          <TableCell className="text-right"><span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{c.leads}</span></TableCell>
                          <TableCell className="text-right">{c.won > 0 ? <span className="font-bold text-green-600 dark:text-green-400 text-sm">{c.won}</span> : <span className="text-muted-foreground text-sm">-</span>}</TableCell>
                          <TableCell className="text-right">{c.wonValue > 0 ? <span className="text-sm font-medium text-green-600 dark:text-green-400">{fmt$(c.wonValue)}</span> : <span className="text-muted-foreground text-sm">-</span>}</TableCell>
                          <TableCell className="text-right">{c.roas > 0 ? <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded', c.roas >= 3 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : c.roas >= 1 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}>{c.roas.toFixed(1)}x</span> : <span className="text-muted-foreground text-sm">-</span>}</TableCell>
                          <TableCell className="text-right text-sm">{fmt$(c.cpl)}</TableCell>
                          <TableCell className="text-right"><span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded', c.conv > mkt.convRate ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'text-muted-foreground')}>{fmtP(c.conv)}</span></TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">{fmt$(c.spend)}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">{fmtN(c.clicks)}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground pr-4">{fmtP(c.ctr)}</TableCell>
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {campaignStats.filter(c => c.leads > 0 || c.won > 0).length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma campanha com leads no periodo</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === CRIATIVOS NO CRM === */}
        <TabsContent value="crm_creatives" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Criativos que Avancam no Funil</CardTitle>
              <CardDescription className="text-xs">Cruzamento: criativo (utm_term) → deals no Pipedrive</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow className="bg-muted/30">
                    <TableHead className="w-[50px] pl-4"></TableHead><TableHead className="text-xs">Criativo</TableHead>
                    <TableHead className="text-right text-xs">Deals</TableHead><TableHead className="text-right text-xs">Abertos</TableHead>
                    <TableHead className="text-right text-xs">Ganhos</TableHead><TableHead className="text-right text-xs">Perdidos</TableHead>
                    <TableHead className="text-right text-xs">Win Rate</TableHead><TableHead className="text-right text-xs pr-4">Valor</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {creativesInCRM.slice(0,15).map((c, i) => {
                      const wr = (c.won+c.lost)>0?(c.won/(c.won+c.lost))*100:0
                      const meta = adsMeta.find(a=>a.name===c.name)
                      const isVideo = c.name?.toLowerCase().includes('video')
                      return (
                        <TableRow key={c.name}>
                          <TableCell className="pl-4">{(meta?.image_url || adImageByName.get(c.name)) ? <img src={meta?.image_url || adImageByName.get(c.name)} alt="" className="w-10 h-10 rounded-lg object-cover shadow-sm" /> : isVideo ? <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center"><Video className="h-4 w-4 text-purple-600" /></div> : <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><Image className="h-4 w-4 text-muted-foreground" /></div>}</TableCell>
                          <TableCell><span className="font-medium text-sm truncate block max-w-[220px]">{c.name}</span></TableCell>
                          <TableCell className="text-right font-bold text-sm">{c.deals}</TableCell>
                          <TableCell className="text-right text-sm text-blue-600">{c.open}</TableCell>
                          <TableCell className="text-right text-sm font-semibold text-emerald-600">{c.won || '-'}</TableCell>
                          <TableCell className="text-right text-sm text-red-500">{c.lost || '-'}</TableCell>
                          <TableCell className="text-right">{wr>0 ? <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{fmtP(wr)}</span> : <span className="text-xs text-muted-foreground">-</span>}</TableCell>
                          <TableCell className="text-right text-sm pr-4">{c.wonValue>0?fmt$(c.wonValue):c.value>0?<span className="text-muted-foreground">{fmt$(c.value)}</span>:'-'}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Publicos que Avancam no Funil</CardTitle>
              <CardDescription className="text-xs">Cruzamento: publico (utm_content) → deals no Pipedrive</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow className="bg-muted/30">
                    <TableHead className="text-xs pl-4 min-w-[350px]">Publico / Conjunto</TableHead><TableHead className="text-right text-xs">Deals</TableHead>
                    <TableHead className="text-right text-xs">Abertos</TableHead><TableHead className="text-right text-xs">Ganhos</TableHead>
                    <TableHead className="text-right text-xs">Perdidos</TableHead><TableHead className="text-right text-xs pr-4">Win Rate</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {audiencesInCRM.slice(0,15).map(a => {
                      const wr = (a.won+a.lost)>0?(a.won/(a.won+a.lost))*100:0
                      const isRmk=a.name?.toLowerCase().includes('remarketing'), isLAL=a.name?.toLowerCase().includes('lookalike')
                      return (
                        <TableRow key={a.name}>
                          <TableCell className="pl-4"><div className="flex items-center gap-2"><span className={cn('w-1.5 h-6 rounded-full shrink-0', isRmk?'bg-orange-400':isLAL?'bg-purple-400':'bg-blue-400')} /><span className="text-sm break-words">{a.name}</span></div></TableCell>
                          <TableCell className="text-right font-bold text-sm">{a.deals}</TableCell>
                          <TableCell className="text-right text-sm text-blue-600">{a.open}</TableCell>
                          <TableCell className="text-right text-sm text-emerald-600">{a.won || '-'}</TableCell>
                          <TableCell className="text-right text-sm text-red-500">{a.lost || '-'}</TableCell>
                          <TableCell className="text-right pr-4">{wr>0?<span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{fmtP(wr)}</span>:<span className="text-xs text-muted-foreground">-</span>}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

          {/* All Won Deals */}
          {deals.filter((d: any) => d.status === 'won').length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Todas as Vendas Realizadas ({wonDealsAll.length})</CardTitle>
                <CardDescription className="text-xs">
                  Total: {fmt$(wonDealsAll.reduce((s: number, d: any) => s + d.value, 0))} — Inclui vendas com e sem rastreio de criativo/publico
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow className="bg-muted/30">
                      <TableHead className="text-xs pl-4">Cliente</TableHead>
                      <TableHead className="text-right text-xs">Valor</TableHead>
                      <TableHead className="text-xs">Fonte</TableHead>
                      <TableHead className="text-xs">Campanha</TableHead>
                      <TableHead className="text-xs">Criativo</TableHead>
                      <TableHead className="text-xs">Publico</TableHead>
                      <TableHead className="text-xs pr-4">Data</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {wonDealsAll.map((d: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="pl-4">
                            <div>
                              <p className="text-sm font-medium">{d.personName || '-'}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{d.title}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-sm text-emerald-600">{fmt$(d.value)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('text-xs',
                              d.source === 'Meta Ads' ? 'border-blue-400 text-blue-600' :
                              d.source === 'Instagram' ? 'border-pink-400 text-pink-600' :
                              d.source === 'Google Ads' ? 'border-yellow-400 text-yellow-700' :
                              d.source === 'ManyChat' ? 'border-purple-400 text-purple-600' :
                              d.source === 'Orgânico' ? 'border-green-400 text-green-600' :
                              'border-gray-300 text-gray-500'
                            )}>{d.source}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[180px]" title={d.utmCampaign}>{d.utmCampaign || '-'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]" title={d.criativo}>{d.criativo || '-'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]" title={d.publico}>{d.publico || '-'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground pr-4 whitespace-nowrap">{d.wonTime ? new Date(d.wonTime).toLocaleDateString('pt-BR') : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

        {/* === FUNIL CRM === */}
        <TabsContent value="crm_funnel" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="border-l-4 border-l-blue-400">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Marketing</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-[11px] text-muted-foreground">Impressoes</p><p className="text-lg font-bold">{fmtN(mkt.imp)}</p></div>
                  <div><p className="text-[11px] text-muted-foreground">Cliques</p><p className="text-lg font-bold">{fmtN(mkt.clicks)}</p></div>
                  <div><p className="text-[11px] text-muted-foreground">Leads</p><p className="text-lg font-bold text-emerald-600">{fmtN(mkt.leads)}</p></div>
                  <div><p className="text-[11px] text-muted-foreground">Conv. Rate</p><p className="text-lg font-bold">{fmtP(mkt.convRate)}</p></div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-400">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Vendas</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-[11px] text-muted-foreground">Deals</p><p className="text-lg font-bold">{fmtN(sales.total)}</p></div>
                  <div><p className="text-[11px] text-muted-foreground">Abertos</p><p className="text-lg font-bold">{fmtN(sales.open)}</p></div>
                  <div><p className="text-[11px] text-muted-foreground">Ganhos</p><p className="text-lg font-bold text-emerald-600">{sales.won}</p></div>
                  <div><p className="text-[11px] text-muted-foreground">Win Rate</p><p className="text-lg font-bold">{fmtP(sales.winRate)}</p></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Pipeline CRM</CardTitle><CardDescription className="text-xs">{fmt$(sales.openValue)} em pipeline</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {crmFunnel.map((s, i) => {
                  const pct = Math.max((s.count/maxF)*100, 6)
                  const colors = ['bg-sky-400/20', 'bg-blue-400/20', 'bg-indigo-400/20', 'bg-violet-400/20', 'bg-purple-400/20', 'bg-pink-400/20', 'bg-rose-400/20', 'bg-amber-400/20', 'bg-emerald-400/20']
                  return (
                    <div key={s.name} className="flex items-center gap-3">
                      <span className="text-xs font-medium w-[160px] truncate text-muted-foreground">{s.name}</span>
                      <div className="flex-1">
                        <div className={cn('h-8 rounded-lg flex items-center px-3 transition-all', colors[i % colors.length])} style={{ width: `${pct}%` }}>
                          <span className="text-xs font-bold whitespace-nowrap">{s.count}</span>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground w-[90px] text-right">{fmt$(s.value)}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === GOOGLE ANALYTICS === */}
        <TabsContent value="ga4" className="space-y-4">
          {ga4Loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Carregando dados do Google Analytics...</span>
            </div>
          )}

          {ga4Error && !ga4Loading && (
            <Card className="border-destructive/50">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-destructive font-medium mb-2">Erro ao carregar Google Analytics</p>
                <p className="text-xs text-muted-foreground mb-4">{ga4Error}</p>
                <Button size="sm" variant="outline" onClick={loadGA4}>
                  <RefreshCw className="mr-2 h-3.5 w-3.5" /> Tentar novamente
                </Button>
              </CardContent>
            </Card>
          )}

          {!ga4Loading && !ga4Error && !ga4Data && (
            <Card>
              <CardContent className="p-6 text-center">
                <Globe className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">Clique para carregar os dados do Google Analytics</p>
                <Button size="sm" onClick={loadGA4}>
                  <Globe className="mr-2 h-3.5 w-3.5" /> Carregar GA4
                </Button>
              </CardContent>
            </Card>
          )}

          {!ga4Loading && ga4Data && (() => {
            const ov = ga4Data.overview || {}
            const sources: any[] = ga4Data.sources || []
            const pages: any[] = ga4Data.pages || []
            const geo: any[] = ga4Data.geography || []
            const devices: any[] = ga4Data.devices || []
            const events: any[] = ga4Data.events || []
            const totalDeviceSessions = devices.reduce((s: number, d: any) => s + (d.sessions || 0), 0)
            const maxSourceSessions = Math.max(...sources.map((s: any) => s.sessions || 0), 1)
            const maxPageViews = Math.max(...pages.map((p: any) => p.pageViews || 0), 1)
            const maxGeoSessions = Math.max(...geo.map((g: any) => g.sessions || 0), 1)
            const maxEventCount = Math.max(...events.map((e: any) => e.count || 0), 1)

            function fmtDuration(seconds: number) {
              if (!seconds || seconds <= 0) return '0s'
              const m = Math.floor(seconds / 60)
              const s = Math.round(seconds % 60)
              return m > 0 ? `${m}m ${s}s` : `${s}s`
            }

            const deviceIcons: Record<string, any> = { desktop: Monitor, mobile: Smartphone, tablet: Tablet }
            const deviceColors: Record<string, string> = {
              desktop: 'bg-blue-500',
              mobile: 'bg-emerald-500',
              tablet: 'bg-amber-500',
            }

            return (
              <>
                {/* KPI Cards */}
                <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
                  <KpiCard label="Sessoes" value={fmtN(ov.sessions || 0)} sub={`${fmtN(ov.engagedSessions || 0)} engajadas`} icon={Activity} color="text-blue-600" />
                  <KpiCard label="Usuarios" value={fmtN(ov.totalUsers || 0)} sub={`${fmtN(ov.newUsers || 0)} novos`} icon={Users} color="text-indigo-600" />
                  <KpiCard label="Paginas Vistas" value={fmtN(ov.pageViews || 0)} icon={FileText} color="text-sky-600" />
                  <KpiCard label="Taxa Rejeicao" value={fmtP(ov.bounceRate ? ov.bounceRate * 100 : 0)} icon={ArrowDown} color="text-red-500" />
                  <KpiCard label="Duracao Media" value={fmtDuration(ov.avgSessionDuration || 0)} icon={Timer} color="text-amber-600" />
                  <KpiCard label="Conversoes" value={fmtN(ov.conversions || 0)} icon={CheckCircle2} color="text-emerald-600" />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Traffic Sources */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2"><Globe className="h-4 w-4 text-blue-500" /> Fontes de Trafego</CardTitle>
                      <CardDescription className="text-xs">Origem / Meio com sessoes e conversoes</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30">
                              <TableHead className="text-xs pl-4">Origem / Meio</TableHead>
                              <TableHead className="text-right text-xs">Sessoes</TableHead>
                              <TableHead className="text-right text-xs">Usuarios</TableHead>
                              <TableHead className="text-right text-xs">Conv.</TableHead>
                              <TableHead className="text-right text-xs pr-4">Rejeicao</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sources.slice(0, 12).map((s: any, i: number) => {
                              const barW = Math.max((s.sessions / maxSourceSessions) * 100, 4)
                              return (
                                <TableRow key={`${s.source}-${s.medium}-${i}`}>
                                  <TableCell className="pl-4">
                                    <div className="space-y-1">
                                      <span className="text-sm font-medium block">{s.source || '(direto)'} / {s.medium || '(none)'}</span>
                                      <div className="h-1.5 rounded-full bg-muted overflow-hidden w-full max-w-[120px]">
                                        <div className="h-full rounded-full bg-blue-500/60" style={{ width: `${barW}%` }} />
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right text-sm font-semibold">{fmtN(s.sessions)}</TableCell>
                                  <TableCell className="text-right text-sm text-muted-foreground">{fmtN(s.users)}</TableCell>
                                  <TableCell className="text-right">
                                    {s.conversions > 0
                                      ? <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{s.conversions}</span>
                                      : <span className="text-xs text-muted-foreground">-</span>}
                                  </TableCell>
                                  <TableCell className="text-right text-sm text-muted-foreground pr-4">{fmtP(s.bounceRate ? s.bounceRate * 100 : 0)}</TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      {sources.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">Sem dados de trafego no periodo</p>}
                    </CardContent>
                  </Card>

                  {/* Top Pages */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-sky-500" /> Paginas Mais Visitadas</CardTitle>
                      <CardDescription className="text-xs">Paginas com mais visualizacoes</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30">
                              <TableHead className="text-xs pl-4 min-w-[200px]">Pagina</TableHead>
                              <TableHead className="text-right text-xs">Views</TableHead>
                              <TableHead className="text-right text-xs">Usuarios</TableHead>
                              <TableHead className="text-right text-xs">Rejeicao</TableHead>
                              <TableHead className="text-right text-xs pr-4">Conv.</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pages.slice(0, 12).map((p: any, i: number) => {
                              const barW = Math.max((p.pageViews / maxPageViews) * 100, 4)
                              return (
                                <TableRow key={`${p.pagePath}-${i}`}>
                                  <TableCell className="pl-4">
                                    <div className="space-y-1">
                                      <span className="text-sm font-medium block truncate max-w-[260px]" title={p.pagePath}>{p.pagePath}</span>
                                      <div className="h-1.5 rounded-full bg-muted overflow-hidden w-full max-w-[120px]">
                                        <div className="h-full rounded-full bg-sky-500/60" style={{ width: `${barW}%` }} />
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right text-sm font-semibold">{fmtN(p.pageViews)}</TableCell>
                                  <TableCell className="text-right text-sm text-muted-foreground">{fmtN(p.users)}</TableCell>
                                  <TableCell className="text-right text-sm text-muted-foreground">{fmtP(p.bounceRate ? p.bounceRate * 100 : 0)}</TableCell>
                                  <TableCell className="text-right pr-4">
                                    {p.conversions > 0
                                      ? <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{p.conversions}</span>
                                      : <span className="text-xs text-muted-foreground">-</span>}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      {pages.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">Sem dados de paginas no periodo</p>}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  {/* Geography */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2"><MapPin className="h-4 w-4 text-rose-500" /> Regioes</CardTitle>
                      <CardDescription className="text-xs">Distribuicao geografica dos visitantes</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {geo.slice(0, 10).map((g: any, i: number) => {
                          const barW = Math.max((g.sessions / maxGeoSessions) * 100, 6)
                          return (
                            <div key={`${g.region}-${i}`} className="flex items-center gap-3">
                              <span className="text-xs font-medium w-[120px] truncate text-muted-foreground" title={g.region}>{g.region || '(nao definido)'}</span>
                              <div className="flex-1">
                                <div className="h-6 rounded-md bg-rose-400/15 flex items-center px-2 transition-all" style={{ width: `${barW}%` }}>
                                  <span className="text-[11px] font-bold whitespace-nowrap">{fmtN(g.sessions)}</span>
                                </div>
                              </div>
                              {g.conversions > 0 && (
                                <Badge variant="outline" className="text-[10px] py-0 h-4 shrink-0">{g.conversions} conv.</Badge>
                              )}
                            </div>
                          )
                        })}
                        {geo.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">Sem dados</p>}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Devices */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2"><Monitor className="h-4 w-4 text-violet-500" /> Dispositivos</CardTitle>
                      <CardDescription className="text-xs">Distribuicao por tipo de dispositivo</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {devices.map((d: any, i: number) => {
                          const pct = totalDeviceSessions > 0 ? (d.sessions / totalDeviceSessions) * 100 : 0
                          const DeviceIcon = deviceIcons[d.device?.toLowerCase()] || Monitor
                          const barColor = deviceColors[d.device?.toLowerCase()] || 'bg-gray-500'
                          return (
                            <div key={`${d.device}-${i}`} className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <DeviceIcon className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium capitalize">{d.device || 'Outro'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold">{fmtP(pct)}</span>
                                  <span className="text-xs text-muted-foreground">({fmtN(d.sessions)})</span>
                                </div>
                              </div>
                              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                                <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />
                              </div>
                              {d.conversions > 0 && (
                                <p className="text-[11px] text-muted-foreground">{d.conversions} conversoes</p>
                              )}
                            </div>
                          )
                        })}
                        {devices.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">Sem dados</p>}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Events */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /> Eventos Principais</CardTitle>
                      <CardDescription className="text-xs">Eventos mais disparados no site</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {events.slice(0, 10).map((e: any, i: number) => {
                          const barW = Math.max((e.count / maxEventCount) * 100, 6)
                          return (
                            <div key={`${e.eventName}-${i}`} className="flex items-center gap-3">
                              <span className="text-xs font-medium w-[130px] truncate text-muted-foreground font-mono" title={e.eventName}>{e.eventName}</span>
                              <div className="flex-1">
                                <div className="h-6 rounded-md bg-amber-400/15 flex items-center px-2 transition-all" style={{ width: `${barW}%` }}>
                                  <span className="text-[11px] font-bold whitespace-nowrap">{fmtN(e.count)}</span>
                                </div>
                              </div>
                              <span className="text-[11px] text-muted-foreground shrink-0 w-[50px] text-right">{fmtN(e.users)} usr</span>
                            </div>
                          )
                        })}
                        {events.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">Sem dados</p>}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Reload button */}
                <div className="flex justify-center pt-2">
                  <Button size="sm" variant="outline" onClick={loadGA4} disabled={ga4Loading}>
                    <RefreshCw className={cn('mr-2 h-3.5 w-3.5', ga4Loading && 'animate-spin')} />
                    Atualizar dados GA4
                  </Button>
                </div>
              </>
            )
          })()}
        </TabsContent>
      </Tabs>
    </div>
  )
}
