import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Twilio webhook for SMS status updates
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const messageSid = formData.get('MessageSid') as string
    const messageStatus = formData.get('MessageStatus') as string

    if (!messageSid || !messageStatus) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Map Twilio status to our status
    const statusMap: Record<string, string> = {
      queued: 'queued',
      sent: 'sent',
      delivered: 'delivered',
      undelivered: 'failed',
      failed: 'failed',
      received: 'received',
    }

    const status = statusMap[messageStatus] || messageStatus
    const errorCode = formData.get('ErrorCode') as string | null
    const errorMessage = formData.get('ErrorMessage') as string | null

    await supabase
      .from('sms_messages')
      .update({
        status,
        error_message: errorMessage || (errorCode ? `Error code: ${errorCode}` : null),
      })
      .eq('provider_message_id', messageSid)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('SMS webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
