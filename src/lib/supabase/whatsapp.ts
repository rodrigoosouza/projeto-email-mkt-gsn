import { createClient } from './client'
import type {
  WhatsAppTemplate,
  WhatsAppConversation,
  WhatsAppMessage,
  WhatsAppBroadcast,
} from '@/lib/types'

// ============= CONVERSATIONS =============

export async function getConversations(orgId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('org_id', orgId)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (error) throw error
  return (data || []) as WhatsAppConversation[]
}

export async function getConversation(conversationId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('id', conversationId)
    .single()

  if (error) throw error
  return data as WhatsAppConversation
}

export async function updateConversation(
  conversationId: string,
  updates: Partial<Pick<WhatsAppConversation, 'status' | 'assigned_to' | 'unread_count'>>
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .update(updates)
    .eq('id', conversationId)
    .select()
    .single()

  if (error) throw error
  return data as WhatsAppConversation
}

// ============= MESSAGES =============

export async function getMessages(
  conversationId: string,
  limit = 50,
  offset = 0
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return (data || []) as WhatsAppMessage[]
}

export async function sendMessage(
  conversationId: string,
  orgId: string,
  message: {
    message_type: WhatsAppMessage['message_type']
    content: Record<string, any>
    wa_message_id?: string
  }
) {
  const supabase = createClient()

  // Insert outbound message
  const { data: msg, error: msgError } = await supabase
    .from('whatsapp_messages')
    .insert({
      conversation_id: conversationId,
      org_id: orgId,
      direction: 'outbound',
      message_type: message.message_type,
      content: message.content,
      wa_message_id: message.wa_message_id || null,
      status: 'sent',
    })
    .select()
    .single()

  if (msgError) throw msgError

  // Update conversation last_message_at
  await supabase
    .from('whatsapp_conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)

  return msg as WhatsAppMessage
}

export async function receiveMessage(
  orgId: string,
  phone: string,
  contactName: string | null,
  message: {
    message_type: WhatsAppMessage['message_type']
    content: Record<string, any>
    wa_message_id?: string
  }
) {
  const supabase = createClient()

  // Find or create conversation
  let { data: conversation } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('org_id', orgId)
    .eq('phone_number', phone)
    .eq('status', 'open')
    .single()

  if (!conversation) {
    // Try to find lead by phone
    const { data: lead } = await supabase
      .from('leads')
      .select('id, first_name, last_name')
      .eq('org_id', orgId)
      .eq('phone', phone)
      .single()

    const { data: newConv, error: convError } = await supabase
      .from('whatsapp_conversations')
      .insert({
        org_id: orgId,
        lead_id: lead?.id || null,
        phone_number: phone,
        contact_name: contactName || (lead ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim() : null),
        status: 'open',
        last_message_at: new Date().toISOString(),
        unread_count: 1,
      })
      .select()
      .single()

    if (convError) throw convError
    conversation = newConv
  } else {
    // Update existing conversation
    await supabase
      .from('whatsapp_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        unread_count: (conversation.unread_count || 0) + 1,
        status: 'open',
      })
      .eq('id', conversation.id)
  }

  // Insert inbound message
  const { data: msg, error: msgError } = await supabase
    .from('whatsapp_messages')
    .insert({
      conversation_id: conversation!.id,
      org_id: orgId,
      direction: 'inbound',
      message_type: message.message_type,
      content: message.content,
      wa_message_id: message.wa_message_id || null,
      status: 'received',
    })
    .select()
    .single()

  if (msgError) throw msgError
  return { conversation: conversation as WhatsAppConversation, message: msg as WhatsAppMessage }
}

// ============= TEMPLATES =============

export async function getWhatsAppTemplates(orgId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('whatsapp_templates')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as WhatsAppTemplate[]
}

export async function getWhatsAppTemplate(templateId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('whatsapp_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (error) throw error
  return data as WhatsAppTemplate
}

export async function createWhatsAppTemplate(
  orgId: string,
  template: {
    name: string
    language?: string
    category: WhatsAppTemplate['category']
    components?: any[]
  }
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('whatsapp_templates')
    .insert({
      org_id: orgId,
      name: template.name,
      language: template.language || 'pt_BR',
      category: template.category,
      components: template.components || [],
      status: 'draft',
    })
    .select()
    .single()

  if (error) throw error
  return data as WhatsAppTemplate
}

export async function updateWhatsAppTemplate(
  templateId: string,
  updates: Partial<Pick<WhatsAppTemplate, 'name' | 'language' | 'category' | 'components' | 'status' | 'wa_template_id'>>
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('whatsapp_templates')
    .update(updates)
    .eq('id', templateId)
    .select()
    .single()

  if (error) throw error
  return data as WhatsAppTemplate
}

export async function deleteWhatsAppTemplate(templateId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('whatsapp_templates')
    .delete()
    .eq('id', templateId)

  if (error) throw error
}

// ============= BROADCASTS =============

export async function getBroadcasts(orgId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('whatsapp_broadcasts')
    .select('*, template:whatsapp_templates(*), segment:segments(*)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as (WhatsAppBroadcast & { template?: WhatsAppTemplate; segment?: any })[]
}

export async function createBroadcast(
  orgId: string,
  userId: string,
  broadcast: {
    name: string
    template_id: string
    segment_id?: string
  }
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('whatsapp_broadcasts')
    .insert({
      org_id: orgId,
      name: broadcast.name,
      template_id: broadcast.template_id,
      segment_id: broadcast.segment_id || null,
      status: 'draft',
      created_by: userId,
    })
    .select()
    .single()

  if (error) throw error
  return data as WhatsAppBroadcast
}

export async function updateBroadcast(
  broadcastId: string,
  updates: Partial<Pick<WhatsAppBroadcast, 'status' | 'total_recipients' | 'total_sent' | 'total_delivered' | 'total_read' | 'total_failed' | 'sent_at'>>
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('whatsapp_broadcasts')
    .update(updates)
    .eq('id', broadcastId)
    .select()
    .single()

  if (error) throw error
  return data as WhatsAppBroadcast
}
