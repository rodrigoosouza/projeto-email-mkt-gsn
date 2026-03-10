'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  ExternalLink,
  Eye,
  LinkIcon,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { getBioPages, deleteBioPage } from '@/lib/supabase/bio-links'
import type { BioPage } from '@/lib/types'

export default function BioPage() {
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()

  const [pages, setPages] = useState<(BioPage & { links: { count: number }[] })[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPages = async () => {
    if (!currentOrg) return
    setLoading(true)
    try {
      const data = await getBioPages(currentOrg.id)
      setPages(data)
    } catch (error) {
      console.error('Erro ao carregar paginas:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPages()
  }, [currentOrg?.id])

  const handleDelete = async (id: string) => {
    try {
      await deleteBioPage(id)
      toast({ title: 'Pagina removida com sucesso' })
      fetchPages()
    } catch (error) {
      toast({ title: 'Erro ao remover pagina', variant: 'destructive' })
    }
  }

  const handleCopyUrl = (slug: string) => {
    const url = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/b/${slug}`
    navigator.clipboard.writeText(url)
    toast({ title: 'URL copiada para a area de transferencia' })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Link da Bio</h2>
          <p className="text-muted-foreground">
            Crie paginas de links para suas redes sociais.
          </p>
        </div>
        <Button asChild>
          <Link href="/bio/new">
            <Plus className="mr-2 h-4 w-4" />
            Nova Pagina
          </Link>
        </Button>
      </div>

      {pages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <LinkIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Nenhuma pagina de bio criada ainda.
            </p>
            <Button asChild>
              <Link href="/bio/new">
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Pagina
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => {
            const linkCount = page.links?.[0]?.count || 0
            return (
              <Card key={page.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{page.title}</CardTitle>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      /b/{page.slug}
                    </p>
                  </div>
                  <Badge variant={page.is_active ? 'default' : 'secondary'}>
                    {page.is_active ? 'Ativa' : 'Inativa'}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {page.view_count} views
                    </span>
                    <span className="flex items-center gap-1">
                      <LinkIcon className="h-4 w-4" />
                      {linkCount} links
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/bio/${page.id}`}>
                        <Pencil className="mr-1 h-3 w-3" />
                        Editar
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyUrl(page.slug)}
                    >
                      <Copy className="mr-1 h-3 w-3" />
                      Copiar URL
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover pagina?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acao nao pode ser desfeita. Todos os links
                            desta pagina serao removidos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(page.id)}
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
