'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus,
  Copy,
  Trash2,
  ExternalLink,
  Eye,
  Users,
  Loader2,
  Pencil,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { formatDistanceToNow } from 'date-fns'
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

export default function LandingPagesPage() {
  const { currentOrg } = useOrganizationContext()
  const { user } = useAuth()
  const { toast } = useToast()
  const [pages, setPages] = useState<LandingPage[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchPages = useCallback(async () => {
    if (!currentOrg) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('landing_pages')
        .select('*')
        .eq('org_id', currentOrg.id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setPages(data || [])
    } catch (err) {
      console.error('Erro ao buscar landing pages:', err)
      toast({
        title: 'Erro',
        description: 'Nao foi possivel carregar as landing pages.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [currentOrg, toast])

  useEffect(() => {
    fetchPages()
  }, [fetchPages])

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('landing_pages').delete().eq('id', id)
      if (error) throw error
      setPages((prev) => prev.filter((p) => p.id !== id))
      toast({ title: 'Sucesso', description: 'Landing page excluida.' })
    } catch (err) {
      console.error('Erro ao excluir LP:', err)
      toast({
        title: 'Erro',
        description: 'Nao foi possivel excluir a landing page.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(null)
    }
  }

  function handleCopyUrl(url: string) {
    navigator.clipboard.writeText(url)
    toast({ title: 'URL copiada', description: 'Link copiado para a area de transferencia.' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Landing Pages</h2>
          <p className="text-muted-foreground">
            Crie e gerencie landing pages com IA.
          </p>
        </div>
        <Button asChild>
          <Link href="/landing-pages/new">
            <Plus className="mr-2 h-4 w-4" />
            Nova Landing Page
          </Link>
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : pages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
              <ExternalLink className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Nenhuma landing page</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-4">
              Crie sua primeira landing page com IA para comecar a capturar leads.
            </p>
            <Button asChild>
              <Link href="/landing-pages/new">
                <Plus className="mr-2 h-4 w-4" />
                Criar Landing Page
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pages.map((lp) => (
            <Card key={lp.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-1">{lp.name}</CardTitle>
                  <Badge
                    variant="secondary"
                    className={STATUS_STYLES[lp.status] || 'bg-gray-100 text-gray-800'}
                  >
                    {STATUS_LABELS[lp.status] || lp.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {lp.brand}
                  </Badge>
                </div>

                {lp.deploy_url && (
                  <div className="flex items-center gap-2 text-sm">
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <a
                      href={lp.deploy_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline truncate"
                    >
                      {lp.deploy_url}
                    </a>
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    <span>{lp.view_count ?? 0} views</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    <span>{lp.lead_count ?? 0} leads</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Criada{' '}
                  {formatDistanceToNow(new Date(lp.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <Link href={`/landing-pages/${lp.id}`}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Editar
                    </Link>
                  </Button>
                  {lp.deploy_url && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleCopyUrl(lp.deploy_url!)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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
                          onClick={() => handleDelete(lp.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleting === lp.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Excluir'
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
