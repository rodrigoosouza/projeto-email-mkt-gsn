'use client'

import { useState } from 'react'
import { Clock, Globe, Eye, FileText, MousePointer, ChevronDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { TrackingEvent, LeadJourney } from '@/lib/tracking/types'
import { PAGE_VIEW_EVENTS } from '@/lib/tracking/constants'

interface SessionTimelineProps {
  events: TrackingEvent[]
  lead?: LeadJourney
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  page_view: <Eye className="w-3.5 h-3.5" />,
  custom_page_view: <Eye className="w-3.5 h-3.5" />,
  generate_lead: <FileText className="w-3.5 h-3.5" />,
  form_submit: <FileText className="w-3.5 h-3.5" />,
  click: <MousePointer className="w-3.5 h-3.5" />,
}

const EVENT_COLORS: Record<string, string> = {
  page_view: '#3B82F6',
  custom_page_view: '#3B82F6',
  generate_lead: '#10B981',
  form_submit: '#10B981',
  click: '#8B5CF6',
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '\u2014'
  const d = new Date(dateStr)
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function TimelineEventItem({ event }: { event: TrackingEvent }) {
  const color = EVENT_COLORS[event.event_name] || '#6b7280'
  const icon = EVENT_ICONS[event.event_name] || <Clock className="w-3.5 h-3.5" />

  return (
    <div className="flex gap-3 group">
      <div className="flex flex-col items-center">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
        <div className="w-px flex-1 bg-border group-last:bg-transparent" />
      </div>
      <div className="pb-5 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-foreground">
            {event.event_name}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatDateTime(event.created_at)}
          </span>
        </div>
        {event.page_path && (
          <p className="text-xs text-muted-foreground truncate">
            {event.page_path}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {event.utm_source && (
            <span className="text-[10px] text-blue-600">
              src: {event.utm_source}
            </span>
          )}
          {event.utm_campaign && (
            <span className="text-[10px] text-purple-600">
              camp: {event.utm_campaign}
            </span>
          )}
          {event.scroll_depth && (
            <span className="text-[10px] text-muted-foreground">
              scroll: {event.scroll_depth}%
            </span>
          )}
          {event.time_on_page && (
            <span className="text-[10px] text-muted-foreground">
              tempo: {event.time_on_page}s
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function SessionGroup({
  sessionId,
  events,
}: {
  sessionId: string
  events: TrackingEvent[]
}) {
  const [expanded, setExpanded] = useState(false)
  const first = events[0]
  const last = events[events.length - 1]

  const durationSec =
    first && last
      ? Math.round(
          (new Date(last.created_at).getTime() -
            new Date(first.created_at).getTime()) /
            1000
        )
      : 0
  const durationMin = Math.floor(durationSec / 60)
  const durationLabel =
    durationMin > 0 ? `${durationMin}min ${durationSec % 60}s` : `${durationSec}s`

  const pageViews = events.filter((e) =>
    PAGE_VIEW_EVENTS.includes(e.event_name)
  ).length
  const hasLead = events.some(
    (e) => e.event_name === 'generate_lead' || e.event_name === 'form_submit'
  )

  return (
    <div className="mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 bg-muted/50 border rounded-lg hover:bg-muted transition-colors text-left group"
      >
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            hasLead
              ? 'bg-green-50 text-green-600'
              : 'bg-blue-50 text-blue-600'
          }`}
        >
          <Globe className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground">
              Sessao {sessionId.slice(0, 8)}...
            </span>
            {hasLead && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-green-50 text-green-700 border-green-200">
                LEAD
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[10px] text-muted-foreground">
              {formatDateTime(first?.created_at ?? null)}
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {durationLabel}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {pageViews} pag. | {events.length} eventos
            </span>
            {first?.utm_source && (
              <span className="text-[10px] text-blue-600">
                {first.utm_source}
              </span>
            )}
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {expanded && (
        <div className="ml-4 mt-2 pl-4 border-l">
          {events.map((event) => (
            <TimelineEventItem key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function SessionTimeline({ events }: SessionTimelineProps) {
  // Group events by session_id
  const sessionGroups = events.reduce<Record<string, TrackingEvent[]>>(
    (acc, event) => {
      const sid = event.session_id || 'unknown'
      if (!acc[sid]) acc[sid] = []
      acc[sid].push(event)
      return acc
    },
    {}
  )

  const sortedSessionIds = Object.keys(sessionGroups).sort((a, b) => {
    const aFirst = sessionGroups[a][0]?.created_at || ''
    const bFirst = sessionGroups[b][0]?.created_at || ''
    return bFirst.localeCompare(aFirst)
  })

  if (!events.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhum evento encontrado</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {sortedSessionIds.map((sessionId) => (
        <SessionGroup
          key={sessionId}
          sessionId={sessionId}
          events={sessionGroups[sessionId]}
        />
      ))}
    </div>
  )
}
