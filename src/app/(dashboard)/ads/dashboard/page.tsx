'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Copy, Check, ExternalLink, Trash2 } from 'lucide-react'
import { useOrganizationContext } from '@/contexts/organization-context'
import { createClient } from '@/lib/supabase/client'
import { MetaAdsView, type CampaignInsight } from '@/components/ads/meta-ads-view'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface Share {
  id: string
  token: string
  title: string | null
  url: string
  created_at: string
  view_count: number
  last_viewed_at: string | null
  is_active: boolean
}

export default function AdsDashboardPage() {
  const { currentOrg } = useOrganizationContext()
  const orgId = currentOrg?.id

  const [insights, setInsights] = useState<CampaignInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shares, setShares] = useState<Share[]>([])
  const [creatingShare, setCreatingShare] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [shareTitle, setShareTitle] = useState('')

  useEffect(() => { if (orgId) loadInsights() }, [orgId]) // eslint-disable-line

  const loadInsights = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('meta_campaign_insights')
        .select('id,campaign_id,campaign_name,date,impressions,reach,clicks,link_clicks,spend,cpc,cpm,ctr,leads,cost_per_lead,frequency')
        .eq('org_id', orgId)
        .order('date', { ascending: false })
      if (error) throw error
      setInsights((data || []) as CampaignInsight[])
    } catch (e) {
      console.error('Erro ao carregar insights:', e)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  const handleSync = async () => {
    if (!orgId) return
    setSyncing(true)
    try {
      const res = await fetch('/api/meta-ads/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, daysBack: 30, syncLevels: ['campaigns'] }),
      })
      const data = await res.json()
      if (data.success) await loadInsights()
    } finally {
      setSyncing(false)
    }
  }

  const loadShares = async () => {
    if (!orgId) return
    const res = await fetch(`/api/dashboards/share?orgId=${orgId}`)
    if (res.ok) setShares(await res.json())
  }

  const openShare = async () => {
    setShareOpen(true)
    await loadShares()
  }

  const createShare = async () => {
    if (!orgId) return
    setCreatingShare(true)
    try {
      const res = await fetch('/api/dashboards/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          dashboardType: 'meta-ads',
          title: shareTitle || `Meta Ads — ${currentOrg?.name}`,
        }),
      })
      if (res.ok) {
        setShareTitle('')
        await loadShares()
      }
    } finally {
      setCreatingShare(false)
    }
  }

  const revokeShare = async (id: string) => {
    if (!confirm('Revogar este link? Quem tiver acesso não conseguirá mais abrir.')) return
    await fetch(`/api/dashboards/share?id=${id}`, { method: 'DELETE' })
    await loadShares()
  }

  const copy = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
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
    <>
      <MetaAdsView
        insights={insights}
        orgName={currentOrg?.name || ''}
        mode="auth"
        onSync={handleSync}
        syncing={syncing}
        onShare={openShare}
      />

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Compartilhar Dashboard Meta Ads</DialogTitle>
            <DialogDescription>
              Crie links públicos para compartilhar este dashboard. Quem tiver o link consegue ver os dados sem fazer login.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Input
                placeholder={`Ex: Relatório CEO ${currentOrg?.name}`}
                value={shareTitle}
                onChange={(e) => setShareTitle(e.target.value)}
              />
              <Button onClick={createShare} disabled={creatingShare}>
                {creatingShare ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Gerar link'}
              </Button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {shares.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum link criado ainda
                </p>
              )}
              {shares.map((s) => (
                <div key={s.id} className={`border rounded-lg p-3 space-y-2 ${!s.is_active && 'opacity-50'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.title || 'Sem título'}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.view_count} visualizaç{s.view_count === 1 ? 'ão' : 'ões'}
                        {s.last_viewed_at && ` · última em ${new Date(s.last_viewed_at).toLocaleString('pt-BR')}`}
                        {!s.is_active && ' · REVOGADO'}
                      </p>
                    </div>
                    {s.is_active && (
                      <Button variant="ghost" size="sm" onClick={() => revokeShare(s.id)} title="Revogar">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  {s.is_active && (
                    <div className="flex items-center gap-1.5">
                      <Input value={s.url} readOnly className="text-xs h-8 font-mono" />
                      <Button variant="outline" size="sm" onClick={() => copy(s.url, s.id)} className="h-8 px-2">
                        {copied === s.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                      <a href={s.url} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm" className="h-8 px-2">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShareOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
