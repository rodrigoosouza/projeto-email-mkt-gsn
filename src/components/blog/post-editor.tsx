'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles, Trash2, Upload, Image as ImageIcon, Loader2, Brain, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'

interface BlogPost {
  id?: string
  title: string
  slug: string
  content: string
  excerpt: string
  status: string
  category: string
  tags: string[]
  seo_title: string
  seo_description: string
  seo_keywords: string[]
  featured_image_url: string
  reading_time_minutes: number | null
  published_at: string | null
}

const emptyPost: BlogPost = {
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  status: 'draft',
  category: '',
  tags: [],
  seo_title: '',
  seo_description: '',
  seo_keywords: [],
  featured_image_url: '',
  reading_time_minutes: null,
  published_at: null,
}

interface GeoMethodScore {
  score: number
  label: string
  suggestion: string
}

interface GeoCheckResult {
  overall_score: number
  methods: {
    cite_sources: GeoMethodScore
    quotation_addition: GeoMethodScore
    statistics_addition: GeoMethodScore
    fluency_optimization: GeoMethodScore
    authoritative_tone: GeoMethodScore
    easy_to_understand: GeoMethodScore
    technical_terms: GeoMethodScore
    unique_words: GeoMethodScore
    keyword_optimization: GeoMethodScore
  }
  metadata: {
    citable_blocks: number
    has_faq: boolean
    has_tldr: boolean
    word_count: number
    reading_time: number
  }
}

interface PostEditorProps {
  post?: BlogPost
}

