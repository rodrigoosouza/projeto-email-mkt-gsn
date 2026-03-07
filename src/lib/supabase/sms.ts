import { createClient } from './client'
import type { SmsMessage, SmsBroadcast } from '@/lib/types'

export async function getSmsMessages(
  orgId: string,
  options: { page?: number; pageSize?: number; leadId?: string } = {}
) {
  const { page = 1, pageSize = 25, leadId } = options
  const supabase = createClient()

  let query = supabase
    .from('sms_messages')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (leadId) {
    query = query.eq('lead_id', leadId)
  }

  const from = (page - 1) * pageSize
  query = query.range(from, from + pageSize - 1)

  const { data, error, count } = await query
  if (error) throw error

  return {
    messages: (data || []) as SmsMessage[],
    total: count || 0,
    page,
    pageSize,
  }
}

export async function createSmsMessage(
  orgId: string,
  message: {
    lead_id?: string
    phone_number: string
    direction: 'inbound' | 'outbound'
    body: string
    status?: string
    provider_message_id?: string
  }
): Promise<SmsMessage> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sms_messages')
    .insert({
      org_id: orgId,
      lead_id: message.lead_id || null,
      phone_number: message.phone_number,
      direction: message.direction,
      body: message.body,
      status: message.status || 'queued',
      provider_message_id: message.provider_message_id || null,
    })
    .select()
    .single()

  if (error) throw error
  return data as SmsMessage
}

export async function updateSmsMessageStatus(
  messageId: string,
  status: string,
  errorMessage?: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('sms_messages')
    .update({
      status,
      error_message: errorMessage || null,
    })
    .eq('id', messageId)

  if (error) throw error
}

export async function getSmsBroadcasts(
  orgId: string,
  options: { page?: number; pageSize?: number } = {}
) {
  const { page = 1, pageSize = 25 } = options
  const supabase = createClient()

  const from = (page - 1) * pageSize
  const { data, error, count } = await supabase
    .from('sms_broadcasts')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1)

  if (error) throw error

  return {
    broadcasts: (data || []) as SmsBroadcast[],
    total: count || 0,
    page,
    pageSize,
  }
}

export async function getSmsBroadcast(id: string): Promise<SmsBroadcast> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sms_broadcasts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as SmsBroadcast
}

export async function createSmsBroadcast(
  orgId: string,
  userId: string,
  broadcast: {
    name: string
    body: string
    segment_id?: string
  }
): Promise<SmsBroadcast> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sms_broadcasts')
    .insert({
      org_id: orgId,
      name: broadcast.name,
      body: broadcast.body,
      segment_id: broadcast.segment_id || null,
      created_by: userId,
    })
    .select()
    .single()

  if (error) throw error
  return data as SmsBroadcast
}

export async function updateSmsBroadcast(
  id: string,
  updates: Partial<Pick<SmsBroadcast, 'name' | 'body' | 'segment_id' | 'status' | 'total_recipients' | 'total_sent' | 'total_delivered' | 'total_failed' | 'sent_at'>>
): Promise<SmsBroadcast> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sms_broadcasts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as SmsBroadcast
}

export async function deleteSmsBroadcast(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('sms_broadcasts').delete().eq('id', id)
  if (error) throw error
}
