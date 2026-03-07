import { createClient } from './client'
import type { LeadEvent, LeadEventType } from '@/lib/types'

export async function getLeadEvents(leadId: string, limit = 50, offset = 0) {
  const supabase = createClient()
  const { data, error, count } = await supabase
    .from('lead_events')
    .select('*', { count: 'exact' })
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return { events: data as LeadEvent[], count: count || 0 }
}

export async function createLeadEvent(
  orgId: string,
  leadId: string,
  event: {
    event_type: LeadEventType
    title: string
    description?: string
    metadata?: Record<string, any>
  }
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('lead_events')
    .insert({
      org_id: orgId,
      lead_id: leadId,
      event_type: event.event_type,
      title: event.title,
      description: event.description || null,
      metadata: event.metadata || {},
    })
    .select()
    .single()

  if (error) throw error
  return data as LeadEvent
}

export async function addNote(orgId: string, leadId: string, note: string) {
  return createLeadEvent(orgId, leadId, {
    event_type: 'note',
    title: 'Nota adicionada',
    description: note,
  })
}
