'use client'

import { useEffect, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Loader2,
  Trash2,
  Pencil,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import {
  getContentPosts,
  createContentPost,
  updateContentPost,
  deleteContentPost,
  bulkCreateContentPosts,
  HYESSER_PILLARS,
  type ContentPost,
  type PillarKey,
} from '@/lib/supabase/content-calendar'

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

const FORMAT_LABELS: Record<string, string> = {
  reels: 'Reels',
  carousel: 'Carrossel',
  static_post: 'Post',
  stories: 'Stories',
  article: 'Artigo',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  generated: 'Gerado',
  approved: 'Aprovado',
  scheduled: 'Agendado',
  published: 'Publicado',
  failed: 'Falha',
}

export default function ContentCalendarPage() {
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()

  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  )
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [editingPost, setEditingPost] = useState<ContentPost | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const [year, month] = currentMonth.split('-').map(Number)
  const monthName = new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  const fetchPosts = async () => {
    if (!currentOrg) return
    setLoading(true)
    try {
      const data = await getContentPosts(currentOrg.id, currentMonth)
      setPosts(data)
    } catch (error) {
      console.error('Erro ao carregar posts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [currentOrg?.id, currentMonth])

  const navigateMonth = (direction: number) => {
    const d = new Date(year, month - 1 + direction, 1)
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const handleGenerate = async () => {
    if (!currentOrg) return
    setGenerating(true)
    try {
      const res = await fetch('/api/content-calendar/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: currentOrg.id,
          month: currentMonth,
          platform: 'instagram',
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Erro na geracao')
      }

      const count = result.count || result.posts?.length || 0
      if (count > 0) {
        toast({ title: `${count} posts gerados com sucesso!` })
        fetchPosts()
      } else {
        toast({ title: 'Nenhum post gerado', description: 'A IA nao retornou posts. Tente novamente.', variant: 'destructive' })
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro ao gerar calendario'
      console.error('[Calendar] Erro na geracao:', error)
      toast({ title: 'Erro', description: msg, variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteContentPost(id)
      toast({ title: 'Post removido' })
      fetchPosts()
    } catch {
      toast({ title: 'Erro ao remover post', variant: 'destructive' })
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateContentPost(id, { status: status as ContentPost['status'] })
      fetchPosts()
    } catch {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' })
    }
  }

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const calendarDays: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) calendarDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d)

  const getPostsForDay = (day: number) => {
    const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`
    return posts.filter((p) => p.scheduled_for?.startsWith(dateStr))
  }

  // Pillar distribution stats
  const pillarCounts = posts.reduce((acc, p) => {
    acc[p.pillar] = (acc[p.pillar] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Calendario de Conteudo</h2>
          <p className="text-muted-foreground">
            Planeje e agende conteudo seguindo o Metodo Hyesser.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Post
          </Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Gerar com IA
          </Button>
        </div>
      </div>

      {/* Pillar Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.entries(HYESSER_PILLARS) as [PillarKey, typeof HYESSER_PILLARS[PillarKey]][]).map(([key, pillar]) => (
          <Card key={key} className="border-l-4" style={{ borderLeftColor: pillar.color }}>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{pillar.label}</span>
                <Badge variant="secondary">{pillarCounts[key] || 0}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {pillar.percentage}% — {pillar.postsPerWeek}/semana
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigateMonth(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold capitalize">{monthName}</h3>
        <Button variant="ghost" onClick={() => navigateMonth(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-7">
            {/* Day headers */}
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground border-b">
                {day}
              </div>
            ))}

            {/* Calendar cells */}
            {calendarDays.map((day, i) => {
              const dayPosts = day ? getPostsForDay(day) : []
              const isToday = day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear()

              return (
                <div
                  key={i}
                  className={`min-h-[100px] border-b border-r p-1 ${
                    day ? 'bg-background' : 'bg-muted/30'
                  } ${isToday ? 'ring-2 ring-primary ring-inset' : ''}`}
                >
                  {day && (
                    <>
                      <span className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                        {day}
                      </span>
                      <div className="mt-1 space-y-1">
                        {dayPosts.map((post) => {
                          const pillarConfig = HYESSER_PILLARS[post.pillar as PillarKey]
                          return (
                            <div
                              key={post.id}
                              className="rounded px-1.5 py-0.5 text-[10px] cursor-pointer hover:opacity-80 transition-opacity truncate"
                              style={{
                                backgroundColor: `${pillarConfig?.color || '#6b7280'}20`,
                                borderLeft: `3px solid ${pillarConfig?.color || '#6b7280'}`,
                              }}
                              onClick={() => setEditingPost(post)}
                              title={post.title}
                            >
                              {post.title}
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Post List (below calendar) */}
      {posts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Posts do Mes ({posts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {posts.map((post) => {
                const pillarConfig = HYESSER_PILLARS[post.pillar as PillarKey]
                return (
                  <div
                    key={post.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                    onClick={() => setEditingPost(post)}
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: pillarConfig?.color || '#6b7280' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{post.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {pillarConfig?.label} &middot; {FORMAT_LABELS[post.format] || post.format}
                        {post.scheduled_for && ` &middot; ${new Date(post.scheduled_for).toLocaleDateString('pt-BR')}`}
                      </p>
                    </div>
                    <Select
                      value={post.status}
                      onValueChange={(v) => handleStatusChange(post.id, v)}
                    >
                      <SelectTrigger className="w-[120px] h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Rascunho</SelectItem>
                        <SelectItem value="generated">Gerado</SelectItem>
                        <SelectItem value="approved">Aprovado</SelectItem>
                        <SelectItem value="scheduled">Agendado</SelectItem>
                        <SelectItem value="published">Publicado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); handleDelete(post.id) }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit/View Post Dialog */}
      <Dialog open={!!editingPost} onOpenChange={(open) => !open && setEditingPost(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {editingPost && (
            <>
              <DialogHeader>
                <DialogTitle>{editingPost.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Badge style={{
                    backgroundColor: `${HYESSER_PILLARS[editingPost.pillar as PillarKey]?.color}20`,
                    color: HYESSER_PILLARS[editingPost.pillar as PillarKey]?.color,
                  }}>
                    {HYESSER_PILLARS[editingPost.pillar as PillarKey]?.label}
                  </Badge>
                  <Badge variant="outline">{FORMAT_LABELS[editingPost.format]}</Badge>
                  <Badge variant="secondary">{STATUS_LABELS[editingPost.status]}</Badge>
                </div>
                {editingPost.caption && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Copy</Label>
                    <p className="text-sm whitespace-pre-wrap mt-1">{editingPost.caption}</p>
                  </div>
                )}
                {editingPost.hashtags && editingPost.hashtags.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Hashtags</Label>
                    <p className="text-sm mt-1">{editingPost.hashtags.map((h) => `#${h}`).join(' ')}</p>
                  </div>
                )}
                {editingPost.image_prompt && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Prompt de Imagem</Label>
                    <p className="text-sm mt-1 text-muted-foreground italic">{editingPost.image_prompt}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Post Dialog */}
      <CreatePostDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={fetchPosts}
      />
    </div>
  )
}

function CreatePostDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    pillar: 'growth' as PillarKey,
    content_type: 'tip',
    format: 'static_post' as ContentPost['format'],
    caption: '',
    scheduled_for: '',
  })

  const handleCreate = async () => {
    if (!currentOrg || !form.title.trim()) return
    setSaving(true)
    try {
      await createContentPost(currentOrg.id, {
        ...form,
        scheduled_for: form.scheduled_for ? new Date(form.scheduled_for).toISOString() : undefined,
      } as Partial<ContentPost>)
      toast({ title: 'Post criado com sucesso' })
      onOpenChange(false)
      setForm({ title: '', pillar: 'growth', content_type: 'tip', format: 'static_post', caption: '', scheduled_for: '' })
      onCreated()
    } catch {
      toast({ title: 'Erro ao criar post', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Titulo</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Titulo do post"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pilar</Label>
              <Select value={form.pillar} onValueChange={(v) => setForm({ ...form, pillar: v as PillarKey })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(HYESSER_PILLARS) as [PillarKey, typeof HYESSER_PILLARS[PillarKey]][]).map(([key, p]) => (
                    <SelectItem key={key} value={key}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Formato</Label>
              <Select value={form.format} onValueChange={(v) => setForm({ ...form, format: v as ContentPost['format'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="reels">Reels</SelectItem>
                  <SelectItem value="carousel">Carrossel</SelectItem>
                  <SelectItem value="static_post">Post Estatico</SelectItem>
                  <SelectItem value="stories">Stories</SelectItem>
                  <SelectItem value="article">Artigo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Data/Hora</Label>
            <Input
              type="datetime-local"
              value={form.scheduled_for}
              onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Copy</Label>
            <Textarea
              value={form.caption}
              onChange={(e) => setForm({ ...form, caption: e.target.value })}
              placeholder="Copy do post com hashtags..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={saving || !form.title.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
