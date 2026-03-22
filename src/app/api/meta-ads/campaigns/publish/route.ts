import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  createCampaign,
  createAdSet,
  createAdCreative,
  createAd,
  deleteCampaign,
  buildMetaTargeting,
  resolveInterests,
  uploadImageFromUrl,
} from '@/lib/analytics/meta-ads-client'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const {
      campaignId, pageId, linkUrl, pixelId, placementPreset, conversionLocation, customAudiences,
      nameCampaign, nameAdSet, nameAd,
      imageUrl, videoUrl,
    } = await request.json()
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

    // 2. Fetch Meta account for this org (pick the main one, not read-only)
    const { data: metaAccounts } = await admin
      .from('meta_ad_accounts')
      .select('access_token, ad_account_id, ad_account_name, metadata')
      .eq('org_id', campaign.org_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    // Prefer the account without "Read-Only" in name
    const metaAccount = metaAccounts?.find(a => !a.ad_account_name?.includes('Read-Only'))
      || metaAccounts?.[0]

    if (!metaAccount) {
      return NextResponse.json({ error: 'Conta Meta Ads não configurada ou inativa para esta organização' }, { status: 400 })
    }

    const config = {
      access_token: metaAccount.access_token,
      ad_account_id: metaAccount.ad_account_id.startsWith('act_')
        ? metaAccount.ad_account_id
        : `act_${metaAccount.ad_account_id}`,
    }

    const fbPageId = pageId || (metaAccount.metadata as any)?.page_id || ''
    const destinationUrl = linkUrl || 'https://demonstracao.orbitgestao.com.br'

    // Build naming convention
    const objectiveLabels: Record<string, string> = {
      lead_generation: 'Lead', traffic: 'Trafego', awareness: 'Awareness',
      conversion: 'Conversao', engagement: 'Engajamento', retargeting: 'Retargeting',
    }
    const objLabel = objectiveLabels[campaign.campaign_type] || 'Lead'
    const placementLabel = (!placementPreset || placementPreset === 'automatic') ? 'Automatico' : 'Manual'
    const ageLabel = `${campaign.target_audience?.age_min || 25}-${campaign.target_audience?.age_max || 55}`
    const audienceType = customAudiences?.length > 0 ? 'Custom' : 'Interesses'

    const finalCampaignName = nameCampaign || `[Rodrigo][${placementLabel}][${objLabel}]`
    const finalAdSetName = nameAdSet || `00-[${placementLabel}][${ageLabel}][${audienceType}]`
    const finalAdPrefix = nameAd || `${objLabel}`

    // 3. Validate budget
    const dailyBudget = Number(campaign.budget_daily || 0)
    if (dailyBudget < 5) {
      return NextResponse.json({ error: 'Orçamento diário mínimo é R$ 5,00' }, { status: 400 })
    }

    // 4. Resolve interest targeting (text → Meta IDs)
    const targetAudience = campaign.target_audience || {}
    let interestIds: { id: string; name: string }[] = []
    if (targetAudience.interests && targetAudience.interests.length > 0) {
      try {
        interestIds = await resolveInterests(config.access_token, targetAudience.interests)
      } catch {
        // Continue without interests if resolution fails
      }
    }

    // 5. Build targeting with resolved interests + custom audiences
    const targetingInput = {
      ...targetAudience,
      interest_ids: interestIds.length > 0 ? interestIds : undefined,
      custom_audiences: customAudiences || undefined,
    }
    const targeting = buildMetaTargeting(targetingInput)

    // 6. Create campaign on Meta
    let metaCampaignId: string
    try {
      metaCampaignId = await createCampaign(config, {
        name: finalCampaignName,
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

    // 7. Create ad set on Meta
    let metaAdSetId: string
    try {
      metaAdSetId = await createAdSet(config, {
        name: finalAdSetName,
        campaignId: metaCampaignId,
        campaignType: campaign.campaign_type,
        dailyBudget,
        targeting,
        startTime: campaign.start_date || undefined,
        endTime: campaign.end_date || undefined,
        pixelId: pixelId || undefined,
        placementPreset: placementPreset || 'feed_stories_reels',
        conversionLocation: conversionLocation || 'WEBSITE',
      })
    } catch (error: any) {
      try { await deleteCampaign(config, metaCampaignId) } catch { /* ignore */ }

      await admin
        .from('ad_campaigns')
        .update({ status: 'failed', performance_data: { error: error.message, step: 'create_adset', meta_campaign_id: metaCampaignId } })
        .eq('id', campaignId)

      return NextResponse.json({ error: `Erro ao criar conjunto de anúncios: ${error.message}` }, { status: 500 })
    }

    // 8. Upload image if provided
    let uploadedImageHash: string | undefined
    if (imageUrl) {
      try {
        const uploaded = await uploadImageFromUrl(config, imageUrl)
        uploadedImageHash = uploaded.hash
      } catch (error: any) {
        console.error('Image upload failed:', error.message)
        // Continue without image — will create ad without it if page is set
      }
    }

    // 9. Create ads from copy_variants (if page ID available)
    const createdAds: { name: string; ad_id: string; creative_id: string }[] = []
    const adErrors: { ad: number; error: string }[] = []
    const copyVariants = campaign.copy_variants || []

    if (fbPageId && copyVariants.length > 0) {
      for (let i = 0; i < copyVariants.length; i++) {
        const variant = copyVariants[i]
        try {
          const creativeId = await createAdCreative(config, {
            name: `${finalAdPrefix} - Creative ${String(i + 1).padStart(2, '0')}`,
            pageId: fbPageId,
            imageHash: uploadedImageHash,
            imageUrl: !uploadedImageHash && imageUrl ? imageUrl : undefined,
            videoId: videoUrl || undefined, // Note: for videos, user needs to provide the Meta video ID
            headline: variant.headline || campaign.name,
            primaryText: variant.primary_text || variant.description || '',
            description: variant.description || '',
            cta: variant.cta || 'Saiba Mais',
            linkUrl: destinationUrl,
          })

          const adId = await createAd(config, {
            name: `${finalAdPrefix} - Ad ${String(i + 1).padStart(2, '0')}`,
            adSetId: metaAdSetId,
            creativeId,
          })

          createdAds.push({ name: `Ad ${i + 1}`, ad_id: adId, creative_id: creativeId })
        } catch (error: any) {
          console.error(`Failed to create ad ${i + 1}:`, error.message)
          adErrors.push({ ad: i + 1, error: error.message })
        }
      }
    } else if (fbPageId && (uploadedImageHash || imageUrl)) {
      // No copy variants but has image — create one ad with campaign name
      try {
        const creativeId = await createAdCreative(config, {
          name: `${finalAdPrefix} - Creative 01`,
          pageId: fbPageId,
          imageHash: uploadedImageHash,
          imageUrl: !uploadedImageHash ? imageUrl : undefined,
          headline: campaign.name,
          primaryText: campaign.objective || campaign.name,
          cta: 'Saiba Mais',
          linkUrl: destinationUrl,
        })

        const adId = await createAd(config, {
          name: `${finalAdPrefix} - Ad 01`,
          adSetId: metaAdSetId,
          creativeId,
        })

        createdAds.push({ name: 'Ad 1', ad_id: adId, creative_id: creativeId })
      } catch (error: any) {
        console.error('Failed to create ad:', error.message)
      }
    }

    // 9. Update campaign in database
    await admin
      .from('ad_campaigns')
      .update({
        platform_campaign_id: metaCampaignId,
        status: 'active',
        performance_data: {
          meta_campaign_id: metaCampaignId,
          meta_adset_id: metaAdSetId,
          meta_ads: createdAds,
          ad_errors: adErrors.length > 0 ? adErrors : undefined,
          image_hash: uploadedImageHash || undefined,
          interests_resolved: interestIds,
          published_at: new Date().toISOString(),
          published_by: user.id,
          targeting_used: targeting,
          page_id: fbPageId,
          link_url: destinationUrl,
        },
      })
      .eq('id', campaignId)

    const adsMsg = createdAds.length > 0
      ? `${createdAds.length} anúncio(s) criado(s).`
      : 'Anúncios não criados — adicione criativos no Ads Manager.'
    const errMsg = adErrors.length > 0
      ? ` Erros: ${adErrors.map(e => e.error).join('; ')}`
      : ''

    return NextResponse.json({
      success: true,
      meta_campaign_id: metaCampaignId,
      meta_adset_id: metaAdSetId,
      ads_created: createdAds.length,
      ad_errors: adErrors,
      interests_resolved: interestIds.length,
      message: `Campanha publicada no Meta Ads (PAUSADA). ${adsMsg}${errMsg}`,
    })
  } catch (error: any) {
    console.error('Publish campaign error:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
