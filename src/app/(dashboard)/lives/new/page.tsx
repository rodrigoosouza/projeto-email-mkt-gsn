// src/app/(dashboard)/lives/new/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Radio, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { createClient } from '@/lib/supabase/client'

export default function NewLivePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { currentOrg } = useOrganizationContext()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledStart, setScheduledStart] = useState('')
  const [duration, setDuration] = useState(60)
  const [youtubePrivacy, setYoutubePrivacy] = useState<'public' | 'unlisted' | 'private'>('unlisted')
  const [zoomEnabled, setZoomEnabled] = useState(true)
  const [youtubeEnabled, setYoutubeEnabled] = useState(true)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<string>('')

  async function uploadThumbnail(): Promise<string | undefined> {
    if (!thumbnailFile || !currentOrg?.id) return undefined
    const supabase = createClient()
    const path = `${currentOrg.id}/${Date.now()}-${thumbnailFile.name}`
    const { error } = await supabase.storage
      .from('live-thumbnails')
      .upload(path, thumbnailFile, { cacheControl: '3600', upsert: false })
    if (error) throw new Error(error.message)
    const { data } = supabase.storage.from('live-thumbnails').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentOrg?.id) return

    setSubmitting(true)
    try {
      setStep('Subindo thumbnail...')
      const thumbUrl = await uploadThumbnail()

      setStep('Criando Zoom + YouTube...')
      const isoStart = new Date(scheduledStart).toISOString()

      const res = await fetch('/api/lives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: currentOrg.id,
          title,
          description,
          scheduledStart: isoStart,
          durationMinutes: duration,
          youtubePrivacy,
          zoomEnabled,
          youtubeEnabled,
          thumbnailUrl: thumbUrl,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')

      toast({ title: 'Live criada!', description: 'Zoom e YouTube agendados com sucesso.' })
      router.push(`/lives/${data.id}`)
    } catch (err: any) {
      toast({
        title: 'Erro ao criar live',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
      setStep('')
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Radio className="h-8 w-8 text-primary" />
          Nova Live
        </h1>
        <p className="text-muted-foreground">
          Preencha uma vez e publicamos no Zoom + YouTube automaticamente.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informacoes da live</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titulo *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Workshop: Trafego pago para advogados"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descricao</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="O que sera abordado, link da comunidade, CTA..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start">Inicio *</Label>
                <Input
                  id="start"
                  type="datetime-local"
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duracao (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={5}
                  max={720}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="thumb">Thumbnail (1280x720 JPG/PNG)</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="thumb"
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null
                    setThumbnailFile(f)
                    if (f) setThumbnailUrl(URL.createObjectURL(f))
                  }}
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
              {thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbnailUrl} alt="preview" className="mt-2 max-h-48 rounded border" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Destinos</CardTitle>
            <CardDescription>Onde essa live vai acontecer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Criar reuniao no Zoom</Label>
                <p className="text-xs text-muted-foreground">Webinar agendado</p>
              </div>
              <Switch checked={zoomEnabled} onCheckedChange={setZoomEnabled} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Transmitir no YouTube</Label>
                <p className="text-xs text-muted-foreground">Cria broadcast e vincula RTMP do Zoom</p>
              </div>
              <Switch checked={youtubeEnabled} onCheckedChange={setYoutubeEnabled} />
            </div>
            {youtubeEnabled && (
              <div className="space-y-2">
                <Label>Privacidade no YouTube</Label>
                <Select
                  value={youtubePrivacy}
                  onValueChange={(v: any) => setYoutubePrivacy(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Publica</SelectItem>
                    <SelectItem value="unlisted">Nao listada</SelectItem>
                    <SelectItem value="private">Privada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting || !title || !scheduledStart}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {step || 'Criando...'}
              </>
            ) : (
              'Criar Live'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
