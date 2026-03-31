// @ts-nocheck
'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Loader2,
  Search,
  MapPin,
  Star,
  Phone,
  Globe,
  Sparkles,
  UserPlus,
  ChevronDown,
  ExternalLink,
  Mail,
  Instagram,
  Linkedin,
  Facebook,
  Building2,
  RefreshCw,
  Eye,
  MessageSquare,
  TrendingUp,
  Users,
  CheckCircle2,
  BarChart3,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Prospect {
  id: string
  org_id: string
  place_id: string
  name: string
  address: string
  phone: string | null
  website: string | null
  rating: number | null
  total_ratings: number
  business_type: string | null
  email: string | null
  owner_name: string | null
  instagram: string | null
  facebook: string | null
  linkedin: string | null
  description: string | null
  search_query: string | null
  search_location: string | null
  search_segment: string | null
  status: string
  notes: string | null
  converted_to_lead_id: string | null
  latitude: number | null
  longitude: number | null
  photos: string[]
  opening_hours: Record<string, unknown>
  enriched: boolean
  enriched_at: string | null
  created_at: string
  updated_at: string
}

interface DashboardData {
  total: number
  statusCounts: Record<string, number>
  segmentCounts: Record<string, number>
  enrichedCount: number
  enrichmentRate: number
  convertedCount: number
  conversionRate: number
  abordadosCount: number
  recentSearches: {
    id: string
    query: string
    location: string
    segment: string
    radius_km: number
    results_count: number
    created_at: string
  }[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEGMENTS = [
  'Consultoria',
  'Tecnologia',
  'Alimentacao',
  'Saude',
  'Educacao',
  'Varejo',
  'Servicos',
  'Industria',
  'Outro',
]

const RADIUS_OPTIONS = [
  { label: '10 km', value: '10' },
  { label: '25 km', value: '25' },
  { label: '50 km', value: '50' },
  { label: '100 km', value: '100' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  novo: { label: 'Novo', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  qualificado: { label: 'Qualificado', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  abordado: { label: 'Abordado', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  respondeu: { label: 'Respondeu', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  converteu: { label: 'Converteu', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  descartado: { label: 'Descartado', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#6366f1']

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProspectionPage() {
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()
  const orgId = currentOrg?.id

  // Search tab
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLocation, setSearchLocation] = useState('')
  const [searchSegment, setSearchSegment] = useState('Consultoria')
  const [searchRadius, setSearchRadius] = useState('50')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Prospect[]>([])
  const [searchTotal, setSearchTotal] = useState(0)

  // Prospects tab
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [prospectsTotal, setProspectsTotal] = useState(0)
  const [prospectsLoading, setProspectsLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSegment, setFilterSegment] = useState('all')
  const [filterEnriched, setFilterEnriched] = useState('all')
  const [filterSearch, setFilterSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set())

  // Detail dialog
  const [detailProspect, setDetailProspect] = useState<Prospect | null>(null)
  const [editNotes, setEditNotes] = useState('')

  // Dashboard tab
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)

  // Batch enrich
  const [batchEnriching, setBatchEnriching] = useState(false)

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const loadProspects = useCallback(async () => {
    if (!orgId) return
    setProspectsLoading(true)
    try {
      const params = new URLSearchParams({ orgId })
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (filterSegment !== 'all') params.set('segment', filterSegment)
      if (filterEnriched !== 'all') params.set('enriched', filterEnriched)
      if (filterSearch) params.set('search', filterSearch)

      const res = await fetch(`/api/prospection/prospects?${params}`)
      const data = await res.json()
      if (res.ok) {
        setProspects(data.prospects)
        setProspectsTotal(data.total)
      }
    } catch (err) {
      console.error('Error loading prospects:', err)
    } finally {
      setProspectsLoading(false)
    }
  }, [orgId, filterStatus, filterSegment, filterEnriched, filterSearch])

  const loadDashboard = useCallback(async () => {
    if (!orgId) return
    setDashboardLoading(true)
    try {
      const res = await fetch(`/api/prospection/dashboard?orgId=${orgId}`)
      const data = await res.json()
      if (res.ok) {
        setDashboard(data)
      }
    } catch (err) {
      console.error('Error loading dashboard:', err)
    } finally {
      setDashboardLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    loadProspects()
  }, [loadProspects])

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleSearch = async () => {
    if (!orgId || !searchQuery || !searchLocation) {
      toast({ title: 'Preencha o que procura e onde', variant: 'destructive' })
      return
    }

    setSearching(true)
    try {
      const res = await fetch('/api/prospection/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          query: searchQuery,
          location: searchLocation,
          segment: searchSegment,
          radiusKm: parseInt(searchRadius, 10),
          maxResults: 20,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setSearchResults(data.prospects || [])
        setSearchTotal(data.total || 0)
        toast({
          title: `${data.total} empresas encontradas`,
          description: `Resultados para "${searchQuery}" em ${searchLocation}`,
        })
      } else {
        toast({ title: 'Erro na busca', description: data.error, variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Erro na busca', description: 'Tente novamente', variant: 'destructive' })
    } finally {
      setSearching(false)
    }
  }

  const handleEnrich = async (prospectId: string) => {
    setEnrichingIds((prev) => new Set(prev).add(prospectId))
    try {
      const res = await fetch('/api/prospection/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectId }),
      })

      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Prospecto enriquecido', description: `Dados extraidos para ${data.prospect?.name}` })
        // Update in search results
        setSearchResults((prev) =>
          prev.map((p) => (p.id === prospectId ? { ...p, ...data.prospect } : p))
        )
        // Update in prospects list
        setProspects((prev) =>
          prev.map((p) => (p.id === prospectId ? { ...p, ...data.prospect } : p))
        )
      } else {
        toast({ title: 'Erro ao enriquecer', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro ao enriquecer', variant: 'destructive' })
    } finally {
      setEnrichingIds((prev) => {
        const next = new Set(prev)
        next.delete(prospectId)
        return next
      })
    }
  }

  const handleBatchEnrich = async () => {
    if (!orgId) return
    setBatchEnriching(true)
    try {
      const res = await fetch('/api/prospection/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId }),
      })

      const data = await res.json()
      if (res.ok) {
        toast({
          title: `${data.enriched} prospectos enriquecidos`,
          description: `De ${data.total} processados`,
        })
        loadProspects()
      } else {
        toast({ title: 'Erro', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro ao enriquecer em lote', variant: 'destructive' })
    } finally {
      setBatchEnriching(false)
    }
  }

  const handleStatusChange = async (prospectId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/prospection/prospects/${prospectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        setProspects((prev) =>
          prev.map((p) => (p.id === prospectId ? { ...p, status: newStatus } : p))
        )
        toast({ title: `Status alterado para ${STATUS_CONFIG[newStatus]?.label || newStatus}` })
      }
    } catch {
      toast({ title: 'Erro ao alterar status', variant: 'destructive' })
    }
  }

  const handleConvertToLead = async (prospectId: string) => {
    try {
      const res = await fetch(`/api/prospection/prospects/${prospectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Convertido em lead!', description: `Lead criado: ${data.lead?.first_name}` })
        setProspects((prev) =>
          prev.map((p) =>
            p.id === prospectId
              ? { ...p, status: 'converteu', converted_to_lead_id: data.lead?.id }
              : p
          )
        )
      } else {
        toast({ title: 'Erro ao converter', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro ao converter em lead', variant: 'destructive' })
    }
  }

  const handleSaveNotes = async () => {
    if (!detailProspect) return
    try {
      const res = await fetch(`/api/prospection/prospects/${detailProspect.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: editNotes }),
      })

      if (res.ok) {
        setProspects((prev) =>
          prev.map((p) => (p.id === detailProspect.id ? { ...p, notes: editNotes } : p))
        )
        setDetailProspect(null)
        toast({ title: 'Notas salvas' })
      }
    } catch {
      toast({ title: 'Erro ao salvar notas', variant: 'destructive' })
    }
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderStars = (rating: number | null) => {
    if (!rating) return null
    return (
      <div className="flex items-center gap-1">
        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
        <span className="text-sm font-medium">{rating.toFixed(1)}</span>
      </div>
    )
  }

  const renderStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.novo
    return <Badge className={cn('text-xs', config.color)}>{config.label}</Badge>
  }

  // ---------------------------------------------------------------------------
  // Tab: Buscar Empresas
  // ---------------------------------------------------------------------------

  const renderSearchTab = () => (
    <div className="space-y-6">
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Empresas no Google
          </CardTitle>
          <CardDescription>
            Encontre empresas via Google Places para prospectar novos clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2 lg:col-span-2">
              <Label>O que procura?</Label>
              <Input
                placeholder="ex: consultoria empresarial, restaurante italiano"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="space-y-2">
              <Label>Onde?</Label>
              <Input
                placeholder="ex: Sao Paulo, SP"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="space-y-2">
              <Label>Segmento</Label>
              <Select value={searchSegment} onValueChange={setSearchSegment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEGMENTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Raio</Label>
              <Select value={searchRadius} onValueChange={setSearchRadius}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RADIUS_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleSearch}
            disabled={searching || !searchQuery || !searchLocation}
            className="mt-4"
          >
            {searching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            {searching ? 'Buscando...' : 'Buscar Empresas'}
          </Button>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {searchTotal} empresas encontradas
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {searchResults.map((prospect) => (
              <Card key={prospect.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate font-semibold">{prospect.name}</h4>
                        <p className="truncate text-sm text-muted-foreground">
                          <MapPin className="mr-1 inline h-3 w-3" />
                          {prospect.address}
                        </p>
                      </div>
                      {renderStars(prospect.rating)}
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm">
                      {prospect.phone && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {prospect.phone}
                        </span>
                      )}
                      {prospect.website && (
                        <a
                          href={prospect.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Globe className="h-3 w-3" />
                          Site
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    {prospect.enriched && (
                      <div className="flex flex-wrap gap-2 text-sm">
                        {prospect.email && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {prospect.email}
                          </span>
                        )}
                        {prospect.owner_name && (
                          <span className="text-muted-foreground">
                            Resp: {prospect.owner_name}
                          </span>
                        )}
                      </div>
                    )}

                    {prospect.total_ratings > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {prospect.total_ratings} avaliacoes
                      </p>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEnrich(prospect.id)}
                        disabled={enrichingIds.has(prospect.id) || prospect.enriched}
                      >
                        {enrichingIds.has(prospect.id) ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="mr-1 h-3 w-3" />
                        )}
                        {prospect.enriched ? 'Enriquecido' : 'Enriquecer'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleConvertToLead(prospect.id)}
                        disabled={!!prospect.converted_to_lead_id}
                      >
                        <UserPlus className="mr-1 h-3 w-3" />
                        {prospect.converted_to_lead_id ? 'Convertido' : 'Converter'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  // ---------------------------------------------------------------------------
  // Tab: Prospectos
  // ---------------------------------------------------------------------------

  const renderProspectsTab = () => (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Segmento</Label>
              <Select value={filterSegment} onValueChange={(v) => { setFilterSegment(v); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {SEGMENTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Enriquecido</Label>
              <Select value={filterEnriched} onValueChange={(v) => { setFilterEnriched(v); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Sim</SelectItem>
                  <SelectItem value="false">Nao</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-2">
              <Label>Buscar</Label>
              <Input
                placeholder="Nome, email, telefone..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
              />
            </div>

            <Button variant="outline" onClick={loadProspects}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>

            <Button
              variant="secondary"
              onClick={handleBatchEnrich}
              disabled={batchEnriching}
            >
              {batchEnriching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Enriquecer em Lote
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {prospectsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : prospects.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <MapPin className="mx-auto mb-2 h-8 w-8" />
              <p>Nenhum prospecto encontrado</p>
              <p className="text-sm">Use a aba "Buscar Empresas" para comecar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Telefone</TableHead>
                    <TableHead className="hidden lg:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Website</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="hidden md:table-cell">Segmento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Data</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prospects.map((p) => (
                    <>
                      <TableRow
                        key={p.id}
                        className="cursor-pointer"
                        onClick={() =>
                          setExpandedId(expandedId === p.id ? null : p.id)
                        }
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {p.address}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {p.phone || '-'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {p.email || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {p.website ? (
                            <a
                              href={p.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Globe className="inline h-3 w-3 mr-1" />
                              Site
                            </a>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{renderStars(p.rating)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {p.search_segment || '-'}
                        </TableCell>
                        <TableCell>{renderStatusBadge(p.status)}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                          {format(new Date(p.created_at), 'dd/MM/yy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                  <DropdownMenuItem
                                    key={key}
                                    onClick={() => handleStatusChange(p.id, key)}
                                    disabled={p.status === key}
                                  >
                                    {config.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEnrich(p.id)}
                              disabled={enrichingIds.has(p.id) || p.enriched}
                              title="Enriquecer"
                            >
                              {enrichingIds.has(p.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Sparkles className="h-4 w-4" />
                              )}
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleConvertToLead(p.id)}
                              disabled={!!p.converted_to_lead_id}
                              title="Converter em Lead"
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDetailProspect(p)
                                setEditNotes(p.notes || '')
                              }}
                              title="Notas"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded row */}
                      {expandedId === p.id && (
                        <TableRow key={`${p.id}-expanded`}>
                          <TableCell colSpan={9} className="bg-muted/50 p-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                              <div>
                                <h4 className="mb-2 text-sm font-semibold">Dados Google</h4>
                                <div className="space-y-1 text-sm">
                                  <p><strong>Endereco:</strong> {p.address}</p>
                                  <p><strong>Telefone:</strong> {p.phone || '-'}</p>
                                  <p><strong>Rating:</strong> {p.rating?.toFixed(1) || '-'} ({p.total_ratings} avaliacoes)</p>
                                  <p><strong>Tipo:</strong> {p.business_type || '-'}</p>
                                </div>
                              </div>

                              {p.enriched && (
                                <div>
                                  <h4 className="mb-2 text-sm font-semibold">Dados Enriquecidos</h4>
                                  <div className="space-y-1 text-sm">
                                    {p.email && (
                                      <p className="flex items-center gap-1">
                                        <Mail className="h-3 w-3" /> {p.email}
                                      </p>
                                    )}
                                    {p.owner_name && (
                                      <p><strong>Responsavel:</strong> {p.owner_name}</p>
                                    )}
                                    {p.instagram && (
                                      <p className="flex items-center gap-1">
                                        <Instagram className="h-3 w-3" /> {p.instagram}
                                      </p>
                                    )}
                                    {p.facebook && (
                                      <p className="flex items-center gap-1">
                                        <Facebook className="h-3 w-3" /> {p.facebook}
                                      </p>
                                    )}
                                    {p.linkedin && (
                                      <p className="flex items-center gap-1">
                                        <Linkedin className="h-3 w-3" /> {p.linkedin}
                                      </p>
                                    )}
                                    {p.description && (
                                      <p className="mt-2 text-muted-foreground">{p.description}</p>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div>
                                <h4 className="mb-2 text-sm font-semibold">Contexto</h4>
                                <div className="space-y-1 text-sm">
                                  <p><strong>Busca:</strong> {p.search_query}</p>
                                  <p><strong>Local:</strong> {p.search_location}</p>
                                  <p><strong>Segmento:</strong> {p.search_segment || '-'}</p>
                                  {p.notes && (
                                    <div className="mt-2 rounded bg-background p-2 text-xs">
                                      <strong>Notas:</strong> {p.notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        {prospectsTotal} prospectos no total
      </div>
    </div>
  )

  // ---------------------------------------------------------------------------
  // Tab: Dashboard
  // ---------------------------------------------------------------------------

  const renderDashboardTab = () => {
    if (!dashboard && !dashboardLoading) {
      loadDashboard()
    }

    const segmentData = dashboard
      ? Object.entries(dashboard.segmentCounts).map(([name, value]) => ({
          name,
          value,
        }))
      : []

    return (
      <div className="space-y-6">
        {dashboardLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : dashboard ? (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                      <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{dashboard.total}</p>
                      <p className="text-xs text-muted-foreground">Total Prospectos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
                      <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{dashboard.enrichedCount}</p>
                      <p className="text-xs text-muted-foreground">
                        Enriquecidos ({dashboard.enrichmentRate}%)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900/30">
                      <MessageSquare className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{dashboard.abordadosCount}</p>
                      <p className="text-xs text-muted-foreground">Abordados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{dashboard.convertedCount}</p>
                      <p className="text-xs text-muted-foreground">
                        Convertidos ({dashboard.conversionRate}%)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts + Recent Searches */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Segment Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Prospectos por Segmento</CardTitle>
                </CardHeader>
                <CardContent>
                  {segmentData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={segmentData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name} (${(percent * 100).toFixed(0)}%)`
                          }
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {segmentData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="py-12 text-center text-muted-foreground">
                      Sem dados de segmento
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Conversion Funnel */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Funil de Conversao</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                      const count = dashboard.statusCounts[key] || 0
                      const pct =
                        dashboard.total > 0
                          ? Math.round((count / dashboard.total) * 100)
                          : 0
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{config.label}</span>
                            <span className="font-medium">
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted">
                            <div
                              className={cn('h-full rounded-full', config.color.split(' ')[0])}
                              style={{ width: `${Math.max(pct, 2)}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Searches */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Buscas Recentes</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Busca</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead>Segmento</TableHead>
                      <TableHead>Raio</TableHead>
                      <TableHead>Resultados</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboard.recentSearches.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.query}</TableCell>
                        <TableCell>{s.location}</TableCell>
                        <TableCell>{s.segment || '-'}</TableCell>
                        <TableCell>{s.radius_km} km</TableCell>
                        <TableCell>{s.results_count}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(s.created_at), "dd/MM/yy HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                    {dashboard.recentSearches.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-8 text-center text-muted-foreground"
                        >
                          Nenhuma busca realizada ainda
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Prospeccao de Empresas</h1>
        <p className="text-muted-foreground">
          Encontre e qualifique empresas via Google Places para prospectar novos clientes
        </p>
      </div>

      <Tabs defaultValue="search" className="space-y-4">
        <TabsList>
          <TabsTrigger value="search">
            <Search className="mr-2 h-4 w-4" />
            Buscar Empresas
          </TabsTrigger>
          <TabsTrigger value="prospects" onClick={() => loadProspects()}>
            <Building2 className="mr-2 h-4 w-4" />
            Prospectos ({prospectsTotal})
          </TabsTrigger>
          <TabsTrigger value="dashboard" onClick={() => loadDashboard()}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search">{renderSearchTab()}</TabsContent>
        <TabsContent value="prospects">{renderProspectsTab()}</TabsContent>
        <TabsContent value="dashboard">{renderDashboardTab()}</TabsContent>
      </Tabs>

      {/* Notes Dialog */}
      <Dialog
        open={!!detailProspect}
        onOpenChange={(open) => !open && setDetailProspect(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notas - {detailProspect?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Adicione notas sobre este prospecto..."
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailProspect(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveNotes}>Salvar Notas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
