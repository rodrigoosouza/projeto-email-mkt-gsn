'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Video, Loader2, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { EmptyState } from '@/components/shared/empty-state'
import { useOrganizationContext } from '@/contexts/organization-context'
import { createClient } from '@/lib/supabase/client'
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

interface VideoProject {
  id: string
  name: string
  status: string
  scene_count: number
  hook: string | null
  angle: string | null
  created_at: string
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  generating: 'Gerando...',
  ready: 'Pronto',
  approved: 'Aprovado',
  archived: 'Arquivado',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  generating: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  ready: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

export default function VideosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { currentOrg } = useOrganizationContext()
  const [projects, setProjects] = useState<VideoProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentOrg) return
    const load = async () => {
      setLoading(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('video_projects')
        .select('id, name, status, scene_count, hook, angle, created_at')
        .eq('org_id', currentOrg.id)
        .order('created_at', { ascending: false })
      setProjects((data || []) as VideoProject[])
      setLoading(false)
    }
    load()
  }, [currentOrg?.id])

  async function handleDelete(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('video_projects').delete().eq('id', id)
    if (error) {
      toast({ title: 'Erro ao excluir projeto', variant: 'destructive' })
      return
    }
    setProjects((prev) => prev.filter((p) => p.id !== id))
    toast({ title: 'Projeto excluido' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Videos</h2>
          <p className="text-muted-foreground">
            Crie roteiros e gere prompts para Veo 3 e Nano Banana.
          </p>
        </div>
        <Button onClick={() => router.push('/videos/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Projeto
        </Button>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={Video}
          title="Nenhum projeto de video"
          description="Crie seu primeiro projeto para gerar cenas automaticamente."
          action={
            <Button onClick={() => router.push('/videos/new')}>Criar Projeto</Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => router.push(`/videos/${project.id}`)}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-sm line-clamp-2">{project.name}</h3>
                  <Badge variant="secondary" className={STATUS_COLORS[project.status] || ''}>
                    {STATUS_LABELS[project.status] || project.status}
                  </Badge>
                </div>

                {project.hook && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {project.hook}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {project.scene_count > 0
                      ? `${project.scene_count} cenas`
                      : 'Sem cenas'}
                  </span>
                  <span>
                    {formatDistanceToNow(new Date(project.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/videos/${project.id}`)
                    }}
                  >
                    {project.status === 'draft' ? 'Continuar' : 'Ver Cenas'}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Todas as cenas serao excluidas permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(project.id)}
                          className="bg-destructive text-destructive-foreground"
                        >
                          Excluir
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
