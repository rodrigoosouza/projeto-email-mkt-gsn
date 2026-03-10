'use client'

import { useEffect, useState } from 'react'
import {
  Plus,
  Loader2,
  Trash2,
  Sparkles,
  Target,
  DollarSign,
  Eye,
  Users,
  MousePointerClick,
  TrendingUp,
  Facebook,
  Search,
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
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import {
  getAdCampaigns,
  deleteAdCampaign,
  type AdCampaign,
} from '@/lib/supabase/ad-campaigns'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  ready: 'Pronto',
  active: 'Ativo',
  paused: 'Pausado',
  completed: 'Concluido',
  failed: 'Falhou',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  ready: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  completed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

const TYPE_LABELS: Record<string, string> = {
  lead_generation: 'Geracao de Leads',
  traffic: 'Trafego',
  conversion: 'Conversao',
  awareness: 'Alcance',
  engagement: 'Engajamento',
  retargeting: 'Retargeting',
}

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  meta_ads: Facebook,
  google_ads: Search,
}

export default function AdsPage() {
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()
  const orgId = currentOrg?.id

  const [campaigns, setCampaigns] = useState<AdCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [genPlatform, setGenPlatform] = useState('all')
  const [genObjective, setGenObjective] = useState('lead_generation')
  const [viewCampaign, setViewCampaign] = useState<AdCampaign | null>(null)

  useEffect(() => {
    if (!orgId) return
    loadCampaigns()
  }, [orgId])

  async function loadCampaigns() {
    if (!orgId) return
    setLoading(true)
    try {
      const data = await getAdCampaigns(orgId)
      setCampaigns(data)
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerate() {
    if (!orgId) return
    setGenerating(true)
    try {
      const platforms = genPlatform === 'all' ? ['meta_ads', 'google_ads'] : [genPlatform]
      const res = await fetch('/api/ads/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, platforms, objective: genObjective }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast({ title: `${data.count} campanhas geradas com sucesso!` })
      setShowGenerate(false)
      loadCampaigns()
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteAdCampaign(id)
      setCampaigns((prev) => prev.filter((c) => c.id !== id))
      toast({ title: 'Campanha excluida' })
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  const metaCampaigns = campaigns.filter((c) => c.platform === 'meta_ads')
  const googleCampaigns = campaigns.filter((c) => c.platform === 'google_ads')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Campanhas de Ads</h2>
          <p className="text-muted-foreground">
            Gere campanhas de Meta Ads e Google Ads com IA baseadas na sua estrategia.
          </p>
        </div>
        <Button onClick={() => setShowGenerate(true)}>
          <Sparkles className="mr-2 h-4 w-4" />
          Gerar Campanhas com IA
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Campanhas</p>
                <p className="text-2xl font-bold">{campaigns.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Facebook className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Meta Ads</p>
                <p className="text-2xl font-bold">{metaCampaigns.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Google Ads</p>
                <p className="text-2xl font-bold">{googleCampaigns.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Budget Diario Total</p>
                <p className="text-2xl font-bold">
                  R$ {campaigns.reduce((sum, c) => sum + (c.budget_daily || 0), 0).toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campanhas</CardTitle>
          <CardDescription>
            Gerencie suas campanhas de trafego pago.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">Nenhuma campanha de ads</h3>
              <p className="text-muted-foreground mt-1">
                Gere campanhas automaticamente com IA baseadas na sua estrategia.
              </p>
              <Button className="mt-4" onClick={() => setShowGenerate(true)}>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar Campanhas
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Budget/dia</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criativos</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => {
                  const PlatformIcon = PLATFORM_ICONS[campaign.platform] || Target
                  return (
                    <TableRow
                      key={campaign.id}
                      className="cursor-pointer"
                      onClick={() => setViewCampaign(campaign)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <PlatformIcon className="h-4 w-4" />
                          <span className="text-sm">
                            {campaign.platform === 'meta_ads' ? 'Meta' : 'Google'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {campaign.name}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {TYPE_LABELS[campaign.campaign_type] || campaign.campaign_type}
                        </span>
                      </TableCell>
                      <TableCell>
                        {campaign.budget_daily ? `R$ ${campaign.budget_daily}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[campaign.status]}>
                          {STATUS_LABELS[campaign.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(campaign.ad_creatives?.length || 0) + (campaign.copy_variants?.length || 0)} variantes
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(campaign.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Generate Dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Campanhas com IA</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Plataforma</label>
              <Select value={genPlatform} onValueChange={setGenPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Meta Ads + Google Ads</SelectItem>
                  <SelectItem value="meta_ads">Apenas Meta Ads</SelectItem>
                  <SelectItem value="google_ads">Apenas Google Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Objetivo Principal</label>
              <Select value={genObjective} onValueChange={setGenObjective}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead_generation">Geracao de Leads</SelectItem>
                  <SelectItem value="traffic">Trafego</SelectItem>
                  <SelectItem value="conversion">Conversao</SelectItem>
                  <SelectItem value="awareness">Alcance/Marca</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              A IA criara 3 campanhas por plataforma (topo, meio e fundo de funil) baseadas na sua estrategia de marketing.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerate(false)} disabled={generating}>
              Cancelar
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {generating ? 'Gerando...' : 'Gerar Campanhas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Campaign Dialog */}
      <Dialog open={!!viewCampaign} onOpenChange={() => setViewCampaign(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {viewCampaign && (
            <>
              <DialogHeader>
                <DialogTitle>{viewCampaign.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Plataforma</p>
                    <p className="font-medium">
                      {viewCampaign.platform === 'meta_ads' ? 'Meta Ads' : 'Google Ads'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    <p className="font-medium">
                      {TYPE_LABELS[viewCampaign.campaign_type]}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Budget Diario</p>
                    <p className="font-medium">
                      R$ {viewCampaign.budget_daily || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Objetivo</p>
                    <p className="font-medium">{viewCampaign.objective || '-'}</p>
                  </div>
                </div>

                {/* Target Audience */}
                {viewCampaign.target_audience && Object.keys(viewCampaign.target_audience).length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Publico-alvo</p>
                    <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                      {Object.entries(viewCampaign.target_audience).map(([key, val]) => (
                        <div key={key} className="flex gap-2">
                          <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                          <span>{Array.isArray(val) ? (val as string[]).join(', ') : String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ad Creatives */}
                {viewCampaign.ad_creatives && viewCampaign.ad_creatives.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Criativos</p>
                    <div className="space-y-2">
                      {viewCampaign.ad_creatives.map((creative, i) => (
                        <div key={i} className="border rounded-lg p-3 space-y-1">
                          <p className="font-medium text-sm">{creative.headline}</p>
                          <p className="text-sm text-muted-foreground">{creative.description}</p>
                          {creative.image_prompt && (
                            <p className="text-xs text-blue-600">Prompt imagem: {creative.image_prompt}</p>
                          )}
                          <Badge variant="outline">{creative.cta}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Copy Variants */}
                {viewCampaign.copy_variants && viewCampaign.copy_variants.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Variantes de Copy</p>
                    <div className="space-y-2">
                      {viewCampaign.copy_variants.map((variant, i) => (
                        <div key={i} className="border rounded-lg p-3 space-y-1">
                          <p className="text-sm">{variant.primary_text}</p>
                          <p className="text-xs text-muted-foreground">
                            <strong>Headline:</strong> {variant.headline}
                          </p>
                          <Badge variant="outline">{variant.cta}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewCampaign(null)}>
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
