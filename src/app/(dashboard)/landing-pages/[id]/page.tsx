'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ExternalLink,
  Trash2,
  RefreshCw,
  Loader2,
  Eye,
  Users,
  Globe,
  Settings,
  BarChart3,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
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
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface LandingPage {
  id: string
  org_id: string
  name: string
  brand: string
  theme: string
  status: string
  html_content: string | null
  copy_text: string | null
  deploy_url: string | null
  vercel_deployment_id: string | null
  session_id: string | null
  view_count: number | null
  lead_count: number | null
  created_by: string
  created_at: string
  updated_at: string
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  generating: 'bg-yellow-100 text-yellow-800',
  reviewing: 'bg-blue-100 text-blue-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-600',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  generating: 'Gerando',
  reviewing: 'Em Revisao',
  published: 'Publicada',
  archived: 'Arquivada',
}

export default function LandingPageDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { currentOrg } = useOrganizationContext()
  const { user } = useAuth()
  const pageId = params.id as string

  const [lp, setLp] = useState<LandingPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [redeploying, setRedeploying] = useState(false)
  const [editName, setEditName] = useState('')

  const fetchLP = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('landing_pages')
        .select('*')
        .eq('id', pageId)
        .single()

      if (error) throw error
      setLp(data)
      setEditName(data.name)
    } catch (err) {
      console.error('Erro ao buscar landing page:', err)
      toast({
        title: 'Erro',
        description: 'Landing page nao encontrada.',
        variant: 'destructive',
      })
      router.push('/landing-pages')
    } finally {
      setLoading(false)
    }
  }, [pageId, router, toast])

  useEffect(() => {
    fetchLP()
  }, [fetchLP])

  async function handleSaveName() {
    if (!lp || editName === lp.name) return
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('landing_pages')
        .update({ name: editName, updated_at: new Date().toISOString() })
        .eq('id', lp.id)

      if (error) throw error
      setLp({ ...lp, name: editName })
      toast({ title: 'Salvo', description: 'Nome atualizado com sucesso.' })
    } catch (err) {
      console.error('Erro ao salvar:', err)
      toast({
        title: 'Erro',
        description: 'Nao foi possivel salvar.',
        variant: 'destructive',
      })
    }
  }

  async function handleRedeploy() {
    if (!lp?.html_content || !lp.brand) return
    setRedeploying(true)
    try {
      const res = await fetch('/api/lp-builder/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa: lp.brand,
          html: lp.html_content,
          titulo: lp.name,
          session_id: lp.session_id || `redeploy-${Date.now()}`,
        }),
      })

      if (!res.ok) throw new Error('Erro no deploy')
      const data = await res.json()

      const supabase = createClient()
      await supabase
        .from('landing_pages')
        .update({
          status: 'published',
          deploy_url: data.url || data.vercel_url,
          vercel_deployment_id: data.deployment_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lp.id)

      setLp({
        ...lp,
        status: 'published',
        deploy_url: data.url || data.vercel_url,
        vercel_deployment_id: data.deployment_id,
      })

      toast({ title: 'Republicado!', description: 'Landing page publicada novamente.' })
    } catch (err) {
      console.error('Erro ao republicar:', err)
      toast({
        title: 'Erro',
        description: 'Nao foi possivel republicar.',
        variant: 'destructive',
      })
    } finally {
      setRedeploying(false)
    }
  }

  async function handleDelete() {
    if (!lp) return
    setDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('landing_pages').delete().eq('id', lp.id)
      if (error) throw error
      toast({ title: 'Excluida', description: 'Landing page removida.' })
      router.push('/landing-pages')
    } catch (err) {
      console.error('Erro ao excluir:', err)
      toast({
        title: 'Erro',
        description: 'Nao foi possivel excluir.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!lp) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/landing-pages')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{lp.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="capitalize">
                {lp.brand}
              </Badge>
              <Badge
                variant="secondary"
                className={STATUS_STYLES[lp.status] || 'bg-gray-100 text-gray-800'}
              >
                {STATUS_LABELS[lp.status] || lp.status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lp.html_content && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRedeploy}
              disabled={redeploying}
            >
              {redeploying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Republicar
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir landing page?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acao nao pode ser desfeita. A landing page &quot;{lp.name}&quot; sera
                  permanentemente excluida.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Excluir'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="preview">
        <TabsList>
          <TabsTrigger value="preview" className="gap-1.5">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5">
            <Settings className="h-4 w-4" />
            Configuracao
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Preview Tab */}
        <TabsContent value="preview" className="mt-4">
          {lp.html_content ? (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <iframe
                  srcDoc={lp.html_content}
                  className="w-full border-0"
                  style={{ height: '80vh' }}
                  sandbox="allow-scripts allow-same-origin"
                  title="Preview da Landing Page"
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Globe className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">
                  Nenhum conteudo HTML disponivel para preview.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informacoes Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="lp-name">Nome</Label>
                <div className="flex gap-2">
                  <Input
                    id="lp-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={handleSaveName}
                    disabled={editName === lp.name}
                  >
                    Salvar
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Status</Label>
                  <p className="text-sm">
                    <Badge
                      variant="secondary"
                      className={STATUS_STYLES[lp.status] || ''}
                    >
                      {STATUS_LABELS[lp.status] || lp.status}
                    </Badge>
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Marca</Label>
                  <p className="text-sm capitalize">{lp.brand}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Tema</Label>
                  <p className="text-sm capitalize">{lp.theme}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Criada em</Label>
                  <p className="text-sm">
                    {format(new Date(lp.created_at), "dd/MM/yyyy 'as' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Atualizada</Label>
                  <p className="text-sm">
                    {formatDistanceToNow(new Date(lp.updated_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deploy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-muted-foreground">URL de Deploy</Label>
                {lp.deploy_url ? (
                  <div className="flex items-center gap-2">
                    <a
                      href={lp.deploy_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline break-all"
                    >
                      {lp.deploy_url}
                    </a>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nao publicada</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Deployment ID</Label>
                <p className="text-sm font-mono text-muted-foreground">
                  {lp.vercel_deployment_id || '\u2014'}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Session ID</Label>
                <p className="text-sm font-mono text-muted-foreground">
                  {lp.session_id || '\u2014'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  Visualizacoes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{lp.view_count ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Total de pageviews</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Leads Capturados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{lp.lead_count ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Total de leads gerados</p>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Conversao</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {lp.view_count && lp.view_count > 0
                    ? `${(((lp.lead_count || 0) / lp.view_count) * 100).toFixed(1)}%`
                    : '\u2014'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Leads / Visualizacoes</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
