'use client'

import { useEffect, useState } from 'react'
import {
  Plus,
  Trash2,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Target,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import {
  getSeoKeywords,
  addSeoKeyword,
  deleteSeoKeyword,
  updateSeoKeyword,
  type SeoKeyword,
} from '@/lib/supabase/seo-keywords'

function getDifficultyColor(d: number | null): string {
  if (d === null) return 'bg-gray-100 text-gray-600'
  if (d <= 30) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
  if (d <= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
  return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
}

function getDifficultyLabel(d: number | null): string {
  if (d === null) return '-'
  if (d <= 30) return 'Facil'
  if (d <= 60) return 'Medio'
  return 'Dificil'
}

function getPositionChange(current: number | null, previous: number | null) {
  if (current === null || previous === null) return null
  return previous - current // positive = improved
}

interface AiSuggestion {
  keyword: string
  estimated_volume: number
  difficulty: number
  reasoning: string
}

export function KeywordTracker() {
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()
  const orgId = currentOrg?.id

  const [keywords, setKeywords] = useState<SeoKeyword[]>([])
  const [loading, setLoading] = useState(true)
  const [newKeyword, setNewKeyword] = useState('')
  const [adding, setAdding] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [suggestionTopic, setSuggestionTopic] = useState('')

  useEffect(() => {
    if (!orgId) return
    loadKeywords()
  }, [orgId])

  async function loadKeywords() {
    if (!orgId) return
    setLoading(true)
    try {
      const data = await getSeoKeywords(orgId)
      setKeywords(data)
    } catch (error) {
      console.error('Erro ao carregar keywords:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd() {
    if (!orgId || !newKeyword.trim()) return
    setAdding(true)
    try {
      const kw = await addSeoKeyword(orgId, newKeyword.trim())
      setKeywords((prev) => [...prev, kw])
      setNewKeyword('')
      toast({ title: 'Keyword adicionada' })
    } catch (error) {
      toast({ title: 'Erro ao adicionar', variant: 'destructive' })
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSeoKeyword(id)
      setKeywords((prev) => prev.filter((k) => k.id !== id))
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  async function handleAddSuggestion(suggestion: AiSuggestion) {
    if (!orgId) return
    try {
      const kw = await addSeoKeyword(orgId, suggestion.keyword)
      const updated = await updateSeoKeyword(kw.id, {
        search_volume: suggestion.estimated_volume,
        difficulty: suggestion.difficulty,
      })
      setKeywords((prev) => [...prev, updated])
      setSuggestions((prev) => prev.filter((s) => s.keyword !== suggestion.keyword))
      toast({ title: `"${suggestion.keyword}" adicionada` })
    } catch {
      toast({ title: 'Erro ao adicionar', variant: 'destructive' })
    }
  }

  async function handleGetSuggestions() {
    if (!orgId) return
    setLoadingSuggestions(true)
    try {
      const res = await fetch('/api/seo/suggest-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          topic: suggestionTopic || undefined,
          currentKeywords: keywords.map((k) => k.keyword),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuggestions(data.keywords || [])
      setShowSuggestions(true)
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } finally {
      setLoadingSuggestions(false)
    }
  }

  // KPIs
  const totalKeywords = keywords.length
  const avgPosition = keywords.filter((k) => k.current_position).length > 0
    ? Math.round(
        keywords
          .filter((k) => k.current_position)
          .reduce((sum, k) => sum + (k.current_position || 0), 0) /
          keywords.filter((k) => k.current_position).length
      )
    : null
  const top10Count = keywords.filter((k) => k.current_position && k.current_position <= 10).length
  const improvedCount = keywords.filter((k) => {
    const change = getPositionChange(k.current_position, k.previous_position)
    return change !== null && change > 0
  }).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Keywords</p>
                <p className="text-2xl font-bold">{totalKeywords}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Top 10</p>
                <p className="text-2xl font-bold">{top10Count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ArrowUpRight className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Melhoraram</p>
                <p className="text-2xl font-bold">{improvedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Minus className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Posicao Media</p>
                <p className="text-2xl font-bold">{avgPosition ?? '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add keyword + AI suggestions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Input
              placeholder="Adicionar keyword (ex: marketing digital)"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              disabled={adding}
              className="flex-1"
            />
            <Button onClick={handleAdd} disabled={!newKeyword.trim() || adding}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
            <Button
              variant="outline"
              onClick={handleGetSuggestions}
              disabled={loadingSuggestions}
            >
              {loadingSuggestions ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Sugestoes IA
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Keywords Table */}
      <Card>
        <CardHeader>
          <CardTitle>Keywords Monitoradas</CardTitle>
          <CardDescription>
            Acompanhe posicoes e volume de busca das suas palavras-chave.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {keywords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">Nenhuma keyword</h3>
              <p className="text-muted-foreground mt-1">
                Adicione keywords manualmente ou use sugestoes da IA.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead className="text-center">Posicao</TableHead>
                  <TableHead className="text-center">Variacao</TableHead>
                  <TableHead className="text-center">Volume</TableHead>
                  <TableHead className="text-center">Dificuldade</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywords.map((kw) => {
                  const change = getPositionChange(kw.current_position, kw.previous_position)
                  return (
                    <TableRow key={kw.id}>
                      <TableCell className="font-medium">{kw.keyword}</TableCell>
                      <TableCell className="text-center">
                        {kw.current_position ?? '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {change !== null ? (
                          <span
                            className={`inline-flex items-center gap-0.5 text-sm ${
                              change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-muted-foreground'
                            }`}
                          >
                            {change > 0 ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : change < 0 ? (
                              <ArrowDownRight className="h-3 w-3" />
                            ) : (
                              <Minus className="h-3 w-3" />
                            )}
                            {Math.abs(change)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {kw.search_volume?.toLocaleString('pt-BR') ?? '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {kw.difficulty !== null ? (
                          <Badge className={getDifficultyColor(kw.difficulty)}>
                            {kw.difficulty} - {getDifficultyLabel(kw.difficulty)}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {kw.url || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(kw.id)}
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

      {/* AI Suggestions Dialog */}
      <Dialog open={showSuggestions} onOpenChange={setShowSuggestions}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sugestoes de Keywords (IA)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma sugestao disponivel.
              </p>
            ) : (
              suggestions.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{s.keyword}</span>
                      <Badge variant="outline" className="text-xs">
                        ~{s.estimated_volume?.toLocaleString('pt-BR')}/mes
                      </Badge>
                      <Badge className={getDifficultyColor(s.difficulty)}>
                        {s.difficulty}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.reasoning}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddSuggestion(s)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Adicionar
                  </Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuggestions(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
