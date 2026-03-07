import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSms } from '@/lib/sms/twilio-client'

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    const { org_id, lead_id, phone_number, body: messageBody, user_id } = body

    if (!org_id || !phone_number || !messageBody) {
      return NextResponse.json(
        { error: 'org_id, phone_number e body sao obrigatorios' },
        { status: 400 }
      )
    }

    // Verify user belongs to org
    if (user_id) {
      const { data: member } = await supabase
        .from('organization_members')
        .select('id')
        .eq('org_id', org_id)
        .eq('user_id', user_id)
        .single()

      if (!member) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
      }
    }

    // Send SMS via Twilio
    let providerMessageId: string | null = null
    let status = 'queued'
    let errorMessage: string | null = null

    try {
      const result = await sendSms(phone_number, messageBody)
      providerMessageId = result.sid || null
      status = result.status || 'queued'
    } catch (error) {
      status = 'failed'
      errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    }

    // Save to database
    const { data: smsMessage, error: dbError } = await supabase
      .from('sms_messages')
      .insert({
        org_id,
        lead_id: lead_id || null,
        phone_number,
        direction: 'outbound',
        body: messageBody,
        status,
        provider_message_id: providerMessageId,
        error_message: errorMessage,
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: smsMessage })
  } catch (error) {
    console.error('SMS send error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
