import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET — Meta webhook verification
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST — Incoming messages and status updates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createAdminClient()

    // Meta sends webhooks in this structure:
    // { object: 'whatsapp_business_account', entry: [{ id, changes: [{ value, field }] }] }
    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ status: 'ignored' })
    }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue

        const value = change.value
        const phoneNumberId = value?.metadata?.phone_number_id

        // Find org by phone_number_id in integrations config or env
        // For now, use a default org lookup approach
        const orgId = await resolveOrgId(supabase, phoneNumberId)
        if (!orgId) {
          console.warn('[WhatsApp] Could not resolve org for phone_number_id:', phoneNumberId)
          continue
        }

        // Handle incoming messages
        for (const message of value?.messages || []) {
          await handleIncomingMessage(supabase, orgId, value, message)
        }

        // Handle status updates (sent, delivered, read)
        for (const status of value?.statuses || []) {
          await handleStatusUpdate(supabase, status)
        }
      }
    }

    return NextResponse.json({ status: 'processed' })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function resolveOrgId(supabase: ReturnType<typeof createAdminClient>, phoneNumberId: string): Promise<string | null> {
  // Check integrations table for whatsapp config matching this phone_number_id
  const { data } = await supabase
    .from('integrations')
    .select('org_id')
    .eq('provider', 'whatsapp')
    .eq('is_active', true)

  if (data && data.length > 0) {
    // Find the one with matching phone_number_id in config
    for (const integration of data) {
      const config = integration as any
      if (config?.config?.phone_number_id === phoneNumberId) {
        return config.org_id
      }
    }
  }

  return null // Reject webhook if org cannot be determined
}

async function handleIncomingMessage(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
  value: any,
  message: any
) {
  const phone = message.from
  const contactName = value?.contacts?.[0]?.profile?.name || null
  const waMessageId = message.id
  const timestamp = message.timestamp
    ? new Date(parseInt(message.timestamp) * 1000).toISOString()
    : new Date().toISOString()

  // Determine message type and content
  let messageType = message.type || 'text'
  let content: Record<string, any> = {}

  switch (messageType) {
    case 'text':
      content = { body: message.text?.body || '' }
      break
    case 'image':
      content = { caption: message.image?.caption, media_id: message.image?.id, mime_type: message.image?.mime_type }
      break
    case 'document':
      content = { caption: message.document?.caption, media_id: message.document?.id, filename: message.document?.filename, mime_type: message.document?.mime_type }
      break
    case 'video':
      content = { caption: message.video?.caption, media_id: message.video?.id, mime_type: message.video?.mime_type }
      break
    case 'audio':
      content = { media_id: message.audio?.id, mime_type: message.audio?.mime_type }
      break
    case 'reaction':
      content = { emoji: message.reaction?.emoji, message_id: message.reaction?.message_id }
      break
    case 'interactive':
      content = { type: message.interactive?.type, reply: message.interactive?.button_reply || message.interactive?.list_reply }
      break
    default:
      content = { raw: message }
      messageType = 'text'
  }

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
        contact_name: contactName || (lead ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || null : null),
        status: 'open',
        last_message_at: timestamp,
        unread_count: 1,
      })
      .select()
      .single()

    if (convError) {
      console.error('Error creating conversation:', convError)
      return
    }
    conversation = newConv
  } else {
    await supabase
      .from('whatsapp_conversations')
      .update({
        last_message_at: timestamp,
        unread_count: (conversation.unread_count || 0) + 1,
        contact_name: contactName || conversation.contact_name,
      })
      .eq('id', conversation.id)
  }

  // Insert message
  await supabase.from('whatsapp_messages').insert({
    conversation_id: conversation!.id,
    org_id: orgId,
    direction: 'inbound',
    message_type: messageType,
    content,
    wa_message_id: waMessageId,
    status: 'received',
  })
}

async function handleStatusUpdate(
  supabase: ReturnType<typeof createAdminClient>,
  status: any
) {
  const waMessageId = status.id
  const newStatus = status.status // 'sent', 'delivered', 'read', 'failed'

  if (!waMessageId || !newStatus) return

  // Map Meta status to our status
  const statusMap: Record<string, string> = {
    sent: 'sent',
    delivered: 'delivered',
    read: 'read',
    failed: 'failed',
  }

  const mappedStatus = statusMap[newStatus]
  if (!mappedStatus) return

  await supabase
    .from('whatsapp_messages')
    .update({ status: mappedStatus })
    .eq('wa_message_id', waMessageId)
}
