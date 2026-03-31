import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { applyScoringAdmin } from '@/lib/supabase/lead-scoring'

// MailerSend webhook events we handle
const EVENT_MAP: Record<string, string> = {
  'activity.sent': 'sent',
  'activity.delivered': 'delivered',
  'activity.soft_bounced': 'bounced',
  'activity.hard_bounced': 'bounced',
  'activity.opened': 'opened',
  'activity.clicked': 'clicked',
  'activity.spam_complaint': 'complained',
  'activity.unsubscribed': 'complained',
}

// Map webhook status to lead_event event_type
const LEAD_EVENT_MAP: Record<string, { event_type: string; title: string }> = {
  sent: { event_type: 'email_sent', title: 'Email enviado' },
  delivered: { event_type: 'email_delivered', title: 'Email entregue' },
  opened: { event_type: 'email_opened', title: 'Email aberto' },
  clicked: { event_type: 'email_clicked', title: 'Link clicado no email' },
  bounced: { event_type: 'email_bounced', title: 'Email com bounce' },
  complained: { event_type: 'email_complained', title: 'Email marcado como spam' },
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (HMAC-SHA256)
    const webhookSecret = process.env.MAILERSEND_WEBHOOK_SECRET
    let body: any

    if (webhookSecret) {
      const signature = request.headers.get('signature')
      if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
      }
      // Verify HMAC-SHA256 signature
      const bodyText = await request.text()
      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(webhookSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      )
      const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(bodyText))
      const expectedSignature = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('')

      if (signature !== expectedSignature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
      // Re-parse body since we consumed it as text
      body = JSON.parse(bodyText)
    } else {
      body = await request.json()
    }
    const supabase = createAdminClient()

    // MailerSend sends webhook data in this format:
    // { type: 'activity.delivered', data: { email: { message_id: '...', ... }, ... } }
    const eventType = body.type as string | undefined
    const mappedStatus = eventType ? EVENT_MAP[eventType] : undefined

    if (!mappedStatus) {
      // Unknown event, acknowledge but skip
      return NextResponse.json({ status: 'ignored', event: eventType })
    }

    const messageId = body.data?.email?.message_id as string | undefined
    if (!messageId) {
      return NextResponse.json({ error: 'Missing message_id' }, { status: 400 })
    }

    const timestamp = (body.data?.created_at as string) || new Date().toISOString()

    // Find the send log by mailersend_message_id
    const { data: sendLog, error: findError } = await supabase
      .from('campaign_send_logs')
      .select('id, campaign_id, lead_id, email')
      .eq('mailersend_message_id', messageId)
      .single()

    if (findError || !sendLog) {
      // Message not found in our system, ignore
      return NextResponse.json({ status: 'not_found' })
    }

    // Update send log
    const updateData: Record<string, string> = { status: mappedStatus }
    const timestampField = `${mappedStatus}_at`
    if (['sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained'].includes(mappedStatus)) {
      updateData[timestampField] = timestamp
    }

    await supabase
      .from('campaign_send_logs')
      .update(updateData)
      .eq('id', sendLog.id)

    // Update campaign stats
    const statField = `total_${mappedStatus}`
    // Fetch current stats and increment (acceptable for initial implementation)
    const { data: stats } = await supabase
      .from('campaign_stats')
      .select('*')
      .eq('campaign_id', sendLog.campaign_id)
      .single()

    if (stats) {
      const currentValue = ((stats as Record<string, unknown>)[statField] as number) || 0
      await supabase
        .from('campaign_stats')
        .update({ [statField]: currentValue + 1 })
        .eq('campaign_id', sendLog.campaign_id)
    }

    // If bounced or complained, update lead status
    if (mappedStatus === 'bounced' || mappedStatus === 'complained') {
      const leadStatus = mappedStatus === 'bounced' ? 'bounced' : 'complained'
      await supabase
        .from('leads')
        .update({ status: leadStatus })
        .eq('id', sendLog.lead_id)
    }

    // Log lead event for timeline
    const leadEventInfo = LEAD_EVENT_MAP[mappedStatus]
    if (leadEventInfo && sendLog.lead_id) {
      try {
        // Get lead org_id
        const { data: lead } = await supabase
          .from('leads')
          .select('org_id')
          .eq('id', sendLog.lead_id)
          .single()

        if (lead) {
          await supabase.from('lead_events').insert({
            org_id: lead.org_id,
            lead_id: sendLog.lead_id,
            event_type: leadEventInfo.event_type,
            title: leadEventInfo.title,
            description: null,
            metadata: {
              campaign_id: sendLog.campaign_id,
              message_id: messageId,
              email: sendLog.email,
            },
          })
        }
      } catch (eventError) {
        // Silent fail — event logging should not break webhook processing
        console.error('Erro ao registrar lead event via webhook:', eventError)
      }
    }

    // Apply lead scoring rules based on the event
    if (sendLog.lead_id) {
      try {
        const { data: leadForScoring } = await supabase
          .from('leads')
          .select('org_id')
          .eq('id', sendLog.lead_id)
          .single()

        if (leadForScoring) {
          // Map status to scoring event type (e.g. 'opened' -> 'email_opened')
          const scoringEventType = `email_${mappedStatus}`
          await applyScoringAdmin(leadForScoring.org_id, sendLog.lead_id, scoringEventType)
        }
      } catch (scoringError) {
        // Silent fail — scoring should not break webhook processing
        console.error('Erro ao aplicar scoring via webhook:', scoringError)
      }
    }

    return NextResponse.json({ status: 'processed', event: eventType })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
