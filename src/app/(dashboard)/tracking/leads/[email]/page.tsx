'use client'

import { useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Mail, Phone, Building2, MapPin, Clock, Target, TrendingUp, Globe } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTrackingJourney } from '@/hooks/tracking'
import { getAllOrgTables } from '@/lib/tracking/organizations'
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  formatNumber,
  getFullName,
} from '@/lib/tracking/utils'
import {
  TEMPERATURE_COLORS,
  TEMPERATURE_LABELS,
  CHANNEL_COLORS,
} from '@/lib/tracking/constants'

export default function TrackingLeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const email = params.email as string

  const orgTablesList = useMemo(() => getAllOrgTables(), [])
  const { lead, events, loading, error } = useTrackingJourney(email, orgTablesList, undefined)

  // Group events by session
  const sessionGroups = useMemo(() => {
    const groups: Record<string, typeof events> = {}
    events.forEach((ev) => {
      const sid = ev.session_id || 'unknown'
      if (!groups[sid]) groups[sid] = []
      groups[sid].push(ev)
    })
    return Object.entries(groups).sort(([, a], [, b]) => {
      const aTime = a[0]?.created_at || ''
      const bTime = b[0]?.created_at || ''
      return bTime.localeCompare(aTime)
    })
  }, [events])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/tracking/leads')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div className="text-center py-12">
          <p className="text-muted-foreground">{error || 'Lead nao encontrado.'}</p>
        </div>
      </div>
    )
  }

  const name = getFullName(lead.first_name, lead.last_name)
  const temp = lead.lead_temperature || 'frio'
  const channelSource = lead.utm_source || 'direct'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/tracking/leads')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">{name}</h2>
          <p className="text-muted-foreground">{decodeURIComponent(email)}</p>
        </div>
        <Badge
          variant="secondary"
          className="text-sm"
          style={{
            backgroundColor: TEMPERATURE_COLORS[temp]
              ? `${TEMPERATURE_COLORS[temp]}20`
              : undefined,
            color: TEMPERATURE_COLORS[temp] || undefined,
          }}
        >
          {TEMPERATURE_LABELS[temp] || temp}
        </Badge>
      </div>

      {/* 4-col Info Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Contact Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Email:</span>{' '}
              <span>{lead.email || '\u2014'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Telefone:</span>{' '}
              <span>{lead.phone || '\u2014'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Nome:</span>{' '}
              <span>{name}</span>
            </div>
          </CardContent>
        </Card>

        {/* Company Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Empresa:</span>{' '}
              <span>{lead.company_name || '\u2014'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Responsavel:</span>{' '}
              <span>{lead.owner_name || '\u2014'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Localizacao:</span>{' '}
              <span>
                {[lead.geo_city, lead.geo_state, lead.geo_country]
                  .filter(Boolean)
                  .join(', ') || '\u2014'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Deal Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              Negocio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Titulo:</span>{' '}
              <span>{lead.deal_title || '\u2014'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>{' '}
              <Badge
                variant="secondary"
                className={
                  lead.deal_status === 'won'
                    ? 'bg-green-100 text-green-800'
                    : lead.deal_status === 'lost'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                }
              >
                {lead.deal_status || 'open'}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Valor:</span>{' '}
              <span className="font-semibold">{formatCurrency(lead.deal_value)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Criado em:</span>{' '}
              <span>{formatDate(lead.deal_created_at)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Scoring Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Scoring
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Score:</span>{' '}
              <span className="font-semibold">{lead.lead_score ?? 0}</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min((lead.lead_score || 0), 100)}%`,
                  backgroundColor: TEMPERATURE_COLORS[temp] || '#4d85ff',
                }}
              />
            </div>
            <div>
              <span className="text-muted-foreground">Temperatura:</span>{' '}
              <span>{TEMPERATURE_LABELS[temp] || temp}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Canais distintos:</span>{' '}
              <span>{lead.canais_distintos}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attribution Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Touch Attribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Source:</span>
              <Badge variant="outline" style={{ borderColor: CHANNEL_COLORS[channelSource.toLowerCase()], color: CHANNEL_COLORS[channelSource.toLowerCase()] }}>
                {channelSource}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Medium:</span>
              <span>{lead.utm_medium || '\u2014'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Campaign:</span>
              <span className="truncate max-w-[200px]">{lead.utm_campaign || '\u2014'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Content:</span>
              <span className="truncate max-w-[200px]">{lead.utm_content || '\u2014'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Term:</span>
              <span className="truncate max-w-[200px]">{lead.utm_term || '\u2014'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">First Touch Attribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Source:</span>
              <Badge variant="outline" style={{ borderColor: CHANNEL_COLORS[(lead.ft_utm_source || 'direct').toLowerCase()], color: CHANNEL_COLORS[(lead.ft_utm_source || 'direct').toLowerCase()] }}>
                {lead.ft_utm_source || 'direct'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Medium:</span>
              <span>{lead.ft_utm_medium || '\u2014'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Campaign:</span>
              <span className="truncate max-w-[200px]">{lead.ft_utm_campaign || '\u2014'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Content:</span>
              <span className="truncate max-w-[200px]">{lead.ft_utm_content || '\u2014'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Term:</span>
              <span className="truncate max-w-[200px]">{lead.ft_utm_term || '\u2014'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Behavior Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{formatNumber(lead.total_sessions)}</div>
            <p className="text-xs text-muted-foreground">Sessoes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{formatNumber(lead.total_pageviews)}</div>
            <p className="text-xs text-muted-foreground">Pageviews</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{formatNumber(lead.paginas_unicas_visitadas)}</div>
            <p className="text-xs text-muted-foreground">Paginas Unicas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{formatNumber(lead.total_forms_preenchidos)}</div>
            <p className="text-xs text-muted-foreground">Formularios Preenchidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{lead.max_scroll_depth ?? 0}%</div>
            <p className="text-xs text-muted-foreground">Max Scroll Depth</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {lead.avg_time_on_page_segundos
                ? `${Math.round(lead.avg_time_on_page_segundos)}s`
                : '\u2014'}
            </div>
            <p className="text-xs text-muted-foreground">Tempo Medio na Pagina</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {lead.dias_primeiro_contato_ate_venda ?? '\u2014'}
            </div>
            <p className="text-xs text-muted-foreground">Dias ate Venda</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{formatNumber(lead.total_heartbeats)}</div>
            <p className="text-xs text-muted-foreground">Heartbeats</p>
          </CardContent>
        </Card>
      </div>

      {/* Session Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline de Sessoes</CardTitle>
        </CardHeader>
        <CardContent>
          {sessionGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum evento encontrado.
            </p>
          ) : (
            <div className="space-y-6">
              {sessionGroups.map(([sessionId, sessionEvents]) => (
                <div key={sessionId} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      Sessao: {sessionId.substring(0, 12)}...
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({sessionEvents.length} eventos)
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatDateTime(sessionEvents[0]?.created_at)}
                    </span>
                  </div>
                  <div className="space-y-1 ml-4 border-l-2 border-muted pl-4">
                    {sessionEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-start gap-3 text-sm py-1"
                      >
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 -ml-[21px]" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {ev.event_name}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(ev.created_at)}
                            </span>
                          </div>
                          {ev.page_path && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {ev.page_path}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
