'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { MetaAdsView, type CampaignInsight } from '@/components/ads/meta-ads-view'

function mapGoogleToInsight(row: any): CampaignInsight {
  return {
    id: row.id,
    campaign_id: row.campaign_id,
    campaign_name: row.campaign_name,
    date: row.date,
    impressions: Number(row.impressions || 0),
    reach: 0,
    clicks: Number(row.clicks || 0),
    link_clicks: Number(row.clicks || 0),
    spend: Number(row.spend || 0),
    cpc: Number(row.cpc || 0),
    cpm: Number(row.cpm || 0),
    ctr: Number(row.ctr || 0),
    leads: Number(row.leads || row.conversions || 0),
    cost_per_lead: Number(row.cost_per_lead || row.cost_per_conversion || 0),
    frequency: 0,
  }
}

export default function SharedGoogleAdsPage() {
  const params = useParams()
  const token = params.token as string

  const [insights, setInsights] = useState<CampaignInsight[]>([])
  const [title, setTitle] = useState<string>('')
  const [defaultFilters, setDefaultFilters] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    ;(async () => {
      try {
        const res = await fetch(`/api/share/google-ads/${token}/insights`, { cache: 'no-store' })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          if (res.status === 404) throw new Error('Link inválido ou removido')
          if (res.status === 403) throw new Error(j.error === 'expired' ? 'Link expirado' : 'Acesso revogado')
          throw new Error(j.error || 'Erro ao carregar')
        }
        const data = await res.json()
        setInsights((data.insights || []).map(mapGoogleToInsight))
        setTitle(data.title || '')
        setDefaultFilters(data.default_filters || {})
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background p-6">
        <h1 className="text-2xl font-bold">Não foi possível carregar</h1>
        <p className="text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        <MetaAdsView
          insights={insights}
          orgName={title || 'Relatório Google Ads'}
          mode="share"
          defaultFilters={defaultFilters}
        />
        <footer className="mt-10 pt-6 border-t text-center text-xs text-muted-foreground">
          Dados sincronizados diariamente da API do Google Ads
        </footer>
      </div>
    </div>
  )
}
