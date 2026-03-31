// @ts-nocheck
'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Loader2,
  Globe,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FileText,
  Palette,
  Search,
  Pencil,
  Check,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { cn } from '@/lib/utils'

interface SiteSection {
  id: string
  type: string
  title: string
  order: number
  content: any
}

interface SitePage {
  id: string
  title: string
  slug: string
  status: string
  sections: SiteSection[]
}

interface Site {
  id: string
  org_id: string
  name: string
  domain: string
  template_type: string
  status: string
  global_styles: any
  seo_global: any
  pages: SitePage[]
  created_at: string
  updated_at: string
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case 'published':
      return 'default'
    case 'building':
      return 'secondary'
    case 'draft':
    default:
      return 'outline'
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'published':
      return 'Publicado'
    case 'building':
      return 'Construindo'
    case 'draft':
    default:
      return 'Rascunho'
  }
}

export default function SiteManagementPage() {
  const { currentOrg } = useOrganizationContext()
  const orgId = currentOrg?.id
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [site, setSite] = useState<Site | null>(null)
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set())
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const fetchSite = useCallback(async () => {
    if (!orgId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/sites?orgId=${orgId}`)
      if (res.ok) {
        const data = await res.json()
        setSite(data.site || null)
      } else if (res.status === 404) {
        setSite(null)
      } else {
        const err = await res.json().catch(() => ({}))
        console.error('Error fetching site:', err)
      }
    } catch (e) {
      console.error('Error fetching site:', e)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    if (orgId) fetchSite()
  }, [orgId, fetchSite])

  const handleGenerate = async () => {
    if (!orgId) return
    setGenerating(true)
    try {
      const res = await fetch('/api/sites/auto-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId }),
      })
      const data = await res.json()
      if (res.ok && data.site) {
        setSite(data.site)
        toast({ title: 'Site gerado!', description: 'Seu site foi criado com sucesso.' })
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao gerar site.',
          variant: 'destructive',
        })
      }
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: e.message || 'Erro ao gerar site.',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  const togglePage = (pageId: string) => {
    setExpandedPages((prev) => {
      const next = new Set(prev)
      if (next.has(pageId)) {
        next.delete(pageId)
      } else {
        next.add(pageId)
      }
      return next
    })
  }

  const handleEditSectionTitle = (sectionId: string, currentTitle: string) => {
    setEditingSection(sectionId)
    setEditingTitle(currentTitle)
  }

  const handleSaveSectionTitle = async (sectionId: string) => {
    // For now, just update locally (API save can be added later)
    if (site) {
      const updatedSite = { ...site }
      updatedSite.pages = updatedSite.pages.map((page) => ({
        ...page,
        sections: page.sections.map((section) =>
          section.id === sectionId ? { ...section, title: editingTitle } : section
        ),
      }))
      setSite(updatedSite)
    }
    setEditingSection(null)
    setEditingTitle('')
    toast({ title: 'Titulo atualizado', description: 'O titulo da secao foi atualizado localmente.' })
  }

  const handleCancelEdit = () => {
    setEditingSection(null)
    setEditingTitle('')
  }

  // --- Loading ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando site...</p>
      </div>
    )
  }

  // --- No site yet ---
  if (!site) {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="h-6 w-6 text-blue-500" />
            <h2 className="text-2xl font-bold tracking-tight">Site</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {currentOrg?.name} — Gerencie seu site institucional
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Globe className="h-16 w-16 text-muted-foreground/30" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">Nenhum site encontrado</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Gere automaticamente um site completo baseado no briefing da sua organizacao.
              </p>
            </div>
            <Button onClick={handleGenerate} disabled={generating} className="gap-2 mt-2">
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Globe className="h-4 w-4" />
              )}
              {generating ? 'Gerando site...' : 'Gerar Site'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // --- Site exists ---
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="h-6 w-6 text-blue-500" />
            <h2 className="text-2xl font-bold tracking-tight">Site</h2>
            <Badge variant={statusBadgeVariant(site.status)} className="ml-2">
              {statusLabel(site.status)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {currentOrg?.name} — {site.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button variant="outline" disabled className="gap-2">
                    Publicar
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Em breve</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="outline"
            onClick={handleGenerate}
            disabled={generating}
            className="gap-2"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {generating ? 'Regenerando...' : 'Regenerar Site'}
          </Button>
        </div>
      </div>

      {/* Global Settings */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome</p>
              <p className="text-sm font-semibold mt-1">{site.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Dominio</p>
              <p className="text-sm font-semibold mt-1">{site.domain || 'Nao configurado'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Template</p>
              <p className="text-sm font-semibold mt-1">{site.template_type || 'Padrao'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="pages">
        <TabsList>
          <TabsTrigger value="pages" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Paginas
          </TabsTrigger>
          <TabsTrigger value="styles" className="gap-1.5">
            <Palette className="h-3.5 w-3.5" />
            Estilos
          </TabsTrigger>
          <TabsTrigger value="seo" className="gap-1.5">
            <Search className="h-3.5 w-3.5" />
            SEO
          </TabsTrigger>
        </TabsList>

        {/* Pages Tab */}
        <TabsContent value="pages" className="space-y-3 mt-4">
          {(!site.pages || site.pages.length === 0) ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">Nenhuma pagina encontrada</p>
              </CardContent>
            </Card>
          ) : (
            site.pages.map((page) => {
              const isExpanded = expandedPages.has(page.id)
              return (
                <Card key={page.id}>
                  <CardHeader className="pb-2 cursor-pointer" onClick={() => togglePage(page.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <CardTitle className="text-sm">{page.title}</CardTitle>
                          <CardDescription className="text-xs">
                            /{page.slug} — {page.sections?.length || 0} secoes
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={statusBadgeVariant(page.status)}>
                        {statusLabel(page.status)}
                      </Badge>
                    </div>
                  </CardHeader>

                  {isExpanded && page.sections && page.sections.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="border-t pt-3 space-y-2">
                        {page.sections
                          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                          .map((section) => (
                            <div
                              key={section.id}
                              className="flex items-center justify-between rounded-md border px-3 py-2 bg-muted/30"
                            >
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="text-xs font-mono">
                                  {section.type}
                                </Badge>
                                {editingSection === section.id ? (
                                  <div className="flex items-center gap-1.5">
                                    <Input
                                      value={editingTitle}
                                      onChange={(e) => setEditingTitle(e.target.value)}
                                      className="h-7 text-sm w-48"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveSectionTitle(section.id)
                                        if (e.key === 'Escape') handleCancelEdit()
                                      }}
                                      autoFocus
                                    />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleSaveSectionTitle(section.id)}
                                    >
                                      <Check className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={handleCancelEdit}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-sm">{section.title || '(sem titulo)'}</span>
                                )}
                              </div>
                              {editingSection !== section.id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100"
                                  onClick={() =>
                                    handleEditSectionTitle(section.id, section.title || '')
                                  }
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })
          )}
        </TabsContent>

        {/* Styles Tab */}
        <TabsContent value="styles" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4 text-violet-500" />
                Estilos Globais
              </CardTitle>
              <CardDescription>
                Cores, fontes e estilos aplicados em todo o site
              </CardDescription>
            </CardHeader>
            <CardContent>
              {site.global_styles ? (
                <div className="space-y-4">
                  {/* Colors */}
                  {site.global_styles.colors && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Cores
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {Object.entries(site.global_styles.colors).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-md border"
                              style={{ backgroundColor: value as string }}
                            />
                            <div>
                              <p className="text-xs font-medium capitalize">{key}</p>
                              <p className="text-xs text-muted-foreground">{value as string}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fonts */}
                  {site.global_styles.fonts && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Fontes
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(site.global_styles.fonts).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2 rounded-md border px-3 py-2">
                            <p className="text-xs font-medium capitalize text-muted-foreground">{key}:</p>
                            <p className="text-sm font-medium">{value as string}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other Styles */}
                  {Object.entries(site.global_styles)
                    .filter(([key]) => !['colors', 'fonts'].includes(key))
                    .length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Outros
                      </p>
                      <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-x-auto">
                        {JSON.stringify(
                          Object.fromEntries(
                            Object.entries(site.global_styles).filter(
                              ([key]) => !['colors', 'fonts'].includes(key)
                            )
                          ),
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Palette className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-sm">Nenhum estilo definido</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO Tab */}
        <TabsContent value="seo" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4 text-green-500" />
                SEO Global
              </CardTitle>
              <CardDescription>
                Configuracoes de SEO aplicadas ao site todo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {site.seo_global ? (
                <div className="space-y-3">
                  {site.seo_global.title && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Titulo
                      </p>
                      <p className="text-sm font-semibold mt-1">{site.seo_global.title}</p>
                    </div>
                  )}
                  {site.seo_global.description && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Descricao
                      </p>
                      <p className="text-sm mt-1">{site.seo_global.description}</p>
                    </div>
                  )}
                  {site.seo_global.keywords && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        Palavras-chave
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(Array.isArray(site.seo_global.keywords)
                          ? site.seo_global.keywords
                          : site.seo_global.keywords.split(',')
                        ).map((kw: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {kw.trim()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Other SEO fields */}
                  {Object.entries(site.seo_global)
                    .filter(([key]) => !['title', 'description', 'keywords'].includes(key))
                    .length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Outras configuracoes
                      </p>
                      <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-x-auto">
                        {JSON.stringify(
                          Object.fromEntries(
                            Object.entries(site.seo_global).filter(
                              ([key]) => !['title', 'description', 'keywords'].includes(key)
                            )
                          ),
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Search className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma configuracao de SEO definida</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
