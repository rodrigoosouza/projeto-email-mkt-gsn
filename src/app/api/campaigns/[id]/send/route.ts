import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/mailersend/client'
import { replaceTemplateVariables, buildLeadVariables } from '@/lib/template-utils'
import { applyRulesToQuery } from '@/lib/supabase/segments'

export const maxDuration = 300 // 5 min max (Vercel Pro)

// Rate limit: 60 req/min = 1 per second. Send sequentially with 1.2s delay.
const SEND_DELAY_MS = 1200
const MAX_RETRIES = 3
const RATE_LIMIT_WAIT_MS = 65000 // wait 65s when hitting 429

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
      // Don't retry on 4xx (invalid email, auth error) — except 429
      if (msg.includes('422') || msg.includes('401') || msg.includes('403')) {
        return { messageId: null, error: msg }
      }
      // Rate limited (429) — wait and retry
      if (msg.includes('429')) {
        if (attempt < retries) {
          console.log(`[SendEmail] Rate limited, waiting ${RATE_LIMIT_WAIT_MS / 1000}s before retry ${attempt + 1}/${retries}`)
          await delay(RATE_LIMIT_WAIT_MS)
          continue
        }
        return { messageId: null, error: 'Rate limit excedido apos retentativas' }
      }
      // Retry on 5xx or network errors
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

    // Send sequentially — 1 email at a time with delay to respect rate limit (60 req/min)
    let sentCount = 0
    let errorCount = 0

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i]
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
        sentCount++
      } else {
        await admin.from('campaign_send_logs').update({
          status: 'failed',
          error_message: error || 'Falha no envio',
        }).eq('campaign_id', campaignId).eq('lead_id', lead.id)
        errorCount++
      }

      // Delay between sends to respect rate limit
      if (i < leads.length - 1) {
        await delay(SEND_DELAY_MS)
      }

      // Log progress every 50 emails
      if ((i + 1) % 50 === 0) {
        console.log(`[Campaign ${campaignId}] Progress: ${i + 1}/${leads.length} (${sentCount} sent, ${errorCount} errors)`)
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
