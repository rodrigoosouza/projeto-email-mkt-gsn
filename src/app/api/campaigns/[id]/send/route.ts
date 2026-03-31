import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/mailersend/client'
import { replaceTemplateVariables, buildLeadVariables } from '@/lib/template-utils'
import { applyRulesToQuery } from '@/lib/supabase/segments'

export const maxDuration = 300 // 5 min max (Vercel Pro)

const BATCH_SIZE = 25
const BATCH_DELAY_MS = 500
const MAX_RETRIES = 2

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
      // Don't retry on 4xx (invalid email, auth error)
      if (msg.includes('422') || msg.includes('401') || msg.includes('403')) {
        return { messageId: null, error: msg }
      }
      // Retry on 5xx or network errors
      if (attempt < retries) {
        await delay(1000 * (attempt + 1)) // exponential backoff
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

  // Validate sender
  if (senderEmail.includes('@example.com') || senderEmail.includes('@plataforma-email.com')) {
    await admin.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
    return NextResponse.json(
      { error: 'Email de remetente nao configurado. Va em Configuracoes > Organizacao e configure o email de envio.' },
      { status: 400 }
    )
  }

  const template = campaign.template
  if (!template || !template.html_content) {
    await admin.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
    return NextResponse.json({ error: 'Template sem conteudo HTML' }, { status: 400 })
  }

  if (!process.env.MAILERSEND_API_KEY) {
    await admin.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
    return NextResponse.json({ error: 'MAILERSEND_API_KEY nao configurada' }, { status: 500 })
  }

  // Update status to sending
  await admin.from('campaigns').update({ status: 'sending' }).eq('id', campaignId)

  try {
    // Fetch leads based on segment type (optimized: only needed fields)
    const selectFields = 'id,email,first_name,last_name,company,position,status'
    let leads: Array<{
      id: string; email: string; first_name?: string | null
      last_name?: string | null; company?: string | null; position?: string | null; status?: string
    }> = []

    const segment = campaign.segment
    if (segment && segment.type === 'dynamic' && segment.rules && segment.rules.length > 0) {
      let query = supabase
        .from('leads')
        .select(selectFields)
        .eq('org_id', campaign.org_id)
        .eq('status', 'active')
      query = applyRulesToQuery(query, segment.rules)
      const { data } = await query
      leads = data || []
    } else if (campaign.segment_id) {
      const { data: memberships } = await supabase
        .from('segment_memberships')
        .select(`lead:leads(${selectFields})`)
        .eq('segment_id', campaign.segment_id)
      leads = (memberships?.map((m: any) => m.lead).filter(Boolean) || []) as typeof leads
    }

    // Filter active only
    leads = leads.filter((lead) => !lead.status || lead.status === 'active')

    if (leads.length === 0) {
      await admin.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
      return NextResponse.json({ error: 'Nenhum lead ativo encontrado no segmento' }, { status: 400 })
    }

    console.log(`[Campaign ${campaignId}] Sending to ${leads.length} leads in batches of ${BATCH_SIZE}`)

    // Create send logs in bulk (batches of 500 to avoid payload limits)
    for (let i = 0; i < leads.length; i += 500) {
      const logBatch = leads.slice(i, i + 500).map((lead) => ({
        campaign_id: campaignId,
        lead_id: lead.id,
        email: lead.email,
        status: 'pending',
      }))
      await admin.from('campaign_send_logs').insert(logBatch)
    }

    // Init campaign stats
    await admin.from('campaign_stats').upsert(
      { campaign_id: campaignId, total_sent: leads.length, total_delivered: 0, total_opened: 0, total_clicked: 0, total_bounced: 0, total_complained: 0 },
      { onConflict: 'campaign_id' }
    )

    // Send in batches
    let sentCount = 0
    let errorCount = 0

    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
      const batch = leads.slice(i, i + BATCH_SIZE)

      const results = await Promise.allSettled(
        batch.map(async (lead) => {
          const variables = buildLeadVariables(lead)
          const personalizedSubject = replaceTemplateVariables(template.subject, variables)
          const personalizedHtml = replaceTemplateVariables(template.html_content, variables)

          const { messageId, error } = await sendWithRetry({
            from: { email: senderEmail, name: senderName },
            to: [{ email: lead.email, name: variables.full_name }],
            subject: personalizedSubject,
            html: personalizedHtml,
          })

          if (messageId) {
            await admin.from('campaign_send_logs').update({
              status: 'sent',
              mailersend_message_id: messageId,
              sent_at: new Date().toISOString(),
            }).eq('campaign_id', campaignId).eq('lead_id', lead.id)
            return { success: true }
          } else {
            await admin.from('campaign_send_logs').update({
              status: 'bounced',
              error_message: error || 'Falha no envio',
            }).eq('campaign_id', campaignId).eq('lead_id', lead.id)
            return { success: false, error }
          }
        })
      )

      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.success) sentCount++
        else errorCount++
      }

      // Delay between batches
      if (i + BATCH_SIZE < leads.length) {
        await delay(BATCH_DELAY_MS)
      }

      // Log progress every 10 batches
      if ((i / BATCH_SIZE) % 10 === 0 && i > 0) {
        console.log(`[Campaign ${campaignId}] Progress: ${i + batch.length}/${leads.length} (${sentCount} sent, ${errorCount} errors)`)
      }
    }

    // Update campaign final status
    const finalStatus = errorCount === leads.length ? 'failed' : 'sent'
    await admin.from('campaigns').update({
      status: finalStatus,
      total_leads: leads.length,
      sent_at: new Date().toISOString(),
    }).eq('id', campaignId)

    // Update stats with real counts
    await admin.from('campaign_stats').update({
      total_sent: sentCount,
      total_bounced: errorCount,
    }).eq('campaign_id', campaignId)

    console.log(`[Campaign ${campaignId}] Done: ${sentCount} sent, ${errorCount} errors out of ${leads.length}`)

    return NextResponse.json({
      success: true,
      totalLeads: leads.length,
      sent: sentCount,
      errors: errorCount,
    })

  } catch (error) {
    console.error(`[Campaign ${campaignId}] Fatal error:`, error)
    // Mark as failed so it doesn't stay "sending" forever
    await admin.from('campaigns').update({
      status: 'failed',
    }).eq('id', campaignId)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno no envio' },
      { status: 500 }
    )
  }
}
