'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  MousePointerClick,
  ExternalLink,
  Loader2,
  Save,
  Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { BIO_LINK_BUTTON_STYLES } from '@/lib/constants'
import {
  getBioPage,
  updateBioPage,
  createBioLink,
  updateBioLink,
  deleteBioLink,
  reorderBioLinks,
} from '@/lib/supabase/bio-links'
import type { BioPage, BioLink } from '@/lib/types'

export default function BioDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()

  const pageId = params.id as string

  const [page, setPage] = useState<BioPage | null>(null)
  const [links, setLinks] = useState<BioLink[]>([])
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [addingLink, setAddingLink] = useState(false)

  // Settings form
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [backgroundColor, setBackgroundColor] = useState('#ffffff')
  const [textColor, setTextColor] = useState('#000000')
  const [buttonStyle, setButtonStyle] = useState('rounded')
  const [customCss, setCustomCss] = useState('')
  const [isActive, setIsActive] = useState(true)

  // Collapsible UTM per link
  const [expandedUtm, setExpandedUtm] = useState<Record<string, boolean>>({})

  const fetchPage = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getBioPage(pageId)
      setPage(data)
      setLinks(data.links || [])
      setTitle(data.title)
      setSlug(data.slug)
      setDescription(data.description || '')
      setBackgroundColor(data.background_color)
      setTextColor(data.text_color)
      setButtonStyle(data.button_style)
      setCustomCss(data.custom_css || '')
      setIsActive(data.is_active)
    } catch (error) {
      console.error('Erro ao carregar pagina:', error)
      toast({ title: 'Pagina nao encontrada', variant: 'destructive' })
      router.push('/bio')
    } finally {
      setLoading(false)
    }
  }, [pageId])

  useEffect(() => {
    fetchPage()
  }, [fetchPage])

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      await updateBioPage(pageId, {
        title,
        slug,
        description: description || null,
        background_color: backgroundColor,
        text_color: textColor,
        button_style: buttonStyle,
        custom_css: customCss || null,
        is_active: isActive,
      })
      toast({ title: 'Configuracoes salvas' })
      fetchPage()
    } catch (error: any) {
      const message =
        error?.message?.includes('unique') || error?.code === '23505'
          ? 'Este slug ja esta em uso.'
          : 'Erro ao salvar configuracoes'
      toast({ title: message, variant: 'destructive' })
    } finally {
      setSavingSettings(false)
    }
  }

  const handleAddLink = async () => {
    if (!currentOrg) return
    setAddingLink(true)
    try {
      const newLink = await createBioLink({
        bio_page_id: pageId,
        org_id: currentOrg.id,
        title: 'Novo Link',
        url: 'https://',
        sort_order: links.length,
        is_active: true,
      })
      setLinks((prev) => [...prev, newLink])
      toast({ title: 'Link adicionado' })
    } catch (error) {
      toast({ title: 'Erro ao adicionar link', variant: 'destructive' })
    } finally {
      setAddingLink(false)
    }
  }

  const handleUpdateLink = async (
    linkId: string,
    field: string,
    value: any
  ) => {
    try {
      await updateBioLink(linkId, { [field]: value })
      setLinks((prev) =>
        prev.map((l) => (l.id === linkId ? { ...l, [field]: value } : l))
      )
    } catch (error) {
      toast({ title: 'Erro ao atualizar link', variant: 'destructive' })
    }
  }

  const handleDeleteLink = async (linkId: string) => {
    try {
      await deleteBioLink(linkId)
      setLinks((prev) => prev.filter((l) => l.id !== linkId))
      toast({ title: 'Link removido' })
    } catch (error) {
      toast({ title: 'Erro ao remover link', variant: 'destructive' })
    }
  }

  const handleMoveLink = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= links.length) return

    const newLinks = [...links]
    const temp = newLinks[index]
    newLinks[index] = newLinks[newIndex]
    newLinks[newIndex] = temp

    // Update sort orders
    const reordered = newLinks.map((link, i) => ({
      ...link,
      sort_order: i,
    }))
    setLinks(reordered)

    try {
      await reorderBioLinks(
        reordered.map((l) => ({ id: l.id, sort_order: l.sort_order }))
      )
    } catch (error) {
      toast({ title: 'Erro ao reordenar links', variant: 'destructive' })
      fetchPage()
    }
  }

  const handleCopyUrl = () => {
    const url = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/b/${slug}`
    navigator.clipboard.writeText(url)
    toast({ title: 'URL copiada' })
  }

  const totalClicks = links.reduce((sum, l) => sum + (l.click_count || 0), 0)

  // Build button class for preview
  const buttonClass =
    buttonStyle === 'pill'
      ? 'rounded-full'
      : buttonStyle === 'square'
        ? 'rounded-none'
        : 'rounded-lg'

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (!page) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/bio')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{page.title}</h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              /b/{page.slug}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyUrl}>
            <Copy className="mr-1 h-3 w-3" />
            Copiar URL
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a
              href={`/b/${page.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-1 h-3 w-3" />
              Abrir
            </a>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Eye className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{page.view_count}</p>
              <p className="text-sm text-muted-foreground">Visualizacoes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <MousePointerClick className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{totalClicks}</p>
              <p className="text-sm text-muted-foreground">Cliques Totais</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Link Manager + Settings */}
        <div className="space-y-6">
          {/* Links */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Links</CardTitle>
              <Button size="sm" onClick={handleAddLink} disabled={addingLink}>
                {addingLink ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Adicionar Link
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {links.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum link adicionado ainda.
                </p>
              )}
              {links.map((link, index) => (
                <div key={link.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === 0}
                        onClick={() => handleMoveLink(index, 'up')}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === links.length - 1}
                        onClick={() => handleMoveLink(index, 'down')}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Ativo</Label>
                        <Switch
                          checked={link.is_active}
                          onCheckedChange={(val) =>
                            handleUpdateLink(link.id, 'is_active', val)
                          }
                        />
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover link?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acao nao pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteLink(link.id)}
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Input
                      value={link.title}
                      onChange={(e) =>
                        setLinks((prev) =>
                          prev.map((l) =>
                            l.id === link.id
                              ? { ...l, title: e.target.value }
                              : l
                          )
                        )
                      }
                      onBlur={() =>
                        handleUpdateLink(link.id, 'title', link.title)
                      }
                      placeholder="Titulo do link"
                    />
                    <Input
                      value={link.url}
                      onChange={(e) =>
                        setLinks((prev) =>
                          prev.map((l) =>
                            l.id === link.id
                              ? { ...l, url: e.target.value }
                              : l
                          )
                        )
                      }
                      onBlur={() => handleUpdateLink(link.id, 'url', link.url)}
                      placeholder="https://exemplo.com"
                    />
                  </div>

                  {/* UTM collapsible */}
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        setExpandedUtm((prev) => ({
                          ...prev,
                          [link.id]: !prev[link.id],
                        }))
                      }
                    >
                      {expandedUtm[link.id]
                        ? 'Ocultar UTMs'
                        : 'Configurar UTMs'}
                    </Button>
                    {expandedUtm[link.id] && (
                      <div className="grid gap-2 mt-2">
                        <div className="grid gap-2 sm:grid-cols-3">
                          <div>
                            <Label className="text-xs">utm_source</Label>
                            <Input
                              value={link.utm_source || ''}
                              onChange={(e) =>
                                setLinks((prev) =>
                                  prev.map((l) =>
                                    l.id === link.id
                                      ? { ...l, utm_source: e.target.value }
                                      : l
                                  )
                                )
                              }
                              onBlur={() =>
                                handleUpdateLink(
                                  link.id,
                                  'utm_source',
                                  link.utm_source || null
                                )
                              }
                              placeholder="bio"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">utm_medium</Label>
                            <Input
                              value={link.utm_medium || ''}
                              onChange={(e) =>
                                setLinks((prev) =>
                                  prev.map((l) =>
                                    l.id === link.id
                                      ? { ...l, utm_medium: e.target.value }
                                      : l
                                  )
                                )
                              }
                              onBlur={() =>
                                handleUpdateLink(
                                  link.id,
                                  'utm_medium',
                                  link.utm_medium || null
                                )
                              }
                              placeholder="social"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">utm_campaign</Label>
                            <Input
                              value={link.utm_campaign || ''}
                              onChange={(e) =>
                                setLinks((prev) =>
                                  prev.map((l) =>
                                    l.id === link.id
                                      ? { ...l, utm_campaign: e.target.value }
                                      : l
                                  )
                                )
                              }
                              onBlur={() =>
                                handleUpdateLink(
                                  link.id,
                                  'utm_campaign',
                                  link.utm_campaign || null
                                )
                              }
                              placeholder="link-bio"
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {link.click_count > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {link.click_count} cliques
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Configuracoes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Titulo</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/bio/</span>
                  <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descricao</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Cor de Fundo</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cor do Texto</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Estilo dos Botoes</Label>
                <Select value={buttonStyle} onValueChange={setButtonStyle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BIO_LINK_BUTTON_STYLES).map(
                      ([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>CSS Customizado (opcional)</Label>
                <Textarea
                  value={customCss}
                  onChange={(e) => setCustomCss(e.target.value)}
                  rows={3}
                  placeholder=".bio-page { ... }"
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex items-center gap-4">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Pagina ativa</Label>
              </div>

              <Button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="w-full"
              >
                {savingSettings ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar Configuracoes
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right: Live Preview */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Pre-visualizacao</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Phone frame */}
              <div className="mx-auto max-w-[320px]">
                <div className="border-[8px] border-gray-800 rounded-[2rem] overflow-hidden shadow-xl">
                  <div
                    className="min-h-[568px] p-6 flex flex-col items-center"
                    style={{
                      backgroundColor,
                      color: textColor,
                    }}
                  >
                    {/* Avatar */}
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mb-4"
                      style={{
                        backgroundColor: textColor,
                        color: backgroundColor,
                      }}
                    >
                      {title?.charAt(0)?.toUpperCase() || '?'}
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-center mb-1">
                      {title || 'Titulo'}
                    </h3>

                    {/* Description */}
                    {description && (
                      <p className="text-sm text-center opacity-80 mb-6">
                        {description}
                      </p>
                    )}

                    {/* Links */}
                    <div className="w-full space-y-3">
                      {links
                        .filter((l) => l.is_active)
                        .map((link) => (
                          <div
                            key={link.id}
                            className={`w-full p-3 text-center text-sm font-medium border transition-opacity hover:opacity-80 ${buttonClass}`}
                            style={{
                              borderColor: textColor,
                              color: textColor,
                            }}
                          >
                            {link.title || 'Sem titulo'}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
