'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Mail, MailOpen, MousePointerClick, AlertTriangle, Ban,
  UserPlus, Tag, Layers, TrendingUp, FileText, MessageSquare,
  Activity, Pencil, Plus,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { getLeadEvents, addNote } from '@/lib/supabase/lead-events'
import type { LeadEvent, LeadEventType } from '@/lib/types'

const EVENT_ICONS: Record<LeadEventType, React.ComponentType<{ className?: string }>> = {
  created: UserPlus,
  updated: Pencil,
  tag_added: Tag,
  tag_removed: Tag,
  email_sent: Mail,
  email_delivered: Mail,
  email_opened: MailOpen,
  email_clicked: MousePointerClick,
  email_bounced: AlertTriangle,
  email_complained: Ban,
  segment_added: Layers,
  segment_removed: Layers,
  score_changed: TrendingUp,
  status_changed: Activity,
  campaign_added: FileText,
  note: MessageSquare,
  custom: Activity,
}

const EVENT_COLORS: Record<LeadEventType, string> = {
  created: 'text-green-600 bg-green-100',
  updated: 'text-blue-600 bg-blue-100',
  tag_added: 'text-purple-600 bg-purple-100',
  tag_removed: 'text-purple-600 bg-purple-100',
  email_sent: 'text-blue-600 bg-blue-100',
  email_delivered: 'text-green-600 bg-green-100',
  email_opened: 'text-emerald-600 bg-emerald-100',
  email_clicked: 'text-indigo-600 bg-indigo-100',
  email_bounced: 'text-orange-600 bg-orange-100',
  email_complained: 'text-red-600 bg-red-100',
  segment_added: 'text-cyan-600 bg-cyan-100',
  segment_removed: 'text-cyan-600 bg-cyan-100',
  score_changed: 'text-amber-600 bg-amber-100',
  status_changed: 'text-gray-600 bg-gray-100',
  campaign_added: 'text-pink-600 bg-pink-100',
  note: 'text-yellow-600 bg-yellow-100',
  custom: 'text-gray-600 bg-gray-100',
}

interface LeadTimelineProps {
  leadId: string
  orgId: string
}

export function LeadTimeline({ leadId, orgId }: LeadTimelineProps) {
  const { toast } = useToast()
  const [events, setEvents] = useState<LeadEvent[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const PAGE_SIZE = 20

  useEffect(() => {
    loadEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId])

  const loadEvents = async () => {
    try {
      setLoading(true)
      const { events: data, count } = await getLeadEvents(leadId, PAGE_SIZE, 0)
      setEvents(data)
      setTotal(count)
    } catch (error) {
      console.error('Erro ao carregar eventos:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const { events: data } = await getLeadEvents(leadId, PAGE_SIZE, events.length)
      setEvents((prev) => [...prev, ...data])
    } catch (error) {
      console.error('Erro ao carregar mais eventos:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  const handleAddNote = async () => {
    if (!noteText.trim()) return
    setAddingNote(true)
    try {
      const event = await addNote(orgId, leadId, noteText.trim())
      setEvents((prev) => [event, ...prev])
      setTotal((prev) => prev + 1)
      setNoteText('')
      toast({ title: 'Nota adicionada' })
    } catch (error) {
      console.error('Erro ao adicionar nota:', error)
      toast({ title: 'Erro', description: 'Nao foi possivel adicionar a nota.', variant: 'destructive' })
    } finally {
      setAddingNote(false)
    }
  }

  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr)
    if (isToday(date)) return 'Hoje'
    if (isYesterday(date)) return 'Ontem'
    return format(date, "dd 'de' MMMM", { locale: ptBR })
  }

  // Group events by date
  const groupedEvents: { date: string; events: LeadEvent[] }[] = []
  events.forEach((event) => {
    const dateLabel = formatEventDate(event.created_at)
    const existing = groupedEvents.find((g) => g.date === dateLabel)
    if (existing) {
      existing.events.push(event)
    } else {
      groupedEvents.push({ date: dateLabel, events: [event] })
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add note */}
        <div className="flex gap-2">
          <Input
            placeholder="Adicionar uma nota..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote() }}
            disabled={addingNote}
          />
          <Button size="sm" onClick={handleAddNote} disabled={!noteText.trim() || addingNote}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground text-center py-8">Carregando timeline...</div>
        ) : events.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">Nenhum evento registrado.</div>
        ) : (
          <div className="space-y-6">
            {groupedEvents.map((group) => (
              <div key={group.date}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {group.date}
                </p>
                <div className="space-y-0 relative">
                  {/* Vertical line */}
                  <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border" />

                  {group.events.map((event) => {
                    const Icon = EVENT_ICONS[event.event_type] || Activity
                    const colorClass = EVENT_COLORS[event.event_type] || 'text-gray-600 bg-gray-100'

                    return (
                      <div key={event.id} className="flex gap-3 pb-4 relative">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass} z-10`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className="text-sm font-medium">{event.title}</p>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-0.5">{event.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {events.length < total && (
              <div className="text-center pt-2">
                <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? 'Carregando...' : `Carregar mais (${total - events.length} restantes)`}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
