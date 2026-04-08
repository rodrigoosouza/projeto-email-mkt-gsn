// src/app/(dashboard)/lives/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Copy, ExternalLink, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'

export default function LiveDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const [live, setLive] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch(`/api/lives/${id}`)
      .then((r) => r.json())
      .then((d) => setLive(d))
      .finally(() => setLoading(false))
  }, [id])

  async function copyText(label: string, value: string) {
    if (!navigator?.clipboard) return
    await navigator.clipboard.writeText(value)
    toast({ title: `${label} copiado` })
  }

  async function cancelLive() {
    if (!confirm('Cancelar essa live no Zoom e YouTube?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/lives/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Falha ao cancelar')
      toast({ title: 'Live cancelada' })
      router.push('/lives')
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="p-6 text-muted-foreground">Carregando...</div>
  if (!live) return <div className="p-6">Live nao encontrada.</div>

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push('/lives')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button variant="destructive" onClick={cancelLive} disabled={deleting}>
          {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
          Cancelar live
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-2xl">{live.title}</CardTitle>
            <Badge>{live.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Agendada para {new Date(live.scheduled_start).toLocaleString('pt-BR')}
          </p>
        </CardHeader>
        {live.thumbnail_url && (
          <CardContent>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={live.thumbnail_url} alt="thumb" className="w-full rounded border" />
          </CardContent>
        )}
        {live.description && (
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{live.description}</p>
          </CardContent>
        )}
      </Card>

      {live.zoom_meeting_id && (
        <Card>
          <CardHeader><CardTitle>Zoom</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <LinkRow label="Link para participantes" value={live.zoom_join_url} onCopy={copyText} />
            <LinkRow label="Link do host (iniciar)" value={live.zoom_start_url} onCopy={copyText} />
            {live.zoom_password && (
              <div className="text-sm">
                <span className="text-muted-foreground">Senha: </span>
                <code className="rounded bg-muted px-2 py-0.5">{live.zoom_password}</code>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {live.youtube_broadcast_id && (
        <Card>
          <CardHeader><CardTitle>YouTube</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <LinkRow label="Pagina da live" value={live.youtube_watch_url} onCopy={copyText} />
            <div className="text-sm text-muted-foreground">
              Privacidade: <strong>{live.youtube_privacy}</strong>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function LinkRow({
  label, value, onCopy,
}: { label: string; value: string | null; onCopy: (l: string, v: string) => void }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate text-sm">{value}</div>
      </div>
      <Button variant="outline" size="icon" onClick={() => onCopy(label, value)}>
        <Copy className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" asChild>
        <a href={value} target="_blank" rel="noreferrer">
          <ExternalLink className="h-4 w-4" />
        </a>
      </Button>
    </div>
  )
}
