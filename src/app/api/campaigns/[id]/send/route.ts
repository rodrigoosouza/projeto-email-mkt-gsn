import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/mailersend/client'
import { replaceTemplateVariables, buildLeadVariables } from '@/lib/template-utils'
import { applyRulesToQuery } from '@/lib/supabase/segments'

const BATCH_SIZE = 10
const BATCH_DELAY_MS = 1000

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: campaignId } = await params

  // Fetch campaign with template and segment
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*, template:email_templates(*), segment:segments(*)')
    .eq('id', campaignId)
    .single()

  if (campaignError || !campaign) {
    return NextResponse.json({ error: 'Campanha nao encontrada' }, { status: 404 })
  }

  if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
    return NextResponse.json(
      { error: 'Campanha nao pode ser enviada no status atual' },
      { status: 400 }
    )
  }

  // Fetch organization for sender info
  const { data: org } = await supabase
    .from('organizations')
    .select('sender_email, sender_name')
    .eq('id', campaign.org_id)
    .single()

  const senderEmail = org?.sender_email || `noreply@${process.env.MAILERSEND_DEFAULT_DOMAIN || 'test-z0vklo6vz81l7qrx.mlsender.net'}`
  const senderName = org?.sender_name || 'Plataforma Email'

  // Validate sender email is not a placeholder
  if (senderEmail.includes('@example.com') || senderEmail.includes('@plataforma-email.com')) {
    await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
    return NextResponse.json(
      { error: 'Email de remetente nao configurado. Va em Configuracoes > Organizacao e configure o email de envio.' },
      { status: 400 }
    )
  }

  // Update status to sending
  await supabase
    .from('campaigns')
    .update({ status: 'sending' })
    .eq('id', campaignId)

  // Fetch leads based on segment type
  let leads: Array<{
    id: string
    email: string
    first_name?: string | null
    last_name?: string | null
    company?: string | null
    position?: string | null
    status?: string
  }> = []

  const segment = campaign.segment
  if (segment && segment.type === 'dynamic' && segment.rules && segment.rules.length > 0) {
    // Dynamic segment: evaluate rules against leads table
    let query = supabase
      .from('leads')
      .select('*')
      .eq('org_id', campaign.org_id)
      .eq('status', 'active')

    query = applyRulesToQuery(query, segment.rules)

    const { data: dynamicLeads } = await query
    leads = dynamicLeads || []
  } else {
    // Static segment (or fallback): use segment_memberships
    const { data: memberships } = await supabase
      .from('segment_memberships')
      .select('lead:leads(*)')
      .eq('segment_id', campaign.segment_id)

    leads = (
      memberships
        ?.map((m: Record<string, unknown>) => m.lead)
        .filter(Boolean) || []
    ) as typeof leads
  }

  // Filter to only active leads
  leads = leads.filter((lead) => !lead.status || lead.status === 'active')

  if (leads.length === 0) {
    await supabase
      .from('campaigns')
      .update({ status: 'failed' })
      .eq('id', campaignId)
    return NextResponse.json(
      { error: 'Nenhum lead encontrado no segmento' },
      { status: 400 }
    )
  }

  // Create send logs
  const sendLogs = leads.map((lead) => ({
    campaign_id: campaignId,
    lead_id: lead.id,
    email: lead.email,
    status: 'pending',
  }))
  await supabase.from('campaign_send_logs').insert(sendLogs)

  // Create campaign stats
  await supabase.from('campaign_stats').upsert(
    {
      campaign_id: campaignId,
      total_sent: leads.length,
    },
    { onConflict: 'campaign_id' }
  )

  // Send emails via MailerSend (if API key is configured)
  const hasMailerSendKey = !!process.env.MAILERSEND_API_KEY
  const template = campaign.template

  if (hasMailerSendKey && template) {
    // Send in batches to avoid rate limits
    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
      const batch = leads.slice(i, i + BATCH_SIZE)

      const sendPromises = batch.map(async (lead) => {
        try {
          const variables = buildLeadVariables(lead)
          const personalizedSubject = replaceTemplateVariables(template.subject, variables)
          const personalizedHtml = replaceTemplateVariables(template.html_content, variables)

          const { messageId } = await sendEmail({
            from: { email: senderEmail, name: senderName },
            to: [{ email: lead.email, name: variables.full_name }],
            subject: personalizedSubject,
            html: personalizedHtml,
          })

          // Update send log with messageId and status
          await supabase
            .from('campaign_send_logs')
            .update({
              status: 'sent',
              mailersend_message_id: messageId,
              sent_at: new Date().toISOString(),
            })
            .eq('campaign_id', campaignId)
            .eq('lead_id', lead.id)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          await supabase
            .from('campaign_send_logs')
            .update({
              status: 'bounced',
              error_message: errorMessage,
            })
            .eq('campaign_id', campaignId)
            .eq('lead_id', lead.id)
        }
      })

      await Promise.all(sendPromises)

      // Delay between batches (skip delay after last batch)
      if (i + BATCH_SIZE < leads.length) {
        await delay(BATCH_DELAY_MS)
      }
    }
  }

  // Update campaign to sent
  await supabase
    .from('campaigns')
    .update({
      status: 'sent',
      total_leads: leads.length,
      sent_at: new Date().toISOString(),
    })
    .eq('id', campaignId)

  return NextResponse.json({ success: true, totalLeads: leads.length })
}
