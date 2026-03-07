'use client'

import { useState, useEffect } from 'react'
import { Search, Trash2, RefreshCw, Loader2, AlertCircle, AlertTriangle, Info, CheckCircle2, Globe, Clock, Link2, Image } from 'lucide-react'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { useAuth } from '@/hooks/use-auth'
import { getSeoAnalyses, deleteSeoAnalysis } from '@/lib/supabase/seo'
import type { SeoAnalysis, SeoIssue } from '@/lib/types'
import { SEO_ISSUE_TYPE_LABELS, SEO_ISSUE_TYPE_COLORS } from '@/lib/constants'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-800'
  if (score >= 60) return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-800'
}

function getIssueIcon(type: string) {
  switch (type) {
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    case 'info':
      return <Info className="h-4 w-4 text-blue-500" />
    default:
      return null
  }
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  analyzing: 'Analisando',
  completed: 'Concluida',
  failed: 'Falhou',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  analyzing: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

export default function SeoPage() {
  const { currentOrg } = useOrganizationContext()
  const { user } = useAuth()
  const { toast } = useToast()
  const orgId = currentOrg?.id

  const [analyses, setAnalyses] = useState<SeoAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [url, setUrl] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [currentResult, setCurrentResult] = useState<SeoAnalysis | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (!orgId) return
    loadAnalyses()
  }, [orgId])

  async function loadAnalyses() {
    if (!orgId) return
    setLoading(true)
    try {
      const result = await getSeoAnalyses(orgId)
      setAnalyses(result)
    } catch (error) {
      console.error('Erro ao carregar analises:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAnalyze(targetUrl?: string) {
    const urlToAnalyze = targetUrl || url
    if (!orgId || !user || !urlToAnalyze) return

    // Basic URL validation
    let validUrl = urlToAnalyze
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl
    }

    setAnalyzing(true)
    setCurrentResult(null)
    try {
      const res = await fetch('/api/seo/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: validUrl, org_id: orgId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao analisar')

      setCurrentResult(data.analysis)
      setUrl('')
      toast({
        title: 'Analise concluida',
        description: `Score: ${data.analysis.overall_score}/100`,
      })
      await loadAnalyses()
    } catch (error: any) {
      toast({
        title: 'Erro na analise',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteSeoAnalysis(deleteId)
      setAnalyses((prev) => prev.filter((a) => a.id !== deleteId))
      if (currentResult?.id === deleteId) setCurrentResult(null)
      toast({
        title: 'Analise excluida',
        description: 'A analise foi excluida com sucesso.',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Nao foi possivel excluir a analise.',
        variant: 'destructive',
      })
    } finally {
      setDeleteId(null)
    }
  }

  // Group issues by category
  const groupedIssues = currentResult?.issues?.reduce<Record<string, SeoIssue[]>>(
    (acc, issue) => {
      if (!acc[issue.category]) acc[issue.category] = []
      acc[issue.category].push(issue)
      return acc
    },
    {}
  ) || {}

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Analisador SEO</h2>
        <p className="text-muted-foreground">
          Analise qualquer URL e obtenha recomendacoes de SEO.
        </p>
      </div>

      {/* URL Input */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Digite a URL para analisar (ex: https://exemplo.com.br)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                disabled={analyzing}
              />
            </div>
            <Button onClick={() => handleAnalyze()} disabled={!url || analyzing}>
              {analyzing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Analisar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {analyzing && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Analisando URL...</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {currentResult && currentResult.status === 'completed' && (
        <div className="space-y-6">
          {/* Score */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <p className="text-sm text-muted-foreground mb-2">Score Geral</p>
                  <p className={`text-5xl font-bold ${getScoreColor(currentResult.overall_score)}`}>
                    {currentResult.overall_score}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">/100</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Erros</p>
                    <p className="text-2xl font-bold">
                      {currentResult.issues?.filter((i) => i.type === 'error').length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Avisos</p>
                    <p className="text-2xl font-bold">
                      {currentResult.issues?.filter((i) => i.type === 'warning').length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Info</p>
                    <p className="text-2xl font-bold">
                      {currentResult.issues?.filter((i) => i.type === 'info').length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Meta Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informacoes da Pagina</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">URL</p>
                <p className="text-sm break-all">{currentResult.url}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Title</p>
                <p className="text-sm">{currentResult.title || <span className="text-red-500">Nao encontrado</span>}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Meta Description</p>
                <p className="text-sm">{currentResult.meta_description || <span className="text-red-500">Nao encontrada</span>}</p>
              </div>
            </CardContent>
          </Card>

          {/* Issues by category */}
          {Object.keys(groupedIssues).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Problemas Encontrados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(groupedIssues).map(([category, issues]) => (
                  <div key={category}>
                    <h4 className="text-sm font-semibold mb-2">{category}</h4>
                    <div className="space-y-2">
                      {issues.map((issue, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-2 rounded-md bg-muted/50"
                        >
                          {getIssueIcon(issue.type)}
                          <div className="flex-1">
                            <p className="text-sm">{issue.message}</p>
                            {issue.element && (
                              <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
                                {issue.element}
                              </p>
                            )}
                          </div>
                          <Badge className={SEO_ISSUE_TYPE_COLORS[issue.type]}>
                            {SEO_ISSUE_TYPE_LABELS[issue.type]}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {currentResult.recommendations && currentResult.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recomendacoes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {currentResult.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Performance Data */}
          {currentResult.performance_data && Object.keys(currentResult.performance_data).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Metricas de Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {currentResult.performance_data.load_time_ms !== undefined && (
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Tempo de Carga</p>
                        <p className="font-semibold">{currentResult.performance_data.load_time_ms}ms</p>
                      </div>
                    </div>
                  )}
                  {currentResult.performance_data.html_size_bytes !== undefined && (
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Tamanho HTML</p>
                        <p className="font-semibold">
                          {(currentResult.performance_data.html_size_bytes / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  )}
                  {currentResult.performance_data.total_links !== undefined && (
                    <div className="flex items-center gap-3">
                      <Link2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total de Links</p>
                        <p className="font-semibold">{currentResult.performance_data.total_links}</p>
                      </div>
                    </div>
                  )}
                  {currentResult.performance_data.total_images !== undefined && (
                    <div className="flex items-center gap-3">
                      <Image className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total de Imagens</p>
                        <p className="font-semibold">{currentResult.performance_data.total_images}</p>
                      </div>
                    </div>
                  )}
                  {currentResult.performance_data.status_code !== undefined && (
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Status HTTP</p>
                        <p className="font-semibold">{currentResult.performance_data.status_code}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historico de Analises</CardTitle>
          <CardDescription>
            Analises SEO realizadas anteriormente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Carregando...</div>
            </div>
          ) : analyses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">Nenhuma analise ainda</h3>
              <p className="text-muted-foreground mt-1">
                Digite uma URL acima para comecar sua primeira analise SEO.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyses.map((analysis) => (
                  <TableRow
                    key={analysis.id}
                    className="cursor-pointer"
                    onClick={() => {
                      if (analysis.status === 'completed') setCurrentResult(analysis)
                    }}
                  >
                    <TableCell className="text-sm max-w-xs truncate">
                      {analysis.url}
                    </TableCell>
                    <TableCell>
                      {analysis.status === 'completed' ? (
                        <Badge className={getScoreBgColor(analysis.overall_score)}>
                          {analysis.overall_score}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[analysis.status]}>
                        {STATUS_LABELS[analysis.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(analysis.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAnalyze(analysis.url)
                          }}
                          disabled={analyzing}
                          title="Re-analisar"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteId(analysis.id)
                          }}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir analise?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. A analise sera removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
