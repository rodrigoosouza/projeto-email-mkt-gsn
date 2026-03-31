'use client'

import { useState, useEffect } from 'react'
import {
  Search,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Plus,
  AlertCircle,
  CheckCircle2,
  Zap,
  Shield,
  FileCode,
  Brain,
  ArrowUpRight,
  Eye,
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ==================== Types ====================

interface AieoCategory {
  name: string
  score: number
  weight: number
  icon: React.ElementType
}

interface AieoIssue {
  message: string
  severity: 'high' | 'medium' | 'low'
}

interface AieoStrength {
  message: string
}

interface AieoQuickWin {
  title: string
  description: string
  impact: 'alto' | 'medio' | 'baixo'
  effort: 'alto' | 'medio' | 'baixo'
  priority: number
}

interface AieoAudit {
  id: string
  url: string
  score: number
  classification: string
  categories: AieoCategory[]
  issues: AieoIssue[]
  strengths: AieoStrength[]
  quickWins: AieoQuickWin[]
  created_at: string
}

interface SchemaMarkup {
  type: string
  json: string
}

interface AiMonitorEntry {
  id: string
  query: string
  engine: string
  mentioned: boolean
  cited: boolean
  recommended: boolean
  notes: string
  created_at: string
}

// ==================== Helpers ====================

function getScoreColor(score: number): string {
  if (score >= 85) return 'text-emerald-600'
  if (score >= 70) return 'text-blue-600'
  if (score >= 50) return 'text-yellow-600'
  if (score >= 25) return 'text-orange-500'
  return 'text-red-600'
}

function getScoreRingColor(score: number): string {
  if (score >= 85) return 'stroke-emerald-500'
  if (score >= 70) return 'stroke-blue-500'
  if (score >= 50) return 'stroke-yellow-500'
  if (score >= 25) return 'stroke-orange-500'
  return 'stroke-red-500'
}

function getScoreBgColor(score: number): string {
  if (score >= 85) return 'bg-emerald-100 text-emerald-800'
  if (score >= 70) return 'bg-blue-100 text-blue-800'
  if (score >= 50) return 'bg-yellow-100 text-yellow-800'
  if (score >= 25) return 'bg-orange-100 text-orange-800'
  return 'bg-red-100 text-red-800'
}

function getClassification(score: number): string {
  if (score >= 85) return 'Excelente'
  if (score >= 70) return 'Avancado'
  if (score >= 50) return 'Bom'
  if (score >= 25) return 'Em Desenvolvimento'
  return 'Critico'
}

function getClassificationColor(classification: string): string {
  switch (classification) {
    case 'Excelente': return 'bg-emerald-100 text-emerald-800'
    case 'Avancado': return 'bg-blue-100 text-blue-800'
    case 'Bom': return 'bg-yellow-100 text-yellow-800'
    case 'Em Desenvolvimento': return 'bg-orange-100 text-orange-800'
    case 'Critico': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function getImpactColor(impact: string): string {
  switch (impact) {
    case 'alto': return 'bg-green-100 text-green-800'
    case 'medio': return 'bg-yellow-100 text-yellow-800'
    case 'baixo': return 'bg-gray-100 text-gray-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function getEffortColor(effort: string): string {
  switch (effort) {
    case 'baixo': return 'bg-green-100 text-green-800'
    case 'medio': return 'bg-yellow-100 text-yellow-800'
    case 'alto': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

// Circular Progress component
function CircularScore({ score, size = 160 }: { score: number; size?: number }) {
  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${getScoreRingColor(score)} transition-all duration-1000 ease-out`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-4xl font-bold ${getScoreColor(score)}`}>{score}</span>
        <span className="text-sm text-muted-foreground">/100</span>
      </div>
    </div>
  )
}

// ==================== Main Component ====================

export default function AieoGeoPage() {
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()
  const orgId = currentOrg?.id

  // Tab 1: Audit state
  const [auditUrl, setAuditUrl] = useState('')
  const [auditing, setAuditing] = useState(false)
  const [currentAudit, setCurrentAudit] = useState<AieoAudit | null>(null)
  const [auditHistory, setAuditHistory] = useState<AieoAudit[]>([])

  // Tab 2: Schema state
  const [schemas, setSchemas] = useState<SchemaMarkup[]>([])
  const [generatingSchemas, setGeneratingSchemas] = useState(false)
  const [expandedSchemas, setExpandedSchemas] = useState<Set<number>>(new Set())
  const [copiedSchema, setCopiedSchema] = useState<number | null>(null)

  // Tab 3: llms.txt state
  const [llmsTxt, setLlmsTxt] = useState('')
  const [generatingLlms, setGeneratingLlms] = useState(false)
  const [copiedLlms, setCopiedLlms] = useState(false)

  // Tab 4: AI Monitor state
  const [monitorQuery, setMonitorQuery] = useState('')
  const [monitorEngine, setMonitorEngine] = useState('chatgpt')
  const [monitorEntries, setMonitorEntries] = useState<AiMonitorEntry[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newEntry, setNewEntry] = useState({
    query: '',
    engine: 'chatgpt',
    mentioned: false,
    cited: false,
    recommended: false,
    notes: '',
  })

  // Load history from localStorage
  useEffect(() => {
    if (!orgId) return
    const storedAudits = localStorage.getItem(`aieo-audits-${orgId}`)
    if (storedAudits) {
      try { setAuditHistory(JSON.parse(storedAudits)) } catch { /* ignore */ }
    }
    const storedSchemas = localStorage.getItem(`aieo-schemas-${orgId}`)
    if (storedSchemas) {
      try { setSchemas(JSON.parse(storedSchemas)) } catch { /* ignore */ }
    }
    const storedLlms = localStorage.getItem(`aieo-llms-${orgId}`)
    if (storedLlms) setLlmsTxt(storedLlms)
    const storedMonitor = localStorage.getItem(`aieo-monitor-${orgId}`)
    if (storedMonitor) {
      try { setMonitorEntries(JSON.parse(storedMonitor)) } catch { /* ignore */ }
    }
  }, [orgId])

  // Save helpers
  function saveAuditHistory(audits: AieoAudit[]) {
    setAuditHistory(audits)
    if (orgId) localStorage.setItem(`aieo-audits-${orgId}`, JSON.stringify(audits))
  }

  function saveSchemas(s: SchemaMarkup[]) {
    setSchemas(s)
    if (orgId) localStorage.setItem(`aieo-schemas-${orgId}`, JSON.stringify(s))
  }

  function saveLlmsTxt(txt: string) {
    setLlmsTxt(txt)
    if (orgId) localStorage.setItem(`aieo-llms-${orgId}`, txt)
  }

  function saveMonitorEntries(entries: AiMonitorEntry[]) {
    setMonitorEntries(entries)
    if (orgId) localStorage.setItem(`aieo-monitor-${orgId}`, JSON.stringify(entries))
  }

  // ==================== Tab 1: Audit ====================

  async function handleAudit() {
    if (!orgId || !auditUrl) return

    let validUrl = auditUrl
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl
    }

    setAuditing(true)
    setCurrentAudit(null)

    try {
      const res = await fetch('/api/seo/aieo-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: validUrl, org_id: orgId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao auditar')

      const audit: AieoAudit = {
        id: crypto.randomUUID(),
        url: validUrl,
        score: data.score ?? 0,
        classification: data.classification ?? getClassification(data.score ?? 0),
        categories: data.categories ?? [
          { name: 'Citabilidade', score: data.citability_score ?? 0, weight: 35, icon: Brain },
          { name: 'Estrutura Tecnica', score: data.technical_score ?? 0, weight: 25, icon: FileCode },
          { name: 'Autoridade', score: data.authority_score ?? 0, weight: 25, icon: Shield },
          { name: 'Formato AI-Friendly', score: data.ai_friendly_score ?? 0, weight: 15, icon: Zap },
        ],
        issues: data.issues ?? [],
        strengths: data.strengths ?? [],
        quickWins: data.quick_wins ?? [],
        created_at: new Date().toISOString(),
      }

      setCurrentAudit(audit)
      const updatedHistory = [audit, ...auditHistory]
      saveAuditHistory(updatedHistory)
      setAuditUrl('')

      toast({
        title: 'Auditoria concluida',
        description: `Score AIEO/GEO: ${audit.score}/100 — ${audit.classification}`,
      })
    } catch (error: any) {
      toast({
        title: 'Erro na auditoria',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setAuditing(false)
    }
  }

  // ==================== Tab 2: Schema ====================

  async function handleGenerateSchemas() {
    if (!orgId) return
    setGeneratingSchemas(true)
    try {
      const res = await fetch('/api/seo/schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar schemas')

      const generatedSchemas: SchemaMarkup[] = data.schemas ?? []
      saveSchemas(generatedSchemas)
      setExpandedSchemas(new Set(generatedSchemas.map((_, i) => i)))

      toast({
        title: 'Schemas gerados',
        description: `${generatedSchemas.length} schema(s) gerado(s) com sucesso.`,
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao gerar schemas',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setGeneratingSchemas(false)
    }
  }

  function toggleSchema(index: number) {
    const next = new Set(expandedSchemas)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setExpandedSchemas(next)
  }

  async function copyToClipboard(text: string, index?: number) {
    await navigator.clipboard.writeText(text)
    if (index !== undefined) {
      setCopiedSchema(index)
      setTimeout(() => setCopiedSchema(null), 2000)
    }
    toast({ title: 'Copiado!', description: 'Conteudo copiado para a area de transferencia.' })
  }

  // ==================== Tab 3: llms.txt ====================

  async function handleGenerateLlmsTxt() {
    if (!orgId) return
    setGeneratingLlms(true)
    try {
      const res = await fetch('/api/seo/llms-txt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar llms.txt')

      saveLlmsTxt(data.content ?? '')
      toast({
        title: 'llms.txt gerado',
        description: 'Arquivo llms.txt gerado com sucesso.',
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao gerar llms.txt',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setGeneratingLlms(false)
    }
  }

  // ==================== Tab 4: AI Monitor ====================

  function handleAddMonitorEntry() {
    const entry: AiMonitorEntry = {
      id: crypto.randomUUID(),
      query: newEntry.query,
      engine: newEntry.engine,
      mentioned: newEntry.mentioned,
      cited: newEntry.cited,
      recommended: newEntry.recommended,
      notes: newEntry.notes,
      created_at: new Date().toISOString(),
    }
    const updated = [entry, ...monitorEntries]
    saveMonitorEntries(updated)
    setShowAddDialog(false)
    setNewEntry({ query: '', engine: 'chatgpt', mentioned: false, cited: false, recommended: false, notes: '' })
    toast({ title: 'Registro adicionado', description: 'Monitoramento registrado com sucesso.' })
  }

  const engineLabels: Record<string, string> = {
    chatgpt: 'ChatGPT',
    perplexity: 'Perplexity',
    claude: 'Claude',
    gemini: 'Gemini',
  }

  // ==================== Render ====================

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">AIEO / GEO</h2>
        <p className="text-muted-foreground">
          Otimizacao para motores de IA — audite, gere schemas e monitore sua presenca em respostas de IA.
        </p>
      </div>

      <Tabs defaultValue="audit" className="space-y-6">
        <TabsList>
          <TabsTrigger value="audit">Auditoria AIEO/GEO</TabsTrigger>
          <TabsTrigger value="schema">Schema Markup</TabsTrigger>
          <TabsTrigger value="llms">llms.txt</TabsTrigger>
          <TabsTrigger value="monitor">Monitoramento IA</TabsTrigger>
        </TabsList>

        {/* ==================== Tab 1: Audit ==================== */}
        <TabsContent value="audit" className="space-y-6">
          {/* URL Input */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Digite a URL para auditar (ex: https://exemplo.com.br)"
                    value={auditUrl}
                    onChange={(e) => setAuditUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAudit()}
                    disabled={auditing}
                  />
                </div>
                <Button onClick={handleAudit} disabled={!auditUrl || auditing}>
                  {auditing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  Auditar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Loading */}
          {auditing && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Auditando URL para AIEO/GEO...</p>
                <p className="text-xs text-muted-foreground mt-1">Analisando citabilidade, estrutura, autoridade e formato AI-friendly</p>
              </CardContent>
            </Card>
          )}

          {/* Audit Results */}
          {currentAudit && (
            <div className="space-y-6">
              {/* Score + Classification */}
              <div className="grid gap-6 md:grid-cols-[auto_1fr]">
                <Card>
                  <CardContent className="pt-6 flex flex-col items-center justify-center min-w-[200px]">
                    <p className="text-sm text-muted-foreground mb-3">Score AIEO/GEO</p>
                    <CircularScore score={currentAudit.score} />
                    <Badge className={`mt-3 text-sm ${getClassificationColor(currentAudit.classification)}`}>
                      {currentAudit.classification}
                    </Badge>
                  </CardContent>
                </Card>

                {/* Category Scores */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {(currentAudit.categories || []).map((cat, i) => {
                    const Icon = [Brain, FileCode, Shield, Zap][i] || Brain
                    return (
                      <Card key={i}>
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-muted-foreground">
                                {cat.name} ({cat.weight}%)
                              </p>
                              <div className="flex items-center gap-2">
                                <span className={`text-2xl font-bold ${getScoreColor(cat.score)}`}>
                                  {cat.score}
                                </span>
                                <span className="text-sm text-muted-foreground">/100</span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 h-2 w-full rounded-full bg-muted">
                            <div
                              className={`h-2 rounded-full transition-all duration-700 ${
                                cat.score >= 85 ? 'bg-emerald-500' :
                                cat.score >= 70 ? 'bg-blue-500' :
                                cat.score >= 50 ? 'bg-yellow-500' :
                                cat.score >= 25 ? 'bg-orange-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${cat.score}%` }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>

              {/* Issues & Strengths */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Top 5 Problems */}
                {currentAudit.issues && currentAudit.issues.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        Top Problemas
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {currentAudit.issues.slice(0, 5).map((issue, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-3 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30"
                        >
                          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm">{issue.message}</p>
                            {issue.severity && (
                              <Badge variant="outline" className="mt-1 text-xs capitalize">
                                {issue.severity}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Top 3 Strengths */}
                {currentAudit.strengths && currentAudit.strengths.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Pontos Fortes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {currentAudit.strengths.slice(0, 3).map((strength, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-3 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30"
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <p className="text-sm">{strength.message}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Quick Wins */}
              {currentAudit.quickWins && currentAudit.quickWins.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      Quick Wins
                    </CardTitle>
                    <CardDescription>
                      Acoes priorizadas por impacto e esforco
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {currentAudit.quickWins
                      .sort((a, b) => a.priority - b.priority)
                      .map((win, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{win.title}</p>
                            <p className="text-sm text-muted-foreground mt-0.5">{win.description}</p>
                            <div className="flex gap-2 mt-2">
                              <Badge className={getImpactColor(win.impact)}>
                                Impacto: {win.impact}
                              </Badge>
                              <Badge className={getEffortColor(win.effort)}>
                                Esforco: {win.effort}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Audit History */}
          <Card>
            <CardHeader>
              <CardTitle>Historico de Auditorias</CardTitle>
              <CardDescription>Auditorias AIEO/GEO realizadas anteriormente.</CardDescription>
            </CardHeader>
            <CardContent>
              {auditHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold">Nenhuma auditoria ainda</h3>
                  <p className="text-muted-foreground mt-1">
                    Digite uma URL acima para comecar sua primeira auditoria AIEO/GEO.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>URL</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Classificacao</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditHistory.map((audit) => (
                      <TableRow
                        key={audit.id}
                        className="cursor-pointer"
                        onClick={() => setCurrentAudit(audit)}
                      >
                        <TableCell className="text-sm max-w-xs truncate">{audit.url}</TableCell>
                        <TableCell>
                          <Badge className={getScoreBgColor(audit.score)}>{audit.score}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getClassificationColor(audit.classification)}>
                            {audit.classification}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(audit.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== Tab 2: Schema Markup ==================== */}
        <TabsContent value="schema" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Schema Markup</CardTitle>
              <CardDescription>
                Gere schemas estruturados (JSON-LD) para melhorar a visibilidade em motores de IA e busca.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleGenerateSchemas} disabled={generatingSchemas}>
                {generatingSchemas ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Gerar Schemas
              </Button>
            </CardContent>
          </Card>

          {schemas.length > 0 && (
            <div className="space-y-4">
              {schemas.map((schema, index) => (
                <Card key={index}>
                  <CardHeader
                    className="cursor-pointer"
                    onClick={() => toggleSchema(index)}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileCode className="h-4 w-4" />
                        {schema.type}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(schema.json, index)
                          }}
                        >
                          {copiedSchema === index ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        {expandedSchemas.has(index) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {expandedSchemas.has(index) && (
                    <CardContent>
                      <pre className="p-4 rounded-lg bg-muted text-sm overflow-x-auto font-mono whitespace-pre-wrap">
                        {(() => {
                          try {
                            return JSON.stringify(JSON.parse(schema.json), null, 2)
                          } catch {
                            return schema.json
                          }
                        })()}
                      </pre>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}

          {schemas.length === 0 && !generatingSchemas && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileCode className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">Nenhum schema gerado</h3>
                <p className="text-muted-foreground mt-1">
                  Clique em &ldquo;Gerar Schemas&rdquo; para criar schemas estruturados para sua organizacao.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ==================== Tab 3: llms.txt ==================== */}
        <TabsContent value="llms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>llms.txt</CardTitle>
              <CardDescription>
                Arquivo que instrui modelos de IA sobre como citar e referenciar seu site. Semelhante ao robots.txt, mas para LLMs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button onClick={handleGenerateLlmsTxt} disabled={generatingLlms}>
                  {generatingLlms ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Gerar llms.txt
                </Button>
                {llmsTxt && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(llmsTxt)
                      setCopiedLlms(true)
                      setTimeout(() => setCopiedLlms(false), 2000)
                      toast({ title: 'Copiado!', description: 'llms.txt copiado para a area de transferencia.' })
                    }}
                  >
                    {copiedLlms ? (
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}
                    Copiar
                  </Button>
                )}
              </div>

              {llmsTxt ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Textarea
                      value={llmsTxt}
                      readOnly
                      className="font-mono text-sm min-h-[400px] resize-none bg-muted"
                    />
                  </div>
                  <Card className="bg-muted/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Preview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        Coloque este arquivo na raiz do seu site como <code className="bg-muted px-1 py-0.5 rounded">/llms.txt</code> para
                        que modelos de IA possam encontra-lo automaticamente.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileCode className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold">Nenhum llms.txt gerado</h3>
                  <p className="text-muted-foreground mt-1">
                    Clique em &ldquo;Gerar llms.txt&rdquo; para criar o arquivo de instrucoes para LLMs.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== Tab 4: AI Monitor ==================== */}
        <TabsContent value="monitor" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monitoramento de Presenca em IA</CardTitle>
              <CardDescription>
                Teste queries em motores de IA e registre se sua marca esta sendo mencionada, citada ou recomendada.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Query para testar (ex: melhores consultorias ISO)"
                    value={monitorQuery}
                    onChange={(e) => setMonitorQuery(e.target.value)}
                  />
                </div>
                <Select value={monitorEngine} onValueChange={setMonitorEngine}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chatgpt">ChatGPT</SelectItem>
                    <SelectItem value="perplexity">Perplexity</SelectItem>
                    <SelectItem value="claude">Claude</SelectItem>
                    <SelectItem value="gemini">Gemini</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!monitorQuery) return
                    setNewEntry({
                      query: monitorQuery,
                      engine: monitorEngine,
                      mentioned: false,
                      cited: false,
                      recommended: false,
                      notes: '',
                    })
                    setShowAddDialog(true)
                  }}
                  disabled={!monitorQuery}
                >
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                  Testar e Registrar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Teste a query no motor de IA selecionado e depois registre o resultado manualmente.
              </p>
            </CardContent>
          </Card>

          {/* Monitor History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Registros de Monitoramento</CardTitle>
                  <CardDescription>Historico de verificacoes manuais em motores de IA.</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewEntry({ query: '', engine: 'chatgpt', mentioned: false, cited: false, recommended: false, notes: '' })
                    setShowAddDialog(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {monitorEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Brain className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold">Nenhum registro ainda</h3>
                  <p className="text-muted-foreground mt-1">
                    Teste queries em motores de IA e registre os resultados para monitorar sua presenca.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Query</TableHead>
                      <TableHead>Motor</TableHead>
                      <TableHead className="text-center">Mencionado</TableHead>
                      <TableHead className="text-center">Citado</TableHead>
                      <TableHead className="text-center">Recomendado</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monitorEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm max-w-xs truncate">{entry.query}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{engineLabels[entry.engine] || entry.engine}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {entry.mentioned ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 inline-block" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-400 inline-block" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {entry.cited ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 inline-block" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-400 inline-block" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {entry.recommended ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 inline-block" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-400 inline-block" />
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Monitor Entry Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Verificacao</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Query</Label>
              <Input
                value={newEntry.query}
                onChange={(e) => setNewEntry({ ...newEntry, query: e.target.value })}
                placeholder="Ex: melhores consultorias ISO no Brasil"
              />
            </div>
            <div className="space-y-2">
              <Label>Motor de IA</Label>
              <Select
                value={newEntry.engine}
                onValueChange={(v) => setNewEntry({ ...newEntry, engine: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chatgpt">ChatGPT</SelectItem>
                  <SelectItem value="perplexity">Perplexity</SelectItem>
                  <SelectItem value="claude">Claude</SelectItem>
                  <SelectItem value="gemini">Gemini</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label>Resultados</Label>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEntry.mentioned}
                    onChange={(e) => setNewEntry({ ...newEntry, mentioned: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  Mencionado
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEntry.cited}
                    onChange={(e) => setNewEntry({ ...newEntry, cited: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  Citado
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEntry.recommended}
                    onChange={(e) => setNewEntry({ ...newEntry, recommended: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  Recomendado
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observacoes (opcional)</Label>
              <Textarea
                value={newEntry.notes}
                onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                placeholder="Detalhes sobre como a marca apareceu na resposta..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddMonitorEntry} disabled={!newEntry.query}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
