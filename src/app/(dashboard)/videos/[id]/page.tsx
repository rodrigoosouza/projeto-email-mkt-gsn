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
  Play,
  Wand2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
  image_urls: string[] | null
  video_urls: string[] | null
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

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  rejected: 'Reprovada',
  regenerating: 'Regenerando...',
  generating_image: 'Gerando imagem...',
  generating_video: 'Gerando video...',
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <div className="w-3 h-3 rounded-full bg-gray-400" />,
  approved: <Check className="h-4 w-4 text-green-600" />,
  rejected: <X className="h-4 w-4 text-red-600" />,
  regenerating: <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />,
  generating_image: <Loader2 className="h-4 w-4 animate-spin text-blue-600" />,
  generating_video: <Loader2 className="h-4 w-4 animate-spin text-purple-600" />,
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
  const [generatingAssets, setGeneratingAssets] = useState(false)
  const [generatingSceneImage, setGeneratingSceneImage] = useState<string | null>(null)
  const [generatingSceneVideo, setGeneratingSceneVideo] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
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

  // Poll for updates when generating (every 10s)
  useEffect(() => {
    if (!generatingAssets && !generatingSceneImage && !generatingSceneVideo) return
    const interval = setInterval(async () => {
      const supabase = createClient()
      const { data: scns } = await supabase
        .from('video_scenes')
        .select('*')
        .eq('project_id', projectId)
        .order('scene_index', { ascending: true })
      if (scns) setScenes(scns as VideoScene[])
    }, 10000)
    return () => clearInterval(interval)
  }, [generatingAssets, generatingSceneImage, generatingSceneVideo, projectId])

  async function updateSceneStatus(sceneId: string, status: 'approved' | 'rejected') {
    const supabase = createClient()
    const { error } = await supabase.from('video_scenes').update({ status }).eq('id', sceneId)

    if (error) {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' })
      return
    }

    // Use functional update to get fresh state
    setScenes((prev) => {
      const updated = prev.map((s) => (s.id === sceneId ? { ...s, status } : s))

      // Check if all scenes are approved
      if (updated.every((s) => s.status === 'approved')) {
        supabase
          .from('video_projects')
          .update({ status: 'approved' })
          .eq('id', projectId)
          .then(() => {
            setProject((p) => p ? { ...p, status: 'approved' } : null)
            toast({ title: 'Projeto aprovado!', description: 'Todas as cenas foram aprovadas.' })
          })
      }

      return updated
    })

    const label = status === 'approved' ? 'aprovada' : 'reprovada'
    toast({ title: `Cena ${label}` })
  }

  async function approveAll() {
    const supabase = createClient()
    const ids = scenes.filter((s) => s.status !== 'approved').map((s) => s.id)
    if (ids.length === 0) return

    const { error: e1 } = await supabase.from('video_scenes').update({ status: 'approved' }).in('id', ids)
    const { error: e2 } = await supabase.from('video_projects').update({ status: 'approved' }).eq('id', projectId)

    if (e1 || e2) {
      toast({ title: 'Erro ao aprovar', variant: 'destructive' })
      return
    }

    setScenes((prev) => prev.map((s) => ({ ...s, status: 'approved' })))
    setProject((prev) => prev ? { ...prev, status: 'approved' } : null)
    toast({ title: 'Todas as cenas aprovadas!' })
  }

  async function regenerateAllScenes() {
    if (!project?.script_input) return
    setRegeneratingId('all')

    try {
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
      } else {
        const err = await res.json().catch(() => null)
        toast({ title: err?.error || 'Erro ao regenerar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro ao regenerar', variant: 'destructive' })
    } finally {
      setRegeneratingId(null)
    }
  }

  async function generateAllAssets() {
    setGeneratingAssets(true)
    toast({ title: 'Gerando imagens...', description: 'Isso pode levar alguns minutos.' })

    try {
      const res = await fetch('/api/videos/generate-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })

      const data = await res.json().catch(() => null)

      if (res.ok) {
        await fetchData()
        const errors = data?.results?.filter((r: Record<string, unknown>) => r.error)?.length || 0
        toast({
          title: 'Assets gerados!',
          description: errors > 0
            ? `${data.processed} cenas processadas, ${errors} com erro.`
            : `${data.processed} cenas processadas.`,
        })
      } else {
        toast({ title: data?.error || 'Erro ao gerar assets', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro ao gerar assets', variant: 'destructive' })
    } finally {
      setGeneratingAssets(false)
    }
  }

  async function generateSceneImage(sceneId: string, imagePrompt: string) {
    setGeneratingSceneImage(sceneId)
    try {
      const res = await fetch('/api/videos/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId, imagePrompt }),
      })

      const data = await res.json().catch(() => null)

      if (res.ok) {
        await fetchData()
        toast({ title: 'Imagem gerada!' })
      } else {
        toast({ title: data?.error || 'Erro ao gerar imagem', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro ao gerar imagem', variant: 'destructive' })
    } finally {
      setGeneratingSceneImage(null)
    }
  }

  async function generateSceneVideo(sceneId: string, videoPrompt: string) {
    setGeneratingSceneVideo(sceneId)
    toast({ title: 'Gerando video...', description: 'Pode levar 2-5 minutos. Requer billing Google Cloud.' })

    try {
      const res = await fetch('/api/videos/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId, videoPrompt }),
      })

      const data = await res.json().catch(() => null)

      if (res.ok) {
        await fetchData()
        toast({ title: 'Video gerado!' })
      } else {
        toast({ title: data?.error || 'Erro ao gerar video', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro ao gerar video', variant: 'destructive' })
    } finally {
      setGeneratingSceneVideo(null)
    }
  }

  function copyToClipboard(text: string, label: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      toast({ title: `${label} copiado!` })
    } else {
      toast({ title: 'Clipboard nao disponivel', variant: 'destructive' })
    }
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
  const totalImages = scenes.reduce((acc, s) => acc + (Array.isArray(s.image_urls) ? s.image_urls.length : 0), 0)
  const totalVideos = scenes.reduce((acc, s) => acc + (Array.isArray(s.video_urls) ? s.video_urls.length : 0), 0)

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
              {totalImages > 0 && <span>{totalImages} imagens</span>}
              {totalVideos > 0 && <span>{totalVideos} videos</span>}
              {project.angle && <Badge variant="outline">{project.angle}</Badge>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button
            variant="default"
            size="sm"
            onClick={generateAllAssets}
            disabled={generatingAssets || scenes.length === 0}
          >
            {generatingAssets ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            {generatingAssets ? 'Gerando...' : 'Gerar Imagens'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={regenerateAllScenes}
            disabled={regeneratingId === 'all'}
          >
            {regeneratingId === 'all' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Regenerar Cenas
          </Button>
          <Button size="sm" variant="outline" onClick={approveAll} disabled={approvedCount === scenes.length}>
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
          const imageUrls = Array.isArray(scene.image_urls) ? scene.image_urls : []
          const videoUrls = Array.isArray(scene.video_urls) ? scene.video_urls : []
          const hasAssets = imageUrls.length > 0 || videoUrls.length > 0

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
              <button
                type="button"
                className="flex items-center gap-3 p-4 cursor-pointer w-full text-left"
                onClick={() => setExpandedScene(isExpanded ? null : scene.id)}
              >
                <div className="flex-shrink-0">
                  {STATUS_ICONS[scene.status] || STATUS_ICONS.pending}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
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
                    {hasAssets && (
                      <Badge variant="outline" className="text-xs">
                        {imageUrls.length > 0 && `${imageUrls.length} img`}
                        {imageUrls.length > 0 && videoUrls.length > 0 && ' + '}
                        {videoUrls.length > 0 && `${videoUrls.length} vid`}
                      </Badge>
                    )}
                    {(scene.status === 'generating_image' || scene.status === 'generating_video') && (
                      <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                        {STATUS_LABELS[scene.status]}
                      </Badge>
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
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <CardContent className="pt-0 space-y-4">
                  <div className="border-t pt-4 space-y-3">
                    {/* Generated Images */}
                    {imageUrls.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" />
                          Imagens Geradas ({imageUrls.length})
                        </span>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {imageUrls.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block rounded-lg overflow-hidden border hover:border-primary transition-colors"
                            >
                              <img
                                src={url}
                                alt={`Cena ${scene.scene_index} - Imagem ${i + 1}`}
                                className="w-full h-auto object-cover aspect-[9/16]"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Generated Videos */}
                    {videoUrls.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Film className="h-3 w-3" />
                          Videos Gerados ({videoUrls.length})
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {videoUrls.map((url, i) => (
                            <video
                              key={i}
                              src={url}
                              controls
                              className="w-full rounded-lg border aspect-[9/16] bg-black"
                            />
                          ))}
                        </div>
                      </div>
                    )}

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
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              disabled={generatingSceneImage === scene.id}
                              onClick={() => generateSceneImage(scene.id, scene.image_prompt!)}
                            >
                              {generatingSceneImage === scene.id ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <Wand2 className="mr-1 h-3 w-3" />
                              )}
                              Gerar Imagem
                            </Button>
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
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              disabled={generatingSceneVideo === scene.id}
                              onClick={() => generateSceneVideo(scene.id, scene.video_prompt!)}
                            >
                              {generatingSceneVideo === scene.id ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <Play className="mr-1 h-3 w-3" />
                              )}
                              Gerar Video
                            </Button>
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
