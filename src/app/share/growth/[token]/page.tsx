'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, DollarSign, Users, Target, TrendingUp, ShoppingCart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function fmtBRL(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtNum(v: number) { return v.toLocaleString('pt-BR') }
function fmtPct(v: number) { return v.toFixed(1) + '%' }

export default function SharedGrowthPage() {
  const params = useParams()
  const token = params.token as string

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    ;(async () => {
      try {
        const res = await fetch(`/api/share/growth/${token}/data`, { cache: 'no-store' })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          if (res.status === 404) throw new Error('Link inválido')
          if (res.status === 403) throw new Error(j.error === 'expired' ? 'Link expirado' : 'Acesso revogado')
          throw new Error(j.error || 'Erro')
        }
        setData(await res.json())
      } catch (e: any) { setError(e.message) }
      finally { setLoading(false) }
    })()
  }, [token])

  const metrics = useMemo(() => {
    if (!data) return null
    const campaigns = data.campaigns || []
    const deals = data.deals || []
    const spend = campaigns.reduce((s: number, c: any) => s + Number(c.spend || 0), 0)
    const impressions = campaigns.reduce((s: number, c: any) => s + Number(c.impressions || 0), 0)
    const clicks = campaigns.reduce((s: number, c: any) => s + Number(c.clicks || 0), 0)
    const leads = campaigns.reduce((s: number, c: any) => s + Number(c.leads || 0), 0)
    const won = deals.filter((d: any) => d.status === 'won')
    const lost = deals.filter((d: any) => d.status === 'lost')
    const open = deals.filter((d: any) => d.status === 'open')
    const wonValue = won.reduce((s: number, d: any) => s + Number(d.value || 0), 0)
    const winRate = (won.length + lost.length) > 0 ? (won.length / (won.length + lost.length)) * 100 : 0
    const cpl = leads > 0 ? spend / leads : 0
    const roas = spend > 0 ? wonValue / spend : 0
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
    return {
      spend, impressions, clicks, leads, ctr, cpl, roas,
      total_deals: deals.length, won: won.length, lost: lost.length, open: open.length,
      wonValue, winRate,
    }
  }, [data])

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Carregando análise...</p>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
      <h1 className="text-2xl font-bold">Não foi possível carregar</h1>
      <p className="text-muted-foreground">{error}</p>
    </div>
  )

  if (!metrics) return null

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{data.title || 'Análise de Marketing e Vendas'}</h1>
          <p className="text-sm text-muted-foreground">
            {data.org_name} — Funil completo: investimento → leads → CRM → vendas
          </p>
        </div>

        {/* Funil */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Funil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <FunnelStep label="Impressões" value={fmtNum(metrics.impressions)} color="bg-blue-500" />
              <FunnelStep label="Cliques" value={fmtNum(metrics.clicks)} sub={`CTR ${fmtPct(metrics.ctr)}`} color="bg-violet-500" />
              <FunnelStep label="Leads" value={fmtNum(metrics.leads)} sub={`CPL ${fmtBRL(metrics.cpl)}`} color="bg-emerald-500" />
              <FunnelStep label="Negócios" value={fmtNum(metrics.total_deals)} sub={`${metrics.open} abertos`} color="bg-amber-500" />
              <FunnelStep label="Vendas" value={fmtNum(metrics.won)} sub={`Win ${fmtPct(metrics.winRate)}`} color="bg-rose-500" />
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Kpi title="Investimento" value={fmtBRL(metrics.spend)} icon={DollarSign} color="bg-amber-500" />
          <Kpi title="Leads" value={fmtNum(metrics.leads)} sub={`CPL ${fmtBRL(metrics.cpl)}`} icon={Users} color="bg-emerald-500" />
          <Kpi title="Vendas (R$)" value={fmtBRL(metrics.wonValue)} sub={`${metrics.won} negócios`} icon={ShoppingCart} color="bg-rose-500" />
          <Kpi title="ROAS" value={metrics.roas.toFixed(2) + 'x'} sub={`Win rate ${fmtPct(metrics.winRate)}`} icon={Target} color="bg-blue-500" />
        </div>

        {/* Conversões */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Taxas de conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold">{metrics.clicks > 0 ? fmtPct((metrics.leads / metrics.clicks) * 100) : '—'}</div>
                <div className="text-xs text-muted-foreground mt-1">Click → Lead</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{metrics.leads > 0 ? fmtPct((metrics.total_deals / metrics.leads) * 100) : '—'}</div>
                <div className="text-xs text-muted-foreground mt-1">Lead → Negócio</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{fmtPct(metrics.winRate)}</div>
                <div className="text-xs text-muted-foreground mt-1">Negócio → Venda</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <footer className="text-center text-xs text-muted-foreground pt-6 border-t">
          Dados consolidados — Meta Ads, Pipedrive
        </footer>
      </div>
    </div>
  )
}

function FunnelStep({ label, value, sub, color }: any) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/30 border">
      <div className={`w-8 h-8 rounded-full ${color} mb-2`} />
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  )
}

function Kpi({ title, value, sub, icon: Icon, color }: any) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
