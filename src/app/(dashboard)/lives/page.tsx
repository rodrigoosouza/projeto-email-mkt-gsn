// src/app/(dashboard)/lives/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Radio, Calendar, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useOrganizationContext } from '@/contexts/organization-context'

interface LiveRow {
  id: string
  title: string
  description: string | null
  scheduled_start: string
  status: string
  thumbnail_url: string | null
  zoom_join_url: string | null
  youtube_watch_url: string | null
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendada',
  live: 'Ao vivo',
  ended: 'Encerrada',
  cancelled: 'Cancelada',
  failed: 'Falhou',
}
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-blue-100 text-blue-800',
  live: 'bg-red-100 text-red-800',
  ended: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  failed: 'bg-red-100 text-red-800',
}

export default function LivesPage() {
  const { currentOrg } = useOrganizationContext()
  const [lives, setLives] = useState<LiveRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentOrg?.id) return
    fetch(`/api/lives?orgId=${currentOrg.id}`)
      .then((r) => r.json())
      .then((d) => setLives(d.lives ?? []))
      .finally(() => setLoading(false))
  }, [currentOrg?.id])

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Radio className="h-8 w-8 text-primary" />
            Lives
          </h1>
          <p className="text-muted-foreground">
            Crie transmissoes Zoom + YouTube em um unico lugar.
          </p>
        </div>
        <Button asChild>
          <Link href="/lives/new">
            <Plus className="mr-2 h-4 w-4" />
            Nova Live
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : lives.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Radio className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold">Nenhuma live ainda</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie sua primeira live e publique no Zoom e YouTube de uma vez so.
            </p>
            <Button asChild>
              <Link href="/lives/new">
                <Plus className="mr-2 h-4 w-4" />
                Criar Live
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lives.map((live) => (
            <Card key={live.id} className="overflow-hidden">
              {live.thumbnail_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={live.thumbnail_url}
                  alt={live.title}
                  className="h-40 w-full object-cover"
                />
              )}
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-2">{live.title}</CardTitle>
                  <Badge className={STATUS_COLORS[live.status]}>
                    {STATUS_LABELS[live.status] ?? live.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {new Date(live.scheduled_start).toLocaleString('pt-BR')}
                </div>
                <div className="flex gap-2 pt-2">
                  {live.zoom_join_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={live.zoom_join_url} target="_blank" rel="noreferrer">
                        Zoom <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </Button>
                  )}
                  {live.youtube_watch_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={live.youtube_watch_url} target="_blank" rel="noreferrer">
                        YouTube <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" asChild className="ml-auto">
                    <Link href={`/lives/${live.id}`}>Detalhes</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
