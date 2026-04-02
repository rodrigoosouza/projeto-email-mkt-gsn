import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/mailersend/client'
import { replaceTemplateVariables, buildLeadVariables } from '@/lib/template-utils'

export const maxDuration = 300

const SEND_DELAY_MS = 1200
const MAX_RETRIES = 3
const RATE_LIMIT_WAIT_MS = 65000

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function sendWithRetry(
  params: Parameters<typeof sendEmail>[0],
  retries = MAX_RETRIES
): Promise<{ messageId: string | null; error?: string }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await sendEmail(params)
      return { messageId: result.messageId }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido'
      if (msg.includes('422') || msg.includes('401') || msg.includes('403')) {
        return { messageId: null, error: msg }
      }
      if (msg.includes('429')) {
        if (attempt < retries) {
          console.log(`[Retry] Rate limited, waiting ${RATE_LIMIT_WAIT_MS / 1000}s`)
          await delay(RATE_LIMIT_WAIT_MS)
          continue
        }
        return { messageId: null, error: 'Rate limit excedido apos retentativas' }
      }
      if (attempt < retries) {
        await delay(2000 * (attempt + 1))
        continue
      }
      return { messageId: null, error: msg }
    }
  }
  return { messageId: null, error: 'Max retries exceeded' }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: campaignId } = await params
  const admin = createAdminClient()

  // Fetch campaign with template
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*, template:email_templates(*)')
    .eq('id', campaignId)
    .single()

  if (campaignError || !campaign) {
    return NextResponse.json({ error: 'Campanha nao encontrada' }, { status: 404 })
  }

  const template = campaign.template
  if (!template || !template.html_content) {
    return NextResponse.json({ error: 'Template sem conteudo HTML' }, { status: 400 })
  }

  // Fetch org for sender info
  const { data: org } = await supabase
    .from('organizations')
    .select('sender_email, sender_name')
    .eq('id', campaign.org_id)
    .single()

  const senderEmail = org?.sender_email || `noreply@${process.env.MAILERSEND_DEFAULT_DOMAIN || 'test.mlsender.net'}`
  const senderName = org?.sender_name || 'Plataforma Email'

  // Get failed send logs
  const { data: failedLogs } = await admin
    .from('campaign_send_logs')
    .select('id, lead_id, email')
    .eq('campaign_id', campaignId)
    .in('status', ['failed', 'bounced'])

  if (!failedLogs || failedLogs.length === 0) {
    return NextResponse.json({ message: 'Nenhum envio com falha para retentar', totalRetry: 0 })
  }

  // Get lead data for personalization
  const leadIds = failedLogs.map(l => l.lead_id).filter(Boolean)
  const { data: leads } = await admin
    .from('leads')
    .select('id, email, first_name, last_name, company, position')
    .in('id', leadIds)

  const leadMap = new Map<string, any>()
  leads?.forEach(l => leadMap.set(l.id, l))

  // Update campaign status
  await admin.from('campaigns').update({ status: 'sending' }).eq('id', campaignId)

  console.log(`[Retry ${campaignId}] Retrying ${failedLogs.length} failed sends`)

  let sentCount = 0
  let errorCount = 0

  for (let i = 0; i < failedLogs.length; i++) {
    const log = failedLogs[i]
    const lead = leadMap.get(log.lead_id) || { email: log.email, first_name: '', last_name: '' }
    const variables = buildLeadVariables(lead)
    const personalizedSubject = replaceTemplateVariables(template.subject, variables)
    const personalizedHtml = replaceTemplateVariables(template.html_content, variables)

    // Reset log to pending
    await admin.from('campaign_send_logs').update({
      status: 'pending',
      error_message: null,
    }).eq('id', log.id)

    const { messageId, error } = await sendWithRetry({
      from: { email: senderEmail, name: senderName },
      to: [{ email: log.email, name: variables.full_name }],
      subject: personalizedSubject,
      html: personalizedHtml,
    })

    if (messageId) {
      await admin.from('campaign_send_logs').update({
        status: 'sent',
        mailersend_message_id: messageId,
        sent_at: new Date().toISOString(),
        error_message: null,
      }).eq('id', log.id)
      sentCount++
    } else {
      await admin.from('campaign_send_logs').update({
        status: 'failed',
        error_message: error || 'Falha no reenvio',
      }).eq('id', log.id)
      errorCount++
    }

    // Delay to respect rate limit
    if (i < failedLogs.length - 1) {
      await delay(SEND_DELAY_MS)
    }

    if ((i + 1) % 50 === 0) {
      console.log(`[Retry ${campaignId}] Progress: ${i + 1}/${failedLogs.length} (${sentCount} sent, ${errorCount} errors)`)
    }
  }

  // Update campaign status
  const finalStatus = sentCount > 0 ? 'sent' : 'failed'
  await admin.from('campaigns').update({ status: finalStatus }).eq('id', campaignId)

  // Update stats
  const { data: allLogs } = await admin
    .from('campaign_send_logs')
    .select('status')
    .eq('campaign_id', campaignId)

  if (allLogs) {
    const totalSent = allLogs.filter(l => ['sent', 'delivered', 'opened', 'clicked'].includes(l.status)).length
    await admin.from('campaign_stats').update({ total_sent: totalSent }).eq('campaign_id', campaignId)
  }

  console.log(`[Retry ${campaignId}] Done: ${sentCount} sent, ${errorCount} errors`)

  return NextResponse.json({
    success: true,
    totalRetry: failedLogs.length,
    sent: sentCount,
    errors: errorCount,
  })
}
