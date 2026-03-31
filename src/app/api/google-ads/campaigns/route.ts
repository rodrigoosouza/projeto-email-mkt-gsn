import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  getAccessToken,
  createCampaign,
  createAdGroup,
  createResponsiveSearchAd,
  createKeywords,
} from '@/lib/analytics/google-ads-client'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const {
      orgId,
      name,
      campaignType,
      budgetDaily,
      keywords,
      matchType,
      headlines,
      descriptions,
      finalUrl,
      path1,
      path2,
      startDate,
      endDate,
    } = await request.json()

    if (!orgId || !name) {
      return NextResponse.json({ error: 'orgId e name sao obrigatorios' }, { status: 400 })
    }

    // Get developer token
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
    if (!developerToken) {
      return NextResponse.json({ error: 'GOOGLE_ADS_DEVELOPER_TOKEN nao configurado' }, { status: 500 })
    }

    // Get access token from refresh token
    const accessToken = await getAccessToken()
    if (!accessToken) {
      return NextResponse.json({ error: 'Falha ao obter access token do Google Ads' }, { status: 500 })
    }

    const admin = createAdminClient()

    // Fetch Google Ads account config for this org
    // Try google_ads_accounts table first, fall back to checking ad_campaigns metadata
    let customerId: string | null = null

    const { data: googleAccount } = await admin
      .from('google_ads_accounts')
      .select('customer_id')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (googleAccount?.customer_id) {
      customerId = googleAccount.customer_id
    }

    if (!customerId) {
      return NextResponse.json(
        { error: 'Conta Google Ads nao configurada para esta organizacao. Adicione o Customer ID nas configuracoes.' },
        { status: 400 }
      )
    }

    const config = {
      customer_id: customerId,
      developer_token: developerToken,
      access_token: accessToken,
    }

    // Validate budget
    const dailyBudget = Number(budgetDaily || 0)
    if (dailyBudget < 5) {
      return NextResponse.json({ error: 'Orcamento diario minimo e R$ 5,00' }, { status: 400 })
    }

    // 1. Create Campaign (includes budget creation)
    const gadsType = campaignType === 'DISPLAY' ? 'DISPLAY' : campaignType === 'VIDEO' ? 'VIDEO' : 'SEARCH'
    const campaignResourceName = await createCampaign(config, {
      name,
      budget_daily: dailyBudget,
      campaign_type: gadsType,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    })

    if (!campaignResourceName) {
      return NextResponse.json({ error: 'Falha ao criar campanha no Google Ads' }, { status: 500 })
    }

    // 2. Create Ad Group
    const adGroupResourceName = await createAdGroup(config, {
      name: `${name} - Grupo`,
      campaign_resource_name: campaignResourceName,
    })

    if (!adGroupResourceName) {
      return NextResponse.json({
        error: 'Campanha criada mas falhou ao criar grupo de anuncios',
        campaign_resource_name: campaignResourceName,
      }, { status: 500 })
    }

    // 3. Create Responsive Search Ad (if headlines/descriptions provided)
    let adResourceName: string | null = null
    if (headlines?.length >= 3 && descriptions?.length >= 2 && finalUrl) {
      adResourceName = await createResponsiveSearchAd(config, {
        ad_group_resource_name: adGroupResourceName,
        headlines,
        descriptions,
        final_urls: [finalUrl],
        path1: path1 || undefined,
        path2: path2 || undefined,
      })
    }

    // 4. Create Keywords (if provided)
    let keywordResourceNames: string[] | null = null
    if (keywords?.length > 0 && adGroupResourceName) {
      const keywordEntries = keywords.map((text: string) => ({
        text,
        match_type: matchType || 'BROAD',
      }))
      keywordResourceNames = await createKeywords(config, {
        ad_group_resource_name: adGroupResourceName,
        keywords: keywordEntries,
      })
    }

    // 5. Save to ad_campaigns table
    const { data: savedCampaign, error: saveError } = await admin
      .from('ad_campaigns')
      .insert({
        org_id: orgId,
        name,
        platform: 'google_ads',
        campaign_type: campaignType === 'DISPLAY' ? 'awareness' : campaignType === 'VIDEO' ? 'engagement' : 'traffic',
        status: 'active',
        objective: campaignType,
        budget_daily: dailyBudget,
        start_date: startDate || null,
        end_date: endDate || null,
        platform_campaign_id: campaignResourceName,
        target_audience: {
          keywords: keywords || [],
          match_type: matchType || 'BROAD',
        },
        ad_creatives: headlines && descriptions ? [{
          headline: headlines[0] || '',
          description: descriptions[0] || '',
          image_prompt: '',
          cta: 'Saiba Mais',
        }] : [],
        copy_variants: [],
        landing_page_url: finalUrl || null,
        performance_data: {
          google_campaign: campaignResourceName,
          google_ad_group: adGroupResourceName,
          google_ad: adResourceName,
          google_keywords: keywordResourceNames,
          published_at: new Date().toISOString(),
          published_by: user.id,
        },
        ai_generated: false,
        created_by: user.id,
      })
      .select()
      .single()

    if (saveError) {
      console.error('[GoogleAds] Save to DB error:', saveError)
    }

    return NextResponse.json({
      success: true,
      campaign_id: savedCampaign?.id,
      campaign_resource_name: campaignResourceName,
      ad_group_resource_name: adGroupResourceName,
      ad_resource_name: adResourceName,
      keywords_created: keywordResourceNames?.length || 0,
      message: 'Campanha Google Ads criada com sucesso (PAUSADA).',
    })
  } catch (error: any) {
    console.error('[GoogleAds] Create campaign error:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')

    if (!orgId) {
      return NextResponse.json({ error: 'orgId e obrigatorio' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('ad_campaigns')
      .select('*')
      .eq('org_id', orgId)
      .eq('platform', 'google_ads')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ campaigns: data || [] })
  } catch (error: any) {
    console.error('[GoogleAds] List campaigns error:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
