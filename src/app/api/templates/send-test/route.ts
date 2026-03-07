import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/mailersend/client'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { to, subject, html_content } = body

  if (!to || !subject || !html_content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Get user's org for sender info
  const { data: member } = await supabase
    .from('organization_members')
    .select('org_id, organization:organizations(sender_email, sender_name, name)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const org = (member as any)?.organization
  const senderEmail = org?.sender_email || `noreply@${process.env.MAILERSEND_DEFAULT_DOMAIN || 'test-z0vklo6vz81l7qrx.mlsender.net'}`
  const senderName = org?.sender_name || org?.name || 'Plataforma Email'

  // If no MailerSend key, return success (dev mode)
  if (!process.env.MAILERSEND_API_KEY) {
    return NextResponse.json({ success: true, dev: true, message: 'MailerSend nao configurado, email simulado' })
  }

  try {
    await sendEmail({
      from: { email: senderEmail, name: senderName },
      to: [{ email: to }],
      subject: `[TESTE] ${subject}`,
      html: html_content,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
