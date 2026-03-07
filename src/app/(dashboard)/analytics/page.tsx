'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Eye, Users, Globe, DollarSign, MousePointerClick, TrendingUp, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useOrganizationContext } from '@/contexts/organization-context'
import { getAnalyticsData, getIntegrations } from '@/lib/supabase/integrations'
import { useToast } from '@/components/ui/use-toast'
import type { AnalyticsData, Integration } from '@/lib/types'

export default function AnalyticsPage() {
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()
  const [period, setPeriod] = useState('30')
  const [data, setData] = useState<AnalyticsData[]>([])
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (currentOrg) loadData()
  }, [currentOrg, period])

  const loadData = async () => {
    if (!currentOrg) return
    setLoading(true)
    try {
      const [ints, analytics] = await Promise.all([
        getIntegrations(currentOrg.id),
        getAnalyticsData(currentOrg.id),
      ])
      setIntegrations(ints)
      setData(analytics)
    } catch (error) {
      console.error('Erro ao carregar analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    if (!currentOrg) return
    setSyncing(true)
    try {
      const end = new Date().toISOString().split('T')[0]
      const start = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const response = await fetch('/api/analytics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: currentOrg.id, period_start: start, period_end: end }),
      })
      const result = await response.json()
      toast({ title: 'Sincronizacao concluida', description: `${result.synced} integracao(oes) atualizada(s).` })
      await loadData()
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha na sincronizacao.', variant: 'destructive' })
    } finally {
      setSyncing(false)
    }
  }

  const activeIntegrations = integrations.filter((i) => i.is_active)
  const hasGA4 = activeIntegrations.some((i) => i.provider === 'google_analytics')
  const hasMeta = activeIntegrations.some((i) => i.provider === 'meta_ads')

  // Extract metrics from data
  const gaOverview = data.find((d) => d.metric_type === 'page_views')
  const adSpend = data.find((d) => d.metric_type === 'ad_spend')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">
            Dados consolidados de trafego e anuncios.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Ultimos 7 dias</SelectItem>
              <SelectItem value="30">Ultimos 30 dias</SelectItem>
              <SelectItem value="90">Ultimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSync} disabled={syncing || activeIntegrations.length === 0}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
        </div>
      </div>

      {activeIntegrations.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma integracao configurada</h3>
            <p className="text-muted-foreground">
              Configure o Google Analytics ou Meta Ads em{' '}
              <a href="/settings" className="text-primary underline">Configuracoes &gt; Integracoes</a>
              {' '}para ver os dados aqui.
            </p>
          </CardContent>
        </Card>
      )}

      {/* GA4 Section */}
      {hasGA4 && (
        <>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Google Analytics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KpiCard icon={Eye} label="Page Views" value={extractMetric(gaOverview, 'screenPageViews')} />
            <KpiCard icon={Globe} label="Sessoes" value={extractMetric(gaOverview, 'sessions')} />
            <KpiCard icon={Users} label="Usuarios" value={extractMetric(gaOverview, 'totalUsers')} />
            <KpiCard icon={TrendingUp} label="Bounce Rate" value={extractMetric(gaOverview, 'bounceRate', true)} />
          </div>
        </>
      )}

      {/* Meta Ads Section */}
      {hasMeta && (
        <>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5" /> Meta Ads
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KpiCard icon={DollarSign} label="Investimento" value={extractMetric(adSpend, 'spend', false, 'R$ ')} />
            <KpiCard icon={Eye} label="Impressoes" value={extractMetric(adSpend, 'impressions')} />
            <KpiCard icon={MousePointerClick} label="Cliques" value={extractMetric(adSpend, 'clicks')} />
            <KpiCard icon={TrendingUp} label="CTR" value={extractMetric(adSpend, 'ctr', true)} />
          </div>
        </>
      )}
    </div>
  )
}

function KpiCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

function extractMetric(data: AnalyticsData | undefined, key: string, isPercent = false, prefix = ''): string {
  if (!data?.data) return '-'

  try {
    // GA4 response format
    const rows = data.data.rows
    if (rows && rows.length > 0) {
      const metricValues = rows[0].metricValues
      if (metricValues) {
        const headers = data.data.metricHeaders
        const idx = headers?.findIndex((h: any) => h.name === key)
        if (idx !== undefined && idx >= 0 && metricValues[idx]) {
          const val = parseFloat(metricValues[idx].value)
          if (isPercent) return `${(val * 100).toFixed(1)}%`
          return `${prefix}${val.toLocaleString('pt-BR')}`
        }
      }
    }

    // Meta response format
    const metaData = data.data.data
    if (metaData && metaData.length > 0) {
      const val = metaData[0][key]
      if (val !== undefined) {
        if (isPercent) return `${parseFloat(val).toFixed(2)}%`
        return `${prefix}${parseFloat(val).toLocaleString('pt-BR')}`
      }
    }
  } catch {
    // ignore parsing errors
  }

  return '-'
}
