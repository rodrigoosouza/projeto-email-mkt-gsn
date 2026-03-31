// Google Ads API v17 client
// Uses REST endpoints at https://googleads.googleapis.com/v17/

const GOOGLE_ADS_API_VERSION = 'v17'
const GOOGLE_ADS_API_BASE = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`

export interface GoogleAdsConfig {
  customer_id: string // format: 123-456-7890 (dashes stripped in API calls)
  developer_token: string
  access_token: string
}

interface CreateCampaignParams {
  name: string
  budget_daily: number // in BRL, will be converted to micros (amount * 1_000_000)
  campaign_type: 'SEARCH' | 'DISPLAY' | 'VIDEO'
  start_date?: string // YYYY-MM-DD
  end_date?: string // YYYY-MM-DD
}

interface CreateCampaignBudgetParams {
  name: string
  amount_micros: number
}

interface CreateAdGroupParams {
  name: string
  campaign_resource_name: string
  cpc_bid_micros?: number
}

interface CreateResponsiveSearchAdParams {
  ad_group_resource_name: string
  headlines: string[] // max 15, each max 30 chars
  descriptions: string[] // max 4, each max 90 chars
  final_urls: string[]
  path1?: string // max 15 chars
  path2?: string // max 15 chars
}

interface CreateKeywordsParams {
  ad_group_resource_name: string
  keywords: { text: string; match_type: 'BROAD' | 'PHRASE' | 'EXACT' }[]
}

interface SearchKeywordIdeasParams {
  keywords: string[]
  language?: string // default '1014' for PT-BR
  geo_target?: string // default '2076' for Brazil
}

interface KeywordIdea {
  text: string
  avg_monthly_searches: number
  competition: string
  low_top_of_page_bid_micros: number
  high_top_of_page_bid_micros: number
}

// ─── Auth Helper ─────────────────────────────────────────────────────────────

export async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('[GoogleAds] Missing OAuth2 credentials (GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN)')
    return null
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }).toString(),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[GoogleAds] Token refresh failed:', response.status, errorText)
      return null
    }

    const data = await response.json()
    return data.access_token || null
  } catch (error: any) {
    console.error('[GoogleAds] Token refresh error:', error.message)
    return null
  }
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

function stripDashes(customerId: string): string {
  return customerId.replace(/-/g, '')
}

function buildHeaders(config: GoogleAdsConfig): Record<string, string> {
  return {
    'Authorization': `Bearer ${config.access_token}`,
    'developer-token': config.developer_token,
    'Content-Type': 'application/json',
  }
}

async function googleAdsPost(
  url: string,
  headers: Record<string, string>,
  body: any
): Promise<any> {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  })

  const data = await response.json()

  if (!response.ok) {
    const errorDetail = data?.error?.message
      || data?.error?.details?.[0]?.errors?.[0]?.message
      || JSON.stringify(data)
    console.error('[GoogleAds] API Error:', response.status, errorDetail)

    if (response.status === 401) {
      console.error('[GoogleAds] Auth error — access token may be expired. Try refreshing.')
    }

    throw new Error(`Google Ads API Error (${response.status}): ${errorDetail}`)
  }

  return data
}

// ─── Campaign Budget ─────────────────────────────────────────────────────────

export async function createCampaignBudget(
  config: GoogleAdsConfig,
  params: CreateCampaignBudgetParams
): Promise<string | null> {
  const customerId = stripDashes(config.customer_id)
  const url = `${GOOGLE_ADS_API_BASE}/customers/${customerId}/campaignBudgets:mutate`

  try {
    const data = await googleAdsPost(url, buildHeaders(config), {
      operations: [
        {
          create: {
            name: params.name,
            amount_micros: String(params.amount_micros),
            delivery_method: 'STANDARD',
            explicitly_shared: false,
          },
        },
      ],
    })

    const resourceName = data?.results?.[0]?.resourceName
    console.log('[GoogleAds] Budget created:', resourceName)
    return resourceName || null
  } catch (error: any) {
    console.error('[GoogleAds] createCampaignBudget error:', error.message)
    return null
  }
}

// ─── Campaign ────────────────────────────────────────────────────────────────

export async function createCampaign(
  config: GoogleAdsConfig,
  params: CreateCampaignParams
): Promise<string | null> {
  const customerId = stripDashes(config.customer_id)
  const url = `${GOOGLE_ADS_API_BASE}/customers/${customerId}/campaigns:mutate`

  // First create a budget
  const amountMicros = Math.round(params.budget_daily * 1_000_000)
  const budgetResourceName = await createCampaignBudget(config, {
    name: `${params.name} - Budget`,
    amount_micros: amountMicros,
  })

  if (!budgetResourceName) {
    console.error('[GoogleAds] Failed to create budget for campaign')
    return null
  }

  const advertisingChannelType = params.campaign_type === 'DISPLAY'
    ? 'DISPLAY'
    : params.campaign_type === 'VIDEO'
    ? 'VIDEO'
    : 'SEARCH'

  const campaignBody: any = {
    name: params.name,
    advertising_channel_type: advertisingChannelType,
    status: 'PAUSED',
    campaign_budget: budgetResourceName,
    bidding_strategy_type: 'MAXIMIZE_CLICKS',
    network_settings: advertisingChannelType === 'SEARCH' ? {
      target_google_search: true,
      target_search_network: true,
      target_content_network: false,
    } : undefined,
  }

  if (params.start_date) {
    campaignBody.start_date = params.start_date.replace(/-/g, '')
  }
  if (params.end_date) {
    campaignBody.end_date = params.end_date.replace(/-/g, '')
  }

  try {
    const data = await googleAdsPost(url, buildHeaders(config), {
      operations: [{ create: campaignBody }],
    })

    const resourceName = data?.results?.[0]?.resourceName
    console.log('[GoogleAds] Campaign created:', resourceName)
    return resourceName || null
  } catch (error: any) {
    console.error('[GoogleAds] createCampaign error:', error.message)
    return null
  }
}

// ─── Ad Group ────────────────────────────────────────────────────────────────

export async function createAdGroup(
  config: GoogleAdsConfig,
  params: CreateAdGroupParams
): Promise<string | null> {
  const customerId = stripDashes(config.customer_id)
  const url = `${GOOGLE_ADS_API_BASE}/customers/${customerId}/adGroups:mutate`

  try {
    const data = await googleAdsPost(url, buildHeaders(config), {
      operations: [
        {
          create: {
            name: params.name,
            campaign: params.campaign_resource_name,
            status: 'ENABLED',
            type: 'SEARCH_STANDARD',
            cpc_bid_micros: params.cpc_bid_micros ? String(params.cpc_bid_micros) : undefined,
          },
        },
      ],
    })

    const resourceName = data?.results?.[0]?.resourceName
    console.log('[GoogleAds] Ad Group created:', resourceName)
    return resourceName || null
  } catch (error: any) {
    console.error('[GoogleAds] createAdGroup error:', error.message)
    return null
  }
}

// ─── Responsive Search Ad ────────────────────────────────────────────────────

export async function createResponsiveSearchAd(
  config: GoogleAdsConfig,
  params: CreateResponsiveSearchAdParams
): Promise<string | null> {
  const customerId = stripDashes(config.customer_id)
  const url = `${GOOGLE_ADS_API_BASE}/customers/${customerId}/adGroupAds:mutate`

  const headlines = params.headlines.slice(0, 15).map((text) => ({
    text: text.slice(0, 30),
  }))

  const descriptions = params.descriptions.slice(0, 4).map((text) => ({
    text: text.slice(0, 90),
  }))

  const adBody: any = {
    ad_group: params.ad_group_resource_name,
    status: 'ENABLED',
    ad: {
      responsive_search_ad: {
        headlines,
        descriptions,
        path1: params.path1?.slice(0, 15) || undefined,
        path2: params.path2?.slice(0, 15) || undefined,
      },
      final_urls: params.final_urls,
    },
  }

  try {
    const data = await googleAdsPost(url, buildHeaders(config), {
      operations: [{ create: adBody }],
    })

    const resourceName = data?.results?.[0]?.resourceName
    console.log('[GoogleAds] Responsive Search Ad created:', resourceName)
    return resourceName || null
  } catch (error: any) {
    console.error('[GoogleAds] createResponsiveSearchAd error:', error.message)
    return null
  }
}

// ─── Keywords ────────────────────────────────────────────────────────────────

export async function createKeywords(
  config: GoogleAdsConfig,
  params: CreateKeywordsParams
): Promise<string[] | null> {
  const customerId = stripDashes(config.customer_id)
  const url = `${GOOGLE_ADS_API_BASE}/customers/${customerId}/adGroupCriteria:mutate`

  const operations = params.keywords.map((kw) => ({
    create: {
      ad_group: params.ad_group_resource_name,
      status: 'ENABLED',
      keyword: {
        text: kw.text,
        match_type: kw.match_type,
      },
    },
  }))

  try {
    const data = await googleAdsPost(url, buildHeaders(config), { operations })

    const resourceNames = (data?.results || []).map((r: any) => r.resourceName)
    console.log('[GoogleAds] Keywords created:', resourceNames.length)
    return resourceNames
  } catch (error: any) {
    console.error('[GoogleAds] createKeywords error:', error.message)
    return null
  }
}

// ─── Keyword Ideas ───────────────────────────────────────────────────────────

export async function searchKeywordIdeas(
  config: GoogleAdsConfig,
  params: SearchKeywordIdeasParams
): Promise<KeywordIdea[] | null> {
  const customerId = stripDashes(config.customer_id)
  const url = `${GOOGLE_ADS_API_BASE}/customers/${customerId}:generateKeywordIdeas`

  const language = params.language || '1014' // PT-BR
  const geoTarget = params.geo_target || '2076' // Brazil

  try {
    const data = await googleAdsPost(url, buildHeaders(config), {
      keyword_seed: {
        keywords: params.keywords,
      },
      language: `languageConstants/${language}`,
      geo_target_constants: [`geoTargetConstants/${geoTarget}`],
      keyword_plan_network: 'GOOGLE_SEARCH',
    })

    const ideas: KeywordIdea[] = (data?.results || []).map((r: any) => ({
      text: r.text || r.keyword_idea_metrics?.text || '',
      avg_monthly_searches: Number(r.keyword_idea_metrics?.avg_monthly_searches || 0),
      competition: r.keyword_idea_metrics?.competition || 'UNSPECIFIED',
      low_top_of_page_bid_micros: Number(r.keyword_idea_metrics?.low_top_of_page_bid_micros || 0),
      high_top_of_page_bid_micros: Number(r.keyword_idea_metrics?.high_top_of_page_bid_micros || 0),
    }))

    console.log('[GoogleAds] Keyword ideas found:', ideas.length)
    return ideas
  } catch (error: any) {
    console.error('[GoogleAds] searchKeywordIdeas error:', error.message)
    return null
  }
}
