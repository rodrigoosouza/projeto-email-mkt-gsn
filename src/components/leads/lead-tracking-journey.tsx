'use client'

import { useMemo, useState } from 'react'
import {
  Globe, Clock, Target, TrendingUp, Building2, Mail,
  ChevronDown, ChevronUp, Loader2, MapPin, Eye,
  MousePointerClick, FileText, ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTrackingJourney } from '@/hooks/tracking'
import { findTrackingOrgBySlug, getAllOrgTables } from '@/lib/tracking/organizations'
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  formatNumber,
} from '@/lib/tracking/utils'
import {
  TEMPERATURE_COLORS,
  TEMPERATURE_LABELS,
  CHANNEL_COLORS,
} from '@/lib/tracking/constants'
import type { TrackingEvent } from '@/lib/tracking/types'

interface LeadTrackingJourneyProps {
  email: string
  phone?: string | null
  orgSlug?: string
}

export function LeadTrackingJourney({ email, phone, orgSlug }: LeadTrackingJourneyProps) {
  const [expandedSessions, setExpandedSessions] = useState<string[]>([])
  const [showAll, setShowAll] = useState(false)

  // Determine which org tables to query
  const orgTablesList = useMemo(() => {
    if (orgSlug) {
      const org = findTrackingOrgBySlug(orgSlug)
      if (org) return [org.tables]
    }
    return getAllOrgTables()
  }, [orgSlug])

  const { lead, events, loading, error } = useTrackingJourney(email, orgTablesList, orgSlug, phone)

  // Group events by session
  const sessionGroups = useMemo(() => {
    const groups: Record<string, TrackingEvent[]> = {}
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

  const visibleSessions = showAll ? sessionGroups : sessionGroups.slice(0, 5)

  const toggleSession = (sid: string) => {
    setExpandedSessions((prev) =>
      prev.includes(sid) ? prev.filter((s) => s !== sid) : [...prev, sid]
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Jornada de Navegacao
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Buscando dados de tracking...</span>
        </CardContent>
      </Card>
    )
  }

  if (error || (!lead && events.length === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Jornada de Navegacao
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            {error || 'Nenhum dado de tracking encontrado para este lead.'}
          </p>
        </CardContent>
      </Card>
    )
  }

  const temp = lead?.lead_temperature || 'frio'

  return (
    <div className="space-y-4">
      {/* Journey Summary */}
      {lead && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Jornada de Navegacao
              {lead.lead_temperature && (
                <Badge
                  variant="secondary"
                  className="ml-auto text-xs"
                  style={{
                    backgroundColor: TEMPERATURE_COLORS[temp] ? `${TEMPERATURE_COLORS[temp]}20` : undefined,
                    color: TEMPERATURE_COLORS[temp] || undefined,
                  }}
                >
                  {TEMPERATURE_LABELS[temp] || temp}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <div className="text-xl font-bold">{formatNumber(lead.total_sessions)}</div>
                <p className="text-xs text-muted-foreground">Sessoes</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <div className="text-xl font-bold">{formatNumber(lead.total_pageviews)}</div>
                <p className="text-xs text-muted-foreground">Pageviews</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <div className="text-xl font-bold">{formatNumber(lead.total_forms_preenchidos)}</div>
                <p className="text-xs text-muted-foreground">Formularios</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <div className="text-xl font-bold">{lead.lead_score ?? 0}</div>
                <p className="text-xs text-muted-foreground">Score</p>
              </div>
            </div>

            {/* Attribution row */}
            <div className="grid md:grid-cols-2 gap-3 mb-4">
              <div className="p-3 border rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-2">First Touch</p>
                <div className="flex flex-wrap gap-1.5">
                  {lead.ft_utm_source && (
                    <Badge variant="outline" className="text-xs" style={{ borderColor: CHANNEL_COLORS[(lead.ft_utm_source).toLowerCase()], color: CHANNEL_COLORS[(lead.ft_utm_source).toLowerCase()] }}>
                      {lead.ft_utm_source}
                    </Badge>
                  )}
                  {lead.ft_utm_medium && <Badge variant="secondary" className="text-xs">{lead.ft_utm_medium}</Badge>}
                  {lead.ft_utm_campaign && <Badge variant="secondary" className="text-xs truncate max-w-[150px]">{lead.ft_utm_campaign}</Badge>}
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-2">Last Touch</p>
                <div className="flex flex-wrap gap-1.5">
                  {lead.utm_source && (
                    <Badge variant="outline" className="text-xs" style={{ borderColor: CHANNEL_COLORS[(lead.utm_source).toLowerCase()], color: CHANNEL_COLORS[(lead.utm_source).toLowerCase()] }}>
                      {lead.utm_source}
                    </Badge>
                  )}
                  {lead.utm_medium && <Badge variant="secondary" className="text-xs">{lead.utm_medium}</Badge>}
                  {lead.utm_campaign && <Badge variant="secondary" className="text-xs truncate max-w-[150px]">{lead.utm_campaign}</Badge>}
                </div>
              </div>
            </div>

            {/* Extra metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Max Scroll</span>
                <p className="font-medium">{lead.max_scroll_depth ?? 0}%</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Tempo Medio</span>
                <p className="font-medium">
                  {lead.avg_time_on_page_segundos ? `${Math.round(lead.avg_time_on_page_segundos)}s` : '\u2014'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Primeiro Contato</span>
                <p className="font-medium">{formatDate(lead.primeiro_contato_at)}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Dias ate Venda</span>
                <p className="font-medium">{lead.dias_primeiro_contato_ate_venda ?? '\u2014'}</p>
              </div>
            </div>

            {/* Deal info if exists */}
            {lead.deal_title && (
              <div className="mt-4 p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{lead.deal_title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={
                        lead.deal_status === 'won' ? 'bg-green-100 text-green-800'
                          : lead.deal_status === 'lost' ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }
                    >
                      {lead.deal_status || 'open'}
                    </Badge>
                    <span className="font-bold text-sm">{formatCurrency(lead.deal_value)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Pages visited */}
            {lead.paginas_visitadas && lead.paginas_visitadas.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Paginas Visitadas ({lead.paginas_unicas_visitadas})
                </p>
                <div className="flex flex-wrap gap-1">
                  {lead.paginas_visitadas.slice(0, 10).map((page, i) => (
                    <Badge key={i} variant="outline" className="text-xs font-mono truncate max-w-[200px]">
                      {page}
                    </Badge>
                  ))}
                  {lead.paginas_visitadas.length > 10 && (
                    <Badge variant="secondary" className="text-xs">
                      +{lead.paginas_visitadas.length - 10} mais
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Session Timeline */}
      {sessionGroups.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Timeline de Sessoes ({sessionGroups.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {visibleSessions.map(([sessionId, sessionEvents]) => {
              const isExpanded = expandedSessions.includes(sessionId)
              const firstEvent = sessionEvents[0]
              const source = firstEvent?.utm_source || firstEvent?.ft_utm_source || 'direct'

              return (
                <div key={sessionId} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSession(sessionId)}
                    className="w-full p-3 flex items-center justify-between hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge
                        variant="outline"
                        className="text-xs flex-shrink-0"
                        style={{
                          borderColor: CHANNEL_COLORS[source.toLowerCase()],
                          color: CHANNEL_COLORS[source.toLowerCase()],
                        }}
                      >
                        {source}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate">
                        {formatDateTime(firstEvent?.created_at)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({sessionEvents.length} eventos)
                      </span>
                      {firstEvent?.landing_page && (
                        <span className="text-xs text-muted-foreground truncate hidden md:inline">
                          {firstEvent.landing_page}
                        </span>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t px-3 py-2 space-y-1 bg-muted/10">
                      {sessionEvents.map((ev) => (
                        <div key={ev.id} className="flex items-start gap-2 py-1 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
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
                            {ev.utm_campaign && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Campaign: {ev.utm_campaign}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {sessionGroups.length > 5 && !showAll && (
              <div className="text-center pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowAll(true)}>
                  Ver todas as {sessionGroups.length} sessoes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
