import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  createCampaign,
  createAdSet,
  deleteCampaign,
  buildMetaTargeting,
} from '@/lib/analytics/meta-ads-client'

export const maxDuration = 30

export async function POST(request: Request) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { campaignId } = await request.json()
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId é obrigatório' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 1. Fetch the campaign
    const { data: campaign, error: campaignError } = await admin
      .from('ad_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    }

    if (campaign.platform !== 'meta_ads') {
      return NextResponse.json({ error: 'Apenas campanhas Meta Ads podem ser publicadas aqui' }, { status: 400 })
    }

    if (campaign.platform_campaign_id) {
      return NextResponse.json({ error: 'Campanha já foi publicada no Meta', meta_campaign_id: campaign.platform_campaign_id }, { status: 400 })
    }

    if (!['draft', 'ready'].includes(campaign.status)) {
      return NextResponse.json({ error: `Status "${campaign.status}" não permite publicação` }, { status: 400 })
    }

    // 2. Fetch Meta account for this org
    const { data: metaAccount, error: metaError } = await admin
      .from('meta_ad_accounts')
      .select('access_token, ad_account_id')
      .eq('org_id', campaign.org_id)
      .eq('status', 'active')
      .single()

    if (metaError || !metaAccount) {
      return NextResponse.json({ error: 'Conta Meta Ads não configurada ou inativa para esta organização' }, { status: 400 })
    }

    const config = {
      access_token: metaAccount.access_token,
      ad_account_id: metaAccount.ad_account_id.startsWith('act_')
        ? metaAccount.ad_account_id
        : `act_${metaAccount.ad_account_id}`,
    }

    // 3. Validate budget
    const dailyBudget = Number(campaign.budget_daily || 0)
    if (dailyBudget < 5) {
      return NextResponse.json({ error: 'Orçamento diário mínimo é R$ 5,00' }, { status: 400 })
    }

    // 4. Build targeting
    const targeting = buildMetaTargeting(campaign.target_audience || {})

    // 5. Create campaign on Meta
    let metaCampaignId: string
    try {
      metaCampaignId = await createCampaign(config, {
        name: campaign.name,
        campaignType: campaign.campaign_type,
        dailyBudget,
        startTime: campaign.start_date || undefined,
        stopTime: campaign.end_date || undefined,
      })
    } catch (error: any) {
      await admin
        .from('ad_campaigns')
        .update({ status: 'failed', performance_data: { error: error.message, step: 'create_campaign' } })
        .eq('id', campaignId)

      return NextResponse.json({ error: `Erro ao criar campanha no Meta: ${error.message}` }, { status: 500 })
    }

    // 6. Create ad set on Meta
    let metaAdSetId: string
    try {
      metaAdSetId = await createAdSet(config, {
        name: `${campaign.name} - Público`,
        campaignId: metaCampaignId,
        campaignType: campaign.campaign_type,
        dailyBudget,
        targeting,
        startTime: campaign.start_date || undefined,
        endTime: campaign.end_date || undefined,
      })
    } catch (error: any) {
      // Cleanup: delete the campaign we just created
      try {
        await deleteCampaign(config, metaCampaignId)
      } catch { /* ignore cleanup errors */ }

      await admin
        .from('ad_campaigns')
        .update({ status: 'failed', performance_data: { error: error.message, step: 'create_adset', meta_campaign_id: metaCampaignId } })
        .eq('id', campaignId)

      return NextResponse.json({ error: `Erro ao criar conjunto de anúncios: ${error.message}` }, { status: 500 })
    }

    // 7. Update campaign in database
    await admin
      .from('ad_campaigns')
      .update({
        platform_campaign_id: metaCampaignId,
        status: 'active',
        performance_data: {
          meta_campaign_id: metaCampaignId,
          meta_adset_id: metaAdSetId,
          published_at: new Date().toISOString(),
          published_by: user.id,
          targeting_used: targeting,
        },
      })
      .eq('id', campaignId)

    return NextResponse.json({
      success: true,
      meta_campaign_id: metaCampaignId,
      meta_adset_id: metaAdSetId,
      message: 'Campanha e conjunto de anúncios criados no Meta Ads (PAUSADOS). Adicione os criativos no Ads Manager para ativar.',
    })
  } catch (error: any) {
    console.error('Publish campaign error:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
