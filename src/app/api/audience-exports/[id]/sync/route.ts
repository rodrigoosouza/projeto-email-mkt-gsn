import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCustomAudience, addUsersToAudience } from '@/lib/audience/meta-audience-client'
import { createGoogleAudience, syncGoogleAudience } from '@/lib/audience/google-audience-client'

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

  const { id } = await params

  // Fetch export with segment
  const { data: audienceExport, error: exportError } = await supabase
    .from('audience_exports')
    .select('*, segment:segments(id, name, rules, type)')
    .eq('id', id)
    .single()

  if (exportError || !audienceExport) {
    return NextResponse.json({ error: 'Exportacao nao encontrada' }, { status: 404 })
  }

  // Update status to processing
  await supabase
    .from('audience_exports')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', id)

  try {
    // Fetch leads from segment
    let leadsQuery = supabase
      .from('leads')
      .select('email')
      .eq('org_id', audienceExport.org_id)
      .eq('status', 'active')

    if (audienceExport.segment_id) {
      // Get leads that belong to this segment
      const { data: memberships } = await supabase
        .from('segment_memberships')
        .select('lead_id')
        .eq('segment_id', audienceExport.segment_id)

      if (memberships && memberships.length > 0) {
        const leadIds = memberships.map((m: any) => m.lead_id)
        leadsQuery = leadsQuery.in('id', leadIds)
      } else {
        // No leads in segment
        await supabase
          .from('audience_exports')
          .update({
            status: 'completed',
            total_leads: 0,
            exported_leads: 0,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)

        return NextResponse.json({ success: true, total_leads: 0, exported_leads: 0 })
      }
    }

    const { data: leads, error: leadsError } = await leadsQuery
    if (leadsError) throw leadsError

    const emails = (leads || []).map((l: any) => l.email).filter(Boolean)
    const totalLeads = emails.length

    let platformAudienceId = audienceExport.platform_audience_id
    let exportedLeads = 0

    if (audienceExport.platform === 'meta_ads') {
      // Create audience if it doesn't exist
      if (!platformAudienceId) {
        platformAudienceId = await createCustomAudience(
          audienceExport.name,
          `Exportado da Plataforma Email - Segmento: ${audienceExport.segment?.name || 'Todos'}`
        )
      }

      // Add users
      if (emails.length > 0) {
        const result = await addUsersToAudience(platformAudienceId, emails)
        exportedLeads = result.num_received
      }
    } else if (audienceExport.platform === 'google_ads') {
      // Create audience if it doesn't exist
      if (!platformAudienceId) {
        platformAudienceId = await createGoogleAudience(audienceExport.name)
      }

      // Sync users
      if (emails.length > 0) {
        const result = await syncGoogleAudience(platformAudienceId, emails)
        exportedLeads = result.processed
      }
    }

    // Update export with results
    await supabase
      .from('audience_exports')
      .update({
        status: 'completed',
        total_leads: totalLeads,
        exported_leads: exportedLeads,
        platform_audience_id: platformAudienceId,
        last_synced_at: new Date().toISOString(),
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      total_leads: totalLeads,
      exported_leads: exportedLeads,
      platform_audience_id: platformAudienceId,
    })
  } catch (error: any) {
    // Update export with error
    await supabase
      .from('audience_exports')
      .update({
        status: 'failed',
        error_message: error.message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    return NextResponse.json(
      { error: 'Erro ao sincronizar publico', details: error.message },
      { status: 500 }
    )
  }
}
