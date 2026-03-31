// @ts-nocheck
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Loader2,
  Search,
  Plus,
  Trash2,
  Eye,
  MessageCircle,
  UserPlus,
  ChevronDown,
  TrendingUp,
  Users,
  Target,
  CheckCircle2,
  BarChart3,
  Sparkles,
  RefreshCw,
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
import { Switch } from '@/components/ui/switch'
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
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// Types
interface Opportunity {
  id: string
  sender_name: string
  sender_phone: string
  group_name: string
  group_jid: string
  message_text: string
  matched_keyword: string
  status: 'novo' | 'abordado' | 'respondeu' | 'converteu' | 'ignorado'
  created_at: string
}

interface Keyword {
  id: string
  keyword: string
  category: string
  match_count: number
}

interface MonitoredGroup {
  id: string
  group_jid: string
  group_name: string
  participant_count: number
  is_active: boolean
  opportunity_count: number
}

interface DashboardStats {
  total: number
  new_today: number
  contacted: number
  converted: number
  conversion_rate: number
  chart_data: { date: string; count: number }[]
  top_keywords: { keyword: string; matches: number; category: string }[]
  top_groups: { group_name: string; opportunities: number }[]
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'novo', label: 'Novo' },
  { value: 'abordado', label: 'Abordado' },
  { value: 'respondeu', label: 'Respondeu' },
  { value: 'converteu', label: 'Converteu' },
  { value: 'ignorado', label: 'Ignorado' },
]

const STATUS_COLORS: Record<string, string> = {
  novo: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  abordado: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  respondeu: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  converteu: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  ignorado: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
}

const CATEGORY_OPTIONS = [
  'Geral',
  'Marketing',
  'Gestao',
  'Consultoria',
  'Tecnologia',
  'Financeiro',
]

const CATEGORY_COLORS: Record<string, string> = {
  Geral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Marketing: 'bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-300',
  Gestao: 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300',
  Consultoria: 'bg-amber-100 text-amber-700 dark:bg-amber-800 dark:text-amber-300',
  Tecnologia: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-800 dark:text-cyan-300',
  Financeiro: 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300',
}

