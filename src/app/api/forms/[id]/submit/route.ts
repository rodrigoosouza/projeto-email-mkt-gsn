import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminClient()
    const formId = params.id

    // Get the form
    const { data: form, error: formError } = await supabase
      .from('lead_forms')
      .select('*')
      .eq('id', formId)
      .eq('is_active', true)
      .single()

    if (formError || !form) {
      return NextResponse.json(
        { error: 'Formulario nao encontrado ou inativo' },
        { status: 404, headers: corsHeaders }
      )
    }

    const body = await request.json()
    const formData = body.data || body.fields || {}
    const sourceUrl = body.source_url || null
    const tracking: Record<string, string> = body.tracking || {}

    // Validate required fields
    const fields = form.fields as any[]
    for (const field of fields) {
      if (field.required && !formData[field.name]) {
        return NextResponse.json(
          { error: `Campo obrigatorio: ${field.label}` },
          { status: 400, headers: corsHeaders }
        )
      }
    }

    // Create or upsert lead
    const email = formData.email || null
    const phone = formData.phone || formData.telefone || null
    let leadId: string | null = null

    if (email) {
      const leadPayload: Record<string, any> = {
        org_id: form.org_id,
        email,
        source: 'form',
      }

      // Map common fields
      if (formData.first_name || formData.nome) {
        leadPayload.first_name = formData.first_name || formData.nome
      }
      if (formData.last_name || formData.sobrenome) {
        leadPayload.last_name = formData.last_name || formData.sobrenome
      }
      if (phone) leadPayload.phone = phone
      if (formData.company || formData.empresa) {
        leadPayload.company = formData.company || formData.empresa
      }
      if (formData.position || formData.cargo) {
        leadPayload.position = formData.position || formData.cargo
      }

      // Build tracking custom fields (only non-empty values)
      const trackingFields: Record<string, string> = {}
      for (const [key, val] of Object.entries(tracking)) {
        if (val) trackingFields[key] = val
      }

      // First, try to get existing lead to preserve custom_fields
      const { data: existingLead } = await supabase
        .from('leads')
        .select('custom_fields')
        .eq('org_id', form.org_id)
        .eq('email', email)
        .single()

      const existingCustomFields = (existingLead?.custom_fields as Record<string, any>) || {}
      // Merge: existing values take precedence, then add new tracking fields
      leadPayload.custom_fields = { ...trackingFields, ...existingCustomFields }

      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .upsert(leadPayload, { onConflict: 'org_id,email' })
        .select()
        .single()

      if (!leadError && lead) {
        leadId = lead.id

        // Add tags if configured
        const tagIds = form.tag_ids as string[]
        if (tagIds && tagIds.length > 0) {
          for (const tagId of tagIds) {
            await supabase
              .from('lead_tag_assignments')
              .upsert(
                { lead_id: lead.id, tag_id: tagId },
                { onConflict: 'lead_id,tag_id' }
              )
          }
        }

        // Add to segment if configured
        if (form.segment_id) {
          await supabase
            .from('segment_memberships')
            .upsert(
              { segment_id: form.segment_id, lead_id: lead.id },
              { onConflict: 'segment_id,lead_id' }
            )
        }

        // Log lead event
        await supabase.from('lead_events').insert({
          org_id: form.org_id,
          lead_id: lead.id,
          event_type: 'custom',
          title: `Formulario preenchido: ${form.name}`,
          description: `Dados enviados via formulario "${form.name}"`,
          metadata: { form_id: form.id, form_name: form.name, source_url: sourceUrl },
        })

        // Auto-enrich lead if has company (fire-and-forget, internal call)
        if (lead.company && lead.enrichment_status !== 'enriched') {
          const enrichUrl = `${process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || ''}/api/leads/enrich`
          const internalKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').slice(0, 20)
          fetch(enrichUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-internal-key': internalKey },
            body: JSON.stringify({ leadId: lead.id }),
          }).catch(() => {})
        }
      }
    }

    // Get IP and user agent
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null
    const userAgent = request.headers.get('user-agent') || null

    // Save form submission (include tracking data alongside form data)
    const submissionData = {
      ...formData,
      ...(Object.keys(tracking).length > 0 ? { _tracking: tracking } : {}),
    }
    await supabase.from('form_submissions').insert({
      form_id: formId,
      org_id: form.org_id,
      lead_id: leadId,
      data: submissionData,
      source_url: sourceUrl,
      ip_address: ipAddress,
      user_agent: userAgent,
    })

    // Increment submission count
    try {
      const { error: rpcError } = await supabase.rpc('increment_counter', {
        table_name: 'lead_forms',
        row_id: formId,
        column_name: 'submission_count',
      })
      if (rpcError) {
        // Fallback: manual increment if RPC doesn't exist
        await supabase
          .from('lead_forms')
          .update({ submission_count: (form.submission_count || 0) + 1 })
          .eq('id', formId)
      }
    } catch {
      await supabase
        .from('lead_forms')
        .update({ submission_count: (form.submission_count || 0) + 1 })
        .eq('id', formId)
    }

    return NextResponse.json(
      {
        success: true,
        message: form.success_message || 'Obrigado! Recebemos seus dados.',
        redirect_url: form.redirect_url || null,
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('Form submission error:', error)
    return NextResponse.json(
      { error: 'Erro interno ao processar formulario' },
      { status: 500, headers: corsHeaders }
    )
  }
}