export function PostEditor({ post: initialPost }: PostEditorProps) {
  const router = useRouter()
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()

  const isEditMode = !!initialPost?.id
  const [post, setPost] = useState<BlogPost>(initialPost || emptyPost)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [generatingContent, setGeneratingContent] = useState(false)
  const [generatingImage, setGeneratingImage] = useState(false)
  const [showAiDialog, setShowAiDialog] = useState(false)

  // AI generation form
  const [aiTopic, setAiTopic] = useState('')
  const [aiKeywords, setAiKeywords] = useState('')
  const [aiTone, setAiTone] = useState('profissional')
  const [aiLength, setAiLength] = useState('medio')

  // Tags and keywords as comma-separated strings for editing
  const [tagsInput, setTagsInput] = useState(post.tags?.join(', ') || '')
  const [seoKeywordsInput, setSeoKeywordsInput] = useState(post.seo_keywords?.join(', ') || '')

  // GEO Score state
  const [geoResult, setGeoResult] = useState<GeoCheckResult | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoExpanded, setGeoExpanded] = useState(true)
  const geoDebounceRef = useRef<NodeJS.Timeout | null>(null)

  const analyzeGeo = useCallback(async (content: string) => {
    if (!content || content.trim().length < 50) return
    setGeoLoading(true)
    try {
      const res = await fetch('/api/seo/geo-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          title: post.title,
          keywords: seoKeywordsInput.split(',').map((k) => k.trim()).filter(Boolean),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setGeoResult(data)
      }
    } catch (error) {
      console.error('GEO check error:', error)
    } finally {
      setGeoLoading(false)
    }
  }, [post.title, seoKeywordsInput])

  // Auto-analyze with debounce (5 seconds of inactivity)
  useEffect(() => {
    if (geoDebounceRef.current) clearTimeout(geoDebounceRef.current)
    geoDebounceRef.current = setTimeout(() => {
      if (post.content && post.content.trim().length >= 50) {
        analyzeGeo(post.content)
      }
    }, 5000)
    return () => {
      if (geoDebounceRef.current) clearTimeout(geoDebounceRef.current)
    }
  }, [post.content, analyzeGeo])

  useEffect(() => {
    if (initialPost) {
      setPost(initialPost)
      setTagsInput(initialPost.tags?.join(', ') || '')
      setSeoKeywordsInput(initialPost.seo_keywords?.join(', ') || '')
    }
  }, [initialPost])

  function updateField<K extends keyof BlogPost>(field: K, value: BlogPost[K]) {
    setPost((prev) => ({ ...prev, [field]: value }))
  }

  function generateSlug(title: string) {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  function handleTitleChange(title: string) {
    updateField('title', title)
    if (!isEditMode || !post.slug) {
      updateField('slug', generateSlug(title))
    }
  }

  async function handleSave(publishStatus?: string) {
    if (!currentOrg?.id) {
      toast({ title: 'Erro', description: 'Selecione uma organizacao.', variant: 'destructive' })
      return
    }

    if (!post.title.trim()) {
      toast({ title: 'Erro', description: 'Preencha o titulo do artigo.', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...post,
        status: publishStatus || post.status,
        tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
        seo_keywords: seoKeywordsInput.split(',').map((k) => k.trim()).filter(Boolean),
        org_id: currentOrg.id,
      }

      const url = isEditMode ? `/api/blog/${post.id}` : '/api/blog'
      const method = isEditMode ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao salvar artigo')
      }

      toast({ title: 'Sucesso', description: isEditMode ? 'Artigo atualizado.' : 'Artigo criado.' })
      router.push('/blog')
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Nao foi possivel salvar o artigo.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!post.id) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/blog/${post.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir artigo')

      toast({ title: 'Sucesso', description: 'Artigo excluido.' })
      router.push('/blog')
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Nao foi possivel excluir o artigo.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  async function handleGenerateContent() {
    if (!aiTopic.trim()) {
      toast({ title: 'Erro', description: 'Informe o tema do artigo.', variant: 'destructive' })
      return
    }

    setGeneratingContent(true)
    try {
      const res = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic,
          keywords: aiKeywords,
          tone: aiTone,
          length: aiLength,
          org_id: currentOrg?.id,
        }),
      })

      if (!res.ok) throw new Error('Erro ao gerar conteudo')

      const data = await res.json()

      setPost((prev) => ({
        ...prev,
        title: data.title || prev.title,
        content: data.content || prev.content,
        excerpt: data.excerpt || prev.excerpt,
        seo_title: data.seo_title || prev.seo_title,
        seo_description: data.seo_description || prev.seo_description,
        category: data.category || prev.category,
        slug: data.title ? generateSlug(data.title) : prev.slug,
      }))

      if (data.seo_keywords) {
        setSeoKeywordsInput(
          Array.isArray(data.seo_keywords) ? data.seo_keywords.join(', ') : data.seo_keywords
        )
      }
      if (data.tags) {
        setTagsInput(Array.isArray(data.tags) ? data.tags.join(', ') : data.tags)
      }

      setShowAiDialog(false)
      toast({ title: 'Conteudo gerado', description: 'Revise e ajuste o conteudo antes de publicar.' })
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Nao foi possivel gerar o conteudo.',
        variant: 'destructive',
      })
    } finally {
      setGeneratingContent(false)
    }
  }

  async function handleGenerateImage() {
    if (!post.title.trim()) {
      toast({ title: 'Erro', description: 'Preencha o titulo primeiro.', variant: 'destructive' })
      return
    }

    setGeneratingImage(true)
    try {
      const res = await fetch('/api/blog/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: post.title,
          excerpt: post.excerpt,
          org_id: currentOrg?.id,
        }),
      })

      if (!res.ok) throw new Error('Erro ao gerar imagem')

      const data = await res.json()
      if (data.image_url) {
        updateField('featured_image_url', data.image_url)
        toast({ title: 'Imagem gerada', description: 'Imagem de destaque criada com sucesso.' })
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Nao foi possivel gerar a imagem.',
        variant: 'destructive',
      })
    } finally {
      setGeneratingImage(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/blog">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {isEditMode ? 'Editar Artigo' : 'Novo Artigo'}
            </h2>
            <p className="text-muted-foreground">
              {isEditMode ? 'Atualize o conteudo do artigo.' : 'Crie um novo artigo para o blog.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowAiDialog(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            Gerar com IA
          </Button>
          {isEditMode && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon" disabled={deleting}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir artigo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acao nao pode ser desfeita. O artigo sera permanentemente removido.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'Excluindo...' : 'Excluir'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Editor column */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Input
                  placeholder="Titulo do artigo..."
                  value={post.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="text-xl font-bold h-12 border-none shadow-none focus-visible:ring-0 px-0 text-foreground placeholder:text-muted-foreground/50"
                />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Slug:</span>
                  <Input
                    value={post.slug}
                    onChange={(e) => updateField('slug', e.target.value)}
                    className="h-7 text-xs max-w-[400px]"
                    placeholder="slug-do-artigo"
                  />
                </div>
              </div>

              <Textarea
                placeholder="Escreva seu artigo em markdown..."
                value={post.content}
                onChange={(e) => updateField('content', e.target.value)}
                className="min-h-[500px] font-mono text-sm resize-y"
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar column */}
        <div className="space-y-4">
          {/* Publication */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Publicacao</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={post.status} onValueChange={(v) => updateField('status', v)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="review">Em Revisao</SelectItem>
                    <SelectItem value="scheduled">Agendado</SelectItem>
                    <SelectItem value="published">Publicado</SelectItem>
                    <SelectItem value="archived">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => handleSave('published')}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Publicar'
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleSave('draft')}
                  disabled={saving}
                >
                  Salvar Rascunho
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="seo-title">Titulo SEO</Label>
                <Input
                  id="seo-title"
                  value={post.seo_title}
                  onChange={(e) => updateField('seo_title', e.target.value)}
                  placeholder="Titulo para buscadores"
                  maxLength={70}
                />
                <p className="text-xs text-muted-foreground">
                  {post.seo_title.length}/70 caracteres
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="seo-description">Descricao SEO</Label>
                <Textarea
                  id="seo-description"
                  value={post.seo_description}
                  onChange={(e) => updateField('seo_description', e.target.value)}
                  placeholder="Descricao para buscadores"
                  maxLength={160}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  {post.seo_description.length}/160 caracteres
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="seo-keywords">Palavras-chave SEO</Label>
                <Input
                  id="seo-keywords"
                  value={seoKeywordsInput}
                  onChange={(e) => setSeoKeywordsInput(e.target.value)}
                  placeholder="palavra1, palavra2, palavra3"
                />
              </div>
            </CardContent>
          </Card>

          {/* GEO Score */}
          <Card>
            <CardHeader className="pb-3 cursor-pointer" onClick={() => setGeoExpanded(!geoExpanded)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-500" />
                  <CardTitle className="text-sm font-medium">GEO Score</CardTitle>
                  {geoResult && (
                    <Badge
                      variant={geoResult.overall_score >= 70 ? 'default' : geoResult.overall_score >= 40 ? 'secondary' : 'destructive'}
                      className="ml-1"
                    >
                      {geoResult.overall_score}/100
                    </Badge>
                  )}
                </div>
                {geoExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CardHeader>
            {geoExpanded && (
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => analyzeGeo(post.content)}
                  disabled={geoLoading || !post.content.trim()}
                >
                  {geoLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      Analisar
                    </>
                  )}
                </Button>

                {geoResult && (
                  <>
                    {/* Method scores */}
                    <div className="space-y-3">
                      {Object.entries(geoResult.methods).map(([key, method]) => (
                        <div key={key} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground truncate mr-2">{method.label}</span>
                            <span className="font-medium tabular-nums">{method.score}%</span>
                          </div>
                          <Progress value={method.score} className="h-1.5" />
                          {method.suggestion && (
                            <p className="text-[10px] text-muted-foreground leading-tight">{method.suggestion}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Metadata */}
                    <div className="border-t pt-3 space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">Metadados</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <span className="text-muted-foreground">Palavras:</span>
                        <span className="font-medium">{geoResult.metadata.word_count}</span>
                        <span className="text-muted-foreground">Tempo leitura:</span>
                        <span className="font-medium">{geoResult.metadata.reading_time} min</span>
                        <span className="text-muted-foreground">Blocos citaveis:</span>
                        <span className="font-medium">{geoResult.metadata.citable_blocks}</span>
                        <span className="text-muted-foreground">FAQ:</span>
                        <span className="font-medium">{geoResult.metadata.has_faq ? 'Sim' : 'Nao'}</span>
                        <span className="text-muted-foreground">TL;DR:</span>
                        <span className="font-medium">{geoResult.metadata.has_tldr ? 'Sim' : 'Nao'}</span>
                      </div>
                    </div>
                  </>
                )}

                {!geoResult && !geoLoading && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Escreva pelo menos 50 caracteres para analisar o GEO Score.
                  </p>
                )}
              </CardContent>
            )}
          </Card>

          {/* Featured Image */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Imagem Destaque</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {post.featured_image_url ? (
                <div className="relative aspect-video overflow-hidden rounded-md border">
                  <img
                    src={post.featured_image_url}
                    alt="Imagem destaque"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-md border border-dashed">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                </div>
              )}
              <div className="space-y-2">
                <Input
                  value={post.featured_image_url}
                  onChange={(e) => updateField('featured_image_url', e.target.value)}
                  placeholder="URL da imagem"
                />
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGenerateImage}
                disabled={generatingImage}
              >
                {generatingImage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Gerar com IA
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Category and Tags */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Categoria e Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={post.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  placeholder="Ex: Marketing Digital"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="tag1, tag2, tag3"
                />
                {tagsInput && (
                  <div className="flex flex-wrap gap-1">
                    {tagsInput
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Excerpt */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Resumo</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={post.excerpt}
                onChange={(e) => updateField('excerpt', e.target.value)}
                placeholder="Resumo do artigo para listagens e redes sociais..."
                rows={4}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Generation Dialog */}
      <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Artigo com IA</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ai-topic">Tema</Label>
              <Input
                id="ai-topic"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="Ex: Como aumentar vendas com email marketing"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-keywords">Palavras-chave</Label>
              <Input
                id="ai-keywords"
                value={aiKeywords}
                onChange={(e) => setAiKeywords(e.target.value)}
                placeholder="email marketing, vendas, conversao"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tom</Label>
                <Select value={aiTone} onValueChange={setAiTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profissional">Profissional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="tecnico">Tecnico</SelectItem>
                    <SelectItem value="inspirador">Inspirador</SelectItem>
                    <SelectItem value="educativo">Educativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tamanho</Label>
                <Select value={aiLength} onValueChange={setAiLength}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="curto">Curto (~500 palavras)</SelectItem>
                    <SelectItem value="medio">Medio (~1000 palavras)</SelectItem>
                    <SelectItem value="longo">Longo (~2000 palavras)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAiDialog(false)}
              disabled={generatingContent}
            >
              Cancelar
            </Button>
            <Button onClick={handleGenerateContent} disabled={generatingContent}>
              {generatingContent ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Gerar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