export default function WhatsAppRadarPage() {
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()
  const orgId = currentOrg?.id

  // Dashboard state
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  // Opportunities state
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loadingOpportunities, setLoadingOpportunities] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterKeyword, setFilterKeyword] = useState('')
  const [filterGroup, setFilterGroup] = useState('all')
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null)

  // Keywords state
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [loadingKeywords, setLoadingKeywords] = useState(true)
  const [showAddKeyword, setShowAddKeyword] = useState(false)
  const [newKeyword, setNewKeyword] = useState('')
  const [newKeywordCategory, setNewKeywordCategory] = useState('Geral')
  const [addingKeyword, setAddingKeyword] = useState(false)

  // Groups state
  const [groups, setGroups] = useState<MonitoredGroup[]>([])
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [showAddGroup, setShowAddGroup] = useState(false)

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    if (!orgId) return
    setLoadingStats(true)
    try {
      const res = await fetch(`/api/whatsapp-radar/stats?orgId=${orgId}`)
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Erro ao carregar estatisticas:', err)
    } finally {
      setLoadingStats(false)
    }
  }, [orgId])

  // Fetch opportunities
  const fetchOpportunities = useCallback(async () => {
    if (!orgId) return
    setLoadingOpportunities(true)
    try {
      const params = new URLSearchParams({ orgId })
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (filterKeyword) params.set('keyword', filterKeyword)
      if (filterGroup !== 'all') params.set('groupJid', filterGroup)

      const res = await fetch(`/api/whatsapp-radar/opportunities?${params}`)
      if (res.ok) {
        const data = await res.json()
        setOpportunities(data.opportunities || [])
      }
    } catch (err) {
      console.error('Erro ao carregar oportunidades:', err)
    } finally {
      setLoadingOpportunities(false)
    }
  }, [orgId, filterStatus, filterKeyword, filterGroup])

  // Fetch keywords
  const fetchKeywords = useCallback(async () => {
    if (!orgId) return
    setLoadingKeywords(true)
    try {
      const res = await fetch(`/api/whatsapp-radar/keywords?orgId=${orgId}`)
      if (res.ok) {
        const data = await res.json()
        setKeywords(data.keywords || [])
      }
    } catch (err) {
      console.error('Erro ao carregar palavras-chave:', err)
    } finally {
      setLoadingKeywords(false)
    }
  }, [orgId])

  // Fetch groups
  const fetchGroups = useCallback(async () => {
    if (!orgId) return
    setLoadingGroups(true)
    try {
      const res = await fetch(`/api/whatsapp-radar/groups?orgId=${orgId}`)
      if (res.ok) {
        const data = await res.json()
        setGroups(data.groups || [])
      }
    } catch (err) {
      console.error('Erro ao carregar grupos:', err)
    } finally {
      setLoadingGroups(false)
    }
  }, [orgId])

  useEffect(() => {
    if (orgId) {
      fetchStats()
      fetchOpportunities()
      fetchKeywords()
      fetchGroups()
    }
  }, [orgId, fetchStats, fetchOpportunities, fetchKeywords, fetchGroups])

  // Update opportunity status
  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/whatsapp-radar/opportunities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setOpportunities((prev) =>
          prev.map((opp) => (opp.id === id ? { ...opp, status: newStatus as Opportunity['status'] } : opp))
        )
        toast({ title: 'Status atualizado' })
      }
    } catch (err) {
      toast({ title: 'Erro', description: 'Nao foi possivel atualizar o status.', variant: 'destructive' })
    }
  }

  // Convert to lead
  const convertToLead = async (id: string) => {
    try {
      const res = await fetch(`/api/whatsapp-radar/opportunities/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'convert' }),
      })
      if (res.ok) {
        setOpportunities((prev) =>
          prev.map((opp) => (opp.id === id ? { ...opp, status: 'converteu' } : opp))
        )
        toast({ title: 'Lead criado', description: 'Oportunidade convertida em lead com sucesso.' })
      }
    } catch (err) {
      toast({ title: 'Erro', description: 'Nao foi possivel converter em lead.', variant: 'destructive' })
    }
  }

  // Add keyword
  const handleAddKeyword = async () => {
    if (!newKeyword.trim() || !orgId) return
    setAddingKeyword(true)
    try {
      const res = await fetch('/api/whatsapp-radar/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, keyword: newKeyword.trim(), category: newKeywordCategory }),
      })
      if (res.ok) {
        const data = await res.json()
        setKeywords((prev) => [...prev, data.keyword])
        setNewKeyword('')
        setNewKeywordCategory('Geral')
        setShowAddKeyword(false)
        toast({ title: 'Palavra-chave adicionada' })
      }
    } catch (err) {
      toast({ title: 'Erro', description: 'Nao foi possivel adicionar a palavra-chave.', variant: 'destructive' })
    } finally {
      setAddingKeyword(false)
    }
  }

  // Delete keyword
  const handleDeleteKeyword = async (id: string) => {
    try {
      const res = await fetch(`/api/whatsapp-radar/keywords/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setKeywords((prev) => prev.filter((k) => k.id !== id))
        toast({ title: 'Palavra-chave removida' })
      }
    } catch (err) {
      toast({ title: 'Erro', description: 'Nao foi possivel remover.', variant: 'destructive' })
    }
  }

  // Toggle group active
  const toggleGroupActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/whatsapp-radar/groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive }),
      })
      if (res.ok) {
        setGroups((prev) =>
          prev.map((g) => (g.id === id ? { ...g, is_active: isActive } : g))
        )
        toast({ title: isActive ? 'Grupo ativado' : 'Grupo desativado' })
      }
    } catch (err) {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  // Unique groups for filter
  const uniqueGroups = Array.from(new Set(opportunities.map((o) => o.group_jid))).map((jid) => {
    const opp = opportunities.find((o) => o.group_jid === jid)
    return { jid, name: opp?.group_name || jid }
  })

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Radar de Grupos WhatsApp</h1>
          <p className="text-muted-foreground">
            Monitore grupos, detecte oportunidades e converta em leads automaticamente
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchStats(); fetchOpportunities(); fetchKeywords(); fetchGroups(); }}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="oportunidades">Oportunidades</TabsTrigger>
          <TabsTrigger value="keywords">Palavras-chave</TabsTrigger>
          <TabsTrigger value="grupos">Grupos Monitorados</TabsTrigger>
        </TabsList>

        {/* ===== TAB 1: DASHBOARD ===== */}
        <TabsContent value="dashboard" className="space-y-6">
          {loadingStats ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !stats ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">Nenhum dado ainda</h3>
                <p className="text-muted-foreground mt-1">
                  Configure palavras-chave e grupos para comecar a detectar oportunidades.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Oportunidades</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Novos (hoje)</CardTitle>
                    <Sparkles className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{stats.new_today}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Abordados</CardTitle>
                    <MessageCircle className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{stats.contacted}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Convertidos</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-600">{stats.converted}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Conversao</CardTitle>
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.conversion_rate.toFixed(1)}%</div>
                  </CardContent>
                </Card>
              </div>

              {/* Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Oportunidades por Dia</CardTitle>
                  <CardDescription>Ultimos 30 dias</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.chart_data && stats.chart_data.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.chart_data}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(val) => {
                              try {
                                return format(new Date(val), 'dd/MM', { locale: ptBR })
                              } catch {
                                return val
                              }
                            }}
                          />
                          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                          <Tooltip
                            labelFormatter={(val) => {
                              try {
                                return format(new Date(val), "dd 'de' MMMM", { locale: ptBR })
                              } catch {
                                return val
                              }
                            }}
                            formatter={(value: number) => [value, 'Oportunidades']}
                          />
                          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="py-8 text-center text-muted-foreground">Nenhum dado para exibir</p>
                  )}
                </CardContent>
              </Card>

              {/* Top Keywords + Top Groups */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Palavras-chave</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.top_keywords && stats.top_keywords.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Palavra-chave</TableHead>
                            <TableHead className="text-center">Matches</TableHead>
                            <TableHead>Categoria</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stats.top_keywords.map((kw, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{kw.keyword}</TableCell>
                              <TableCell className="text-center">{kw.matches}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className={cn('text-xs', CATEGORY_COLORS[kw.category] || '')}>
                                  {kw.category}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="py-4 text-center text-muted-foreground">Nenhuma palavra-chave</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Grupos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.top_groups && stats.top_groups.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Grupo</TableHead>
                            <TableHead className="text-center">Oportunidades</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stats.top_groups.map((g, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{g.group_name}</TableCell>
                              <TableCell className="text-center">{g.opportunities}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="py-4 text-center text-muted-foreground">Nenhum grupo</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ===== TAB 2: OPORTUNIDADES ===== */}
        <TabsContent value="oportunidades" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="flex flex-wrap items-end gap-4 pt-6">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Palavra-chave</Label>
                <Input
                  placeholder="Buscar keyword..."
                  value={filterKeyword}
                  onChange={(e) => setFilterKeyword(e.target.value)}
                  className="w-[200px]"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Grupo</Label>
                <Select value={filterGroup} onValueChange={setFilterGroup}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os grupos</SelectItem>
                    {uniqueGroups.map((g) => (
                      <SelectItem key={g.jid} value={g.jid}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" size="sm" onClick={fetchOpportunities}>
                <Search className="mr-2 h-4 w-4" />
                Filtrar
              </Button>
            </CardContent>
          </Card>

          {/* Opportunities table */}
          {loadingOpportunities ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : opportunities.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">Nenhuma oportunidade encontrada</h3>
                <p className="text-muted-foreground mt-1">
                  As oportunidades aparecerao aqui quando mensagens forem detectadas nos grupos monitorados.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Grupo</TableHead>
                      <TableHead className="max-w-[250px]">Mensagem</TableHead>
                      <TableHead>Keyword</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {opportunities.map((opp) => (
                      <TableRow key={opp.id}>
                        <TableCell className="font-medium">{opp.sender_name || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{opp.sender_phone}</TableCell>
                        <TableCell className="text-sm">{opp.group_name}</TableCell>
                        <TableCell className="max-w-[250px]">
                          {expandedMessage === opp.id ? (
                            <div className="space-y-1">
                              <p className="text-sm whitespace-pre-wrap">{opp.message_text}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => setExpandedMessage(null)}
                              >
                                Recolher
                              </Button>
                            </div>
                          ) : (
                            <p className="text-sm truncate max-w-[250px]">{opp.message_text}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {opp.matched_keyword}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs', STATUS_COLORS[opp.status])}>
                            {opp.status.charAt(0).toUpperCase() + opp.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(opp.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {expandedMessage !== opp.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Ver mensagem"
                                onClick={() => setExpandedMessage(opp.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Alterar status">
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {STATUS_OPTIONS.filter((s) => s.value !== 'all').map((s) => (
                                  <DropdownMenuItem
                                    key={s.value}
                                    onClick={() => updateStatus(opp.id, s.value)}
                                    className={cn(opp.status === s.value && 'bg-accent')}
                                  >
                                    {s.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                              title="Converter em Lead"
                              onClick={() => convertToLead(opp.id)}
                              disabled={opp.status === 'converteu'}
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700"
                              title="Abordar"
                              onClick={() => {
                                const phone = opp.sender_phone.replace(/\D/g, '')
                                window.open(`https://wa.me/${phone}`, '_blank')
                              }}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== TAB 3: PALAVRAS-CHAVE ===== */}
        <TabsContent value="keywords" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Palavras-chave Monitoradas</h2>
              <p className="text-sm text-muted-foreground">
                Mensagens contendo essas palavras serao detectadas como oportunidades
              </p>
            </div>
            <Button onClick={() => setShowAddKeyword(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
          </div>

          {loadingKeywords ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : keywords.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">Nenhuma palavra-chave configurada</h3>
                <p className="text-muted-foreground mt-1">
                  Adicione palavras-chave para comecar a detectar oportunidades nos grupos.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Palavra-chave</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-center">Matches</TableHead>
                      <TableHead className="text-right">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keywords.map((kw) => (
                      <TableRow key={kw.id}>
                        <TableCell className="font-medium">{kw.keyword}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn('text-xs', CATEGORY_COLORS[kw.category] || '')}>
                            {kw.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{kw.match_count}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteKeyword(kw.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Add keyword dialog */}
          <Dialog open={showAddKeyword} onOpenChange={setShowAddKeyword}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Palavra-chave</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Palavra-chave</Label>
                  <Input
                    placeholder="Ex: preciso de consultoria"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddKeyword()
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={newKeywordCategory} onValueChange={setNewKeywordCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddKeyword(false)} disabled={addingKeyword}>
                  Cancelar
                </Button>
                <Button onClick={handleAddKeyword} disabled={!newKeyword.trim() || addingKeyword}>
                  {addingKeyword ? 'Adicionando...' : 'Adicionar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ===== TAB 4: GRUPOS MONITORADOS ===== */}
        <TabsContent value="grupos" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Grupos Monitorados</h2>
              <p className="text-sm text-muted-foreground">
                Grupos de WhatsApp sendo monitorados para detectar oportunidades
              </p>
            </div>
            <Button onClick={() => setShowAddGroup(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Grupo
            </Button>
          </div>

          {loadingGroups ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : groups.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">Nenhum grupo monitorado</h3>
                <p className="text-muted-foreground mt-1">
                  Adicione grupos para comecar a monitorar mensagens e detectar oportunidades.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <Card key={group.id} className={cn(!group.is_active && 'opacity-60')}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{group.group_name}</CardTitle>
                        <CardDescription>
                          {group.participant_count} participantes
                        </CardDescription>
                      </div>
                      <Switch
                        checked={group.is_active}
                        onCheckedChange={(checked) => toggleGroupActive(group.id, checked)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Target className="h-4 w-4" />
                        <span>{group.opportunity_count} oportunidades</span>
                      </div>
                      <Link href={`/whatsapp/radar/chat/${encodeURIComponent(group.group_jid)}`}>
                        <Button variant="outline" size="sm">
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Ver Chat
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Add group dialog (instructions) */}
          <Dialog open={showAddGroup} onOpenChange={setShowAddGroup}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Grupo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                  Para adicionar um novo grupo ao monitoramento, siga os passos:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Acesse o painel do servico WhatsApp Radar (Go service)</li>
                  <li>Escaneie o QR Code para conectar o WhatsApp</li>
                  <li>Selecione os grupos que deseja monitorar</li>
                  <li>Os grupos aparecerao automaticamente aqui apos a sincronizacao</li>
                </ol>
                <div className="rounded-md bg-muted p-3">
                  <p className="text-xs text-muted-foreground">
                    O servico de monitoramento roda em segundo plano e detecta automaticamente
                    mensagens que contem as palavras-chave configuradas.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setShowAddGroup(false)}>Entendi</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  )
}
