'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  Check,
  X,
  RefreshCw,
  Copy,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Film,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'

interface VideoProject {
  id: string
  name: string
  status: string
  script_input: string | null
  hook: string | null
  cta_text: string | null
  angle: string | null
  target_audience: string | null
  characters: { name: string; role: string }[]
  scene_count: number
  created_at: string
}

interface VideoScene {
  id: string
  scene_index: number
  title: string
  scene_phase: string
  scene_type: string | null
  objective: string | null
  narration: string | null
  visual_description: string | null
  duration_seconds: number
  image_prompt: string | null
  video_prompt: string | null
  status: string
}

const PHASE_LABELS: Record<string, string> = {
  hook: 'Hook',
  development: 'Desenvolvimento',
  turning_point: 'Virada',
  cta: 'CTA',
}

const PHASE_COLORS: Record<string, string> = {
  hook: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  development: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  turning_point: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  cta: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <div className="w-3 h-3 rounded-full bg-gray-400" />,
  approved: <Check className="h-4 w-4 text-green-600" />,
  rejected: <X className="h-4 w-4 text-red-600" />,
  regenerating: <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />,
}

export default function VideoProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const projectId = params.id as string

  const [project, setProject] = useState<VideoProject | null>(null)
  const [scenes, setScenes] = useState<VideoScene[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedScene, setExpandedScene] = useState<string | null>(null)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const [{ data: proj }, { data: scns }] = await Promise.all([
      supabase.from('video_projects').select('*').eq('id', projectId).single(),
      supabase
        .from('video_scenes')
        .select('*')
        .eq('project_id', projectId)
        .order('scene_index', { ascending: true }),
    ])

    setProject(proj as VideoProject | null)
    setScenes((scns || []) as VideoScene[])
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function updateSceneStatus(sceneId: string, status: 'approved' | 'rejected') {
    const supabase = createClient()
    await supabase.from('video_scenes').update({ status }).eq('id', sceneId)
    setScenes((prev) =>
      prev.map((s) => (s.id === sceneId ? { ...s, status } : s))
    )

    const label = status === 'approved' ? 'aprovada' : 'reprovada'
    toast({ title: `Cena ${label}` })

    // Check if all scenes are approved
    const updated = scenes.map((s) => (s.id === sceneId ? { ...s, status } : s))
    if (updated.every((s) => s.status === 'approved')) {
      await supabase
        .from('video_projects')
        .update({ status: 'approved' })
        .eq('id', projectId)
      setProject((prev) => prev ? { ...prev, status: 'approved' } : null)
      toast({ title: 'Projeto aprovado!', description: 'Todas as cenas foram aprovadas.' })
    }
  }

  async function approveAll() {
    const supabase = createClient()
    const ids = scenes.filter((s) => s.status !== 'approved').map((s) => s.id)
    if (ids.length === 0) return

    await supabase.from('video_scenes').update({ status: 'approved' }).in('id', ids)
    await supabase.from('video_projects').update({ status: 'approved' }).eq('id', projectId)

    setScenes((prev) => prev.map((s) => ({ ...s, status: 'approved' })))
    setProject((prev) => prev ? { ...prev, status: 'approved' } : null)
    toast({ title: 'Todas as cenas aprovadas!' })
  }

  async function regenerateScene(sceneId: string) {
    if (!project?.script_input) return
    setRegeneratingId(sceneId)

    const scene = scenes.find((s) => s.id === sceneId)
    if (!scene) return

    try {
      const apiKey = undefined // done server-side
      const res = await fetch('/api/videos/generate-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          scriptInput: project.script_input,
          adIdea: '',
          targetAudience: project.target_audience,
          referencesNotes: '',
        }),
      })

      if (res.ok) {
        await fetchData()
        toast({ title: 'Cenas regeneradas' })
      }
    } catch {
      toast({ title: 'Erro ao regenerar', variant: 'destructive' })
    } finally {
      setRegeneratingId(null)
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text)
    toast({ title: `${label} copiado!` })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!project) {
    return <p className="text-center text-muted-foreground py-20">Projeto nao encontrado.</p>
  }

  const approvedCount = scenes.filter((s) => s.status === 'approved').length
  const totalDuration = scenes.reduce((acc, s) => acc + s.duration_seconds, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/videos')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{project.name}</h2>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span>{scenes.length} cenas</span>
              <span>{totalDuration}s total</span>
              <span>{approvedCount}/{scenes.length} aprovadas</span>
              {project.angle && <Badge variant="outline">{project.angle}</Badge>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => regenerateScene('')}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Regenerar Tudo
          </Button>
          <Button size="sm" onClick={approveAll} disabled={approvedCount === scenes.length}>
            <Check className="mr-2 h-4 w-4" />
            Aprovar Todas
          </Button>
        </div>
      </div>

      {/* Summary */}
      {project.hook && (
        <Card>
          <CardContent className="py-4">
            <div className="grid gap-2 md:grid-cols-3 text-sm">
              <div>
                <span className="font-medium">Hook:</span>{' '}
                <span className="text-muted-foreground">{project.hook}</span>
              </div>
              <div>
                <span className="font-medium">CTA:</span>{' '}
                <span className="text-muted-foreground">{project.cta_text}</span>
              </div>
              <div>
                <span className="font-medium">Publico:</span>{' '}
                <span className="text-muted-foreground">{project.target_audience}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scenes Timeline */}
      <div className="space-y-3">
        {scenes.map((scene) => {
          const isExpanded = expandedScene === scene.id

          return (
            <Card
              key={scene.id}
              className={`transition-all ${
                scene.status === 'approved'
                  ? 'border-green-200 dark:border-green-800'
                  : scene.status === 'rejected'
                    ? 'border-red-200 dark:border-red-800'
                    : ''
              }`}
            >
              {/* Scene Header */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer"
                onClick={() => setExpandedScene(isExpanded ? null : scene.id)}
              >
                <div className="flex-shrink-0">{STATUS_ICONS[scene.status]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{scene.title}</span>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${PHASE_COLORS[scene.scene_phase] || ''}`}
                    >
                      {PHASE_LABELS[scene.scene_phase] || scene.scene_phase}
                    </Badge>
                    {scene.scene_type && (
                      <span className="text-xs text-muted-foreground">{scene.scene_type}</span>
                    )}
                  </div>
                  {scene.narration && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {scene.narration}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{scene.duration_seconds}s</span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <CardContent className="pt-0 space-y-4">
                  <div className="border-t pt-4 space-y-3">
                    {/* Objective */}
                    {scene.objective && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Objetivo</span>
                        <p className="text-sm">{scene.objective}</p>
                      </div>
                    )}

                    {/* Narration */}
                    {scene.narration && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Narracao</span>
                        <p className="text-sm">{scene.narration}</p>
                      </div>
                    )}

                    {/* Visual Description */}
                    {scene.visual_description && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">
                          Descricao Visual
                        </span>
                        <p className="text-sm">{scene.visual_description}</p>
                      </div>
                    )}

                    {/* Image Prompt */}
                    {scene.image_prompt && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" />
                            Image Prompt (Nano Banana)
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => copyToClipboard(scene.image_prompt!, 'Image prompt')}
                          >
                            <Copy className="mr-1 h-3 w-3" />
                            Copiar
                          </Button>
                        </div>
                        <Textarea
                          value={scene.image_prompt}
                          readOnly
                          rows={3}
                          className="font-mono text-xs bg-muted/50"
                        />
                      </div>
                    )}

                    {/* Video Prompt */}
                    {scene.video_prompt && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Film className="h-3 w-3" />
                            Video Prompt (Veo 3)
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => copyToClipboard(scene.video_prompt!, 'Video prompt')}
                          >
                            <Copy className="mr-1 h-3 w-3" />
                            Copiar
                          </Button>
                        </div>
                        <Textarea
                          value={scene.video_prompt}
                          readOnly
                          rows={3}
                          className="font-mono text-xs bg-muted/50"
                        />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant={scene.status === 'approved' ? 'default' : 'outline'}
                        className={scene.status === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}
                        onClick={() => updateSceneStatus(scene.id, 'approved')}
                      >
                        <Check className="mr-1 h-3.5 w-3.5" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant={scene.status === 'rejected' ? 'destructive' : 'outline'}
                        onClick={() => updateSceneStatus(scene.id, 'rejected')}
                      >
                        <X className="mr-1 h-3.5 w-3.5" />
                        Reprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={regeneratingId === scene.id}
                        onClick={() => regenerateScene(scene.id)}
                      >
                        {regeneratingId === scene.id ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="mr-1 h-3.5 w-3.5" />
                        )}
                        Regenerar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
