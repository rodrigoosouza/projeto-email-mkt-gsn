// Meta (Facebook) Marketing API client
// Uses Graph API v22.0 with time_increment=1 for daily data

const META_API_VERSION = 'v22.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

export interface MetaAdsConfig {
  access_token: string
  ad_account_id: string // format: act_123456
}

interface MetaInsightsParams {
  time_range: { since: string; until: string }
  fields: string[]
  level?: 'account' | 'campaign' | 'adset' | 'ad'
  limit?: number
  time_increment?: number
}

interface MetaPagingCursors {
  before?: string
  after?: string
}

interface MetaPaging {
  cursors?: MetaPagingCursors
  next?: string
}

interface MetaApiResponse {
  data: any[]
  paging?: MetaPaging
}

async function fetchMeta(url: string): Promise<MetaApiResponse> {
  const response = await fetch(url)
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Meta Ads API error: ${response.status} - ${error}`)
  }
  return response.json()
}

// Fetch all pages from a paginated Meta API response
async function fetchAllPages(url: string): Promise<any[]> {
  const allData: any[] = []
  let nextUrl: string | undefined = url

  while (nextUrl) {
    const response = await fetchMeta(nextUrl)
    allData.push(...(response.data || []))
    nextUrl = response.paging?.next
  }

  return allData
}

export async function getInsights(config: MetaAdsConfig, params: MetaInsightsParams) {
  const queryParams = new URLSearchParams({
    access_token: config.access_token,
    fields: params.fields.join(','),
    time_range: JSON.stringify(params.time_range),
    level: params.level || 'account',
    limit: String(params.limit || 500),
    time_increment: String(params.time_increment || 1),
  })

  return fetchAllPages(
    `${META_API_BASE}/${config.ad_account_id}/insights?${queryParams}`
  )
}

export async function getCampaigns(config: MetaAdsConfig) {
  const queryParams = new URLSearchParams({
    access_token: config.access_token,
    fields: 'id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time,bid_strategy',
    limit: '500',
  })

  return fetchAllPages(
    `${META_API_BASE}/${config.ad_account_id}/campaigns?${queryParams}`
  )
}

export async function getAdSets(config: MetaAdsConfig) {
  const queryParams = new URLSearchParams({
    access_token: config.access_token,
    fields: 'id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget,bid_strategy,optimization_goal,billing_event,targeting,start_time,end_time',
    limit: '500',
  })

  return fetchAllPages(
    `${META_API_BASE}/${config.ad_account_id}/adsets?${queryParams}`
  )
}

export async function getAds(config: MetaAdsConfig) {
  const queryParams = new URLSearchParams({
    access_token: config.access_token,
    fields: 'id,name,campaign_id,adset_id,status,effective_status,creative{id,name,title,body,call_to_action_type,image_url,thumbnail_url,video_id,link_url,object_story_spec}',
    limit: '500',
  })

  return fetchAllPages(
    `${META_API_BASE}/${config.ad_account_id}/ads?${queryParams}`
  )
}

// Get creative thumbnail by creative ID
export async function getCreativeThumbnail(accessToken: string, creativeId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${META_API_BASE}/${creativeId}?fields=thumbnail_url,image_url&access_token=${accessToken}`
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.thumbnail_url || data.image_url || null
  } catch {
    return null
  }
}

// Daily insights by campaign
export async function getCampaignInsightsDaily(config: MetaAdsConfig, since: string, until: string) {
  return getInsights(config, {
    time_range: { since, until },
    fields: [
      'campaign_id', 'campaign_name',
      'spend', 'impressions', 'reach', 'clicks',
      'cpc', 'cpm', 'ctr', 'frequency',
      'actions', 'cost_per_action_type',
      'video_play_actions', 'video_p25_watched_actions',
      'video_p50_watched_actions', 'video_p75_watched_actions',
      'video_p100_watched_actions',
    ],
    level: 'campaign',
    time_increment: 1,
  })
}

// Daily insights by adset
export async function getAdSetInsightsDaily(config: MetaAdsConfig, since: string, until: string) {
  return getInsights(config, {
    time_range: { since, until },
    fields: [
      'adset_id', 'adset_name',
      'spend', 'impressions', 'reach', 'clicks',
      'cpc', 'cpm', 'ctr',
      'actions', 'cost_per_action_type',
    ],
    level: 'adset',
    time_increment: 1,
  })
}

// Daily insights by ad
export async function getAdInsightsDaily(config: MetaAdsConfig, since: string, until: string) {
  return getInsights(config, {
    time_range: { since, until },
    fields: [
      'ad_id', 'ad_name',
      'spend', 'impressions', 'reach', 'clicks',
      'cpc', 'cpm', 'ctr',
      'actions', 'cost_per_action_type',
    ],
    level: 'ad',
    time_increment: 1,
  })
}

// Helper: extract lead count from Meta actions array
export function extractLeads(actions: any[] | undefined): number {
  if (!actions) return 0
  // Meta uses different action types for leads depending on campaign type
  const leadTypes = [
    'lead',
    'onsite_web_lead',
    'onsite_conversion.lead_grouped',
    'offsite_conversion.fb_pixel_lead',
  ]
  for (const type of leadTypes) {
    const action = actions.find((a: any) => a.action_type === type)
    if (action) return parseInt(action.value, 10)
  }
  return 0
}

// Helper: extract cost per lead from cost_per_action_type array
export function extractCostPerLead(costPerActionType: any[] | undefined): number {
  if (!costPerActionType) return 0
  const leadTypes = [
    'lead',
    'onsite_web_lead',
    'onsite_conversion.lead_grouped',
    'offsite_conversion.fb_pixel_lead',
  ]
  for (const type of leadTypes) {
    const action = costPerActionType.find((a: any) => a.action_type === type)
    if (action) return parseFloat(action.value)
  }
  return 0
}

// Helper: extract link clicks from actions
export function extractLinkClicks(actions: any[] | undefined): number {
  if (!actions) return 0
  const linkClick = actions.find((a: any) => a.action_type === 'link_click')
  return linkClick ? parseInt(linkClick.value, 10) : 0
}

// Helper: extract conversions from actions
export function extractConversions(actions: any[] | undefined): number {
  if (!actions) return 0
  const conversion = actions.find(
    (a: any) => a.action_type === 'offsite_conversion' || a.action_type === 'purchase'
  )
  return conversion ? parseInt(conversion.value, 10) : 0
}

// Helper: extract video views from video_play_actions
export function extractVideoViews(videoPlayActions: any[] | undefined): number {
  if (!videoPlayActions) return 0
  const view = videoPlayActions.find((a: any) => a.action_type === 'video_view')
  return view ? parseInt(view.value, 10) : 0
}

// Helper: extract video percentage views
export function extractVideoPercent(actions: any[] | undefined): number {
  if (!actions || actions.length === 0) return 0
  return parseInt(actions[0]?.value || '0', 10)
}

// === CAMPAIGN CREATION ===

// Objective mapping: our campaign_type → Meta objective
export const CAMPAIGN_TYPE_TO_META_OBJECTIVE: Record<string, string> = {
  lead_generation: 'OUTCOME_LEADS',
  traffic: 'OUTCOME_TRAFFIC',
  awareness: 'OUTCOME_AWARENESS',
  conversion: 'OUTCOME_SALES',
  engagement: 'OUTCOME_ENGAGEMENT',
  retargeting: 'OUTCOME_SALES',
}

// Optimization goal mapping
// Note: LEAD_GENERATION is deprecated for OUTCOME_LEADS campaigns — use OFFSITE_CONVERSIONS
export const CAMPAIGN_TYPE_TO_OPTIMIZATION_GOAL: Record<string, string> = {
  lead_generation: 'OFFSITE_CONVERSIONS',
  traffic: 'LINK_CLICKS',
  awareness: 'REACH',
  conversion: 'OFFSITE_CONVERSIONS',
  engagement: 'POST_ENGAGEMENT',
  retargeting: 'OFFSITE_CONVERSIONS',
}

// POST helper for Meta Graph API
async function postMeta(url: string, params: Record<string, string>): Promise<any> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  })
  const data = await response.json()
  if (data.error) {
    const msg = data.error.message || 'Unknown error'
    const code = data.error.code || 0
    const subcode = data.error.error_subcode || ''
    const fbTraceId = data.error.fbtrace_id || ''
    console.error('[Meta API Error]', JSON.stringify(data.error, null, 2))
    throw new Error(`Meta API Error: ${msg} (code: ${code}${subcode ? `, subcode: ${subcode}` : ''}${fbTraceId ? `, trace: ${fbTraceId}` : ''})`)
  }
  return data
}

// Build Meta targeting spec from our target_audience JSON
export function buildMetaTargeting(targetAudience: any): Record<string, any> {
  const targeting: Record<string, any> = {}

  // Geo — support countries, regions (states), cities
  const locations = targetAudience?.locations || ['Brasil']
  const countryMap: Record<string, string> = { 'Brasil': 'BR', 'Brazil': 'BR', 'USA': 'US', 'Estados Unidos': 'US' }
  const geoLocations: Record<string, any> = {}

  // Check if we have region keys (states)
  if (targetAudience?.regions && targetAudience.regions.length > 0) {
    geoLocations.regions = targetAudience.regions // [{ key: "3847" }] format
  } else if (targetAudience?.cities && targetAudience.cities.length > 0) {
    geoLocations.cities = targetAudience.cities // [{ key: "123", radius: 40 }] format
  } else {
    const countries = locations.map((l: string) => countryMap[l] || 'BR')
    geoLocations.countries = countries
  }
  targeting.geo_locations = geoLocations

  // Age
  targeting.age_min = targetAudience?.age_min || 25
  targeting.age_max = targetAudience?.age_max || 55

  // Gender (0=all, 1=male, 2=female)
  if (targetAudience?.gender === 'male') targeting.genders = [1]
  else if (targetAudience?.gender === 'female') targeting.genders = [2]

  // Interest targeting (resolved IDs from searchInterests)
  if (targetAudience?.interest_ids && targetAudience.interest_ids.length > 0) {
    targeting.flexible_spec = [{
      interests: targetAudience.interest_ids.map((i: { id: string; name: string }) => ({
        id: i.id,
        name: i.name,
      })),
    }]
  }

  // Custom audiences (remarketing, lookalike, etc)
  if (targetAudience?.custom_audiences && targetAudience.custom_audiences.length > 0) {
    targeting.custom_audiences = targetAudience.custom_audiences.map((id: string) => ({ id }))
  }

  // Excluded custom audiences
  if (targetAudience?.excluded_custom_audiences && targetAudience.excluded_custom_audiences.length > 0) {
    targeting.excluded_custom_audiences = targetAudience.excluded_custom_audiences.map((id: string) => ({ id }))
  }

  // Required by Meta: Advantage+ audience flag (0 = disabled, use manual targeting)
  targeting.targeting_automation = { advantage_audience: 0 }

  return targeting
}

// Placement positions mapping
export const PLACEMENT_PRESETS: Record<string, any> = {
  automatic: {}, // Meta Advantage+ placements (empty = auto)
  feed_only: {
    publisher_platforms: ['facebook', 'instagram'],
    facebook_positions: ['feed'],
    instagram_positions: ['stream'],
  },
  feed_stories: {
    publisher_platforms: ['facebook', 'instagram'],
    facebook_positions: ['feed', 'story'],
    instagram_positions: ['stream', 'story', 'reels'],
  },
  feed_stories_reels: {
    publisher_platforms: ['facebook', 'instagram'],
    facebook_positions: ['feed', 'story', 'marketplace'],
    instagram_positions: ['stream', 'story', 'reels', 'explore'],
  },
  instagram_only: {
    publisher_platforms: ['instagram'],
    instagram_positions: ['stream', 'story', 'reels', 'explore'],
  },
  stories_reels: {
    publisher_platforms: ['facebook', 'instagram'],
    facebook_positions: ['story'],
    instagram_positions: ['story', 'reels'],
  },
}

// Conversion event mapping by campaign type
export const CAMPAIGN_TYPE_TO_CONVERSION_EVENT: Record<string, string> = {
  lead_generation: 'Lead',
  conversion: 'Purchase',
  traffic: 'ViewContent',
  retargeting: 'Lead',
}

// Get custom audiences from an ad account
export async function getCustomAudiences(config: MetaAdsConfig): Promise<{ id: string; name: string; subtype: string }[]> {
  const params = new URLSearchParams({
    access_token: config.access_token,
    fields: 'id,name,subtype',
    limit: '100',
  })
  const data = await fetchAllPages(`${META_API_BASE}/${config.ad_account_id}/customaudiences?${params}`)
  return data.map((a: any) => ({ id: a.id, name: a.name, subtype: a.subtype }))
}

// Get pixel/dataset ID from ad account
export async function getPixels(config: MetaAdsConfig): Promise<{ id: string; name: string }[]> {
  const params = new URLSearchParams({
    access_token: config.access_token,
    fields: 'id,name',
  })
  const data = await fetchAllPages(`${META_API_BASE}/${config.ad_account_id}/adspixels?${params}`)
  return data.map((p: any) => ({ id: p.id, name: p.name }))
}

// Get Facebook pages linked to ad account
export async function getPromotePages(config: MetaAdsConfig): Promise<{ id: string; name: string }[]> {
  const params = new URLSearchParams({
    access_token: config.access_token,
    fields: 'id,name',
  })
  const data = await fetchAllPages(`${META_API_BASE}/${config.ad_account_id}/promote_pages?${params}`)
  return data.map((p: any) => ({ id: p.id, name: p.name }))
}

// Search for interest targeting options (text → Meta interest IDs)
export async function searchInterests(
  accessToken: string,
  query: string
): Promise<{ id: string; name: string; audience_size_lower_bound: number; audience_size_upper_bound: number }[]> {
  const params = new URLSearchParams({
    access_token: accessToken,
    type: 'adinterest',
    q: query,
    limit: '10',
  })

  const response = await fetch(`${META_API_BASE}/search?${params}`)
  const data = await response.json()

  if (data.error) {
    throw new Error(`Meta Search API Error: ${data.error.message}`)
  }

  return (data.data || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    audience_size_lower_bound: item.audience_size_lower_bound || 0,
    audience_size_upper_bound: item.audience_size_upper_bound || 0,
  }))
}

// Resolve interest text strings to Meta IDs (batch)
export async function resolveInterests(
  accessToken: string,
  interestTexts: string[]
): Promise<{ id: string; name: string }[]> {
  const resolved: { id: string; name: string }[] = []
  for (const text of interestTexts) {
    try {
      const results = await searchInterests(accessToken, text)
      if (results.length > 0) {
        // Pick the best match (first result usually most relevant)
        resolved.push({ id: results[0].id, name: results[0].name })
      }
    } catch {
      // Skip interests that can't be resolved
    }
  }
  return resolved
}

// Upload image from URL to Meta ad account (returns image hash)
export async function uploadImageFromUrl(
  config: MetaAdsConfig,
  imageUrl: string
): Promise<{ hash: string; url: string }> {
  const body: Record<string, string> = {
    access_token: config.access_token,
    url: imageUrl,
  }

  const result = await postMeta(
    `${META_API_BASE}/${config.ad_account_id}/adimages`,
    body
  )

  // Response: { images: { bytes: { hash, url } } }
  const images = result.images
  const firstKey = Object.keys(images)[0]
  return {
    hash: images[firstKey].hash,
    url: images[firstKey].url,
  }
}

// Create an ad creative on Meta
export async function createAdCreative(
  config: MetaAdsConfig,
  params: {
    name: string
    pageId: string // Facebook Page ID
    imageHash?: string
    imageUrl?: string
    videoId?: string
    headline: string
    primaryText: string
    description?: string
    cta: string
    linkUrl: string
  }
): Promise<string> {
  const ctaMap: Record<string, string> = {
    'Saiba Mais': 'LEARN_MORE',
    'Cadastre-se': 'SIGN_UP',
    'Inscrever-se': 'SIGN_UP',
    'Quero o Teste': 'SIGN_UP',
    'Descobrir Como': 'LEARN_MORE',
    'Garantir Vaga': 'SIGN_UP',
    'Agendar': 'BOOK_TRAVEL',
    'Comprar': 'SHOP_NOW',
    'Baixar': 'DOWNLOAD',
    'Contato': 'CONTACT_US',
  }

  const ctaType = ctaMap[params.cta] || 'LEARN_MORE'

  const objectStorySpec: Record<string, any> = {
    page_id: params.pageId,
    link_data: {
      message: params.primaryText,
      link: params.linkUrl,
      name: params.headline,
      description: params.description || '',
      call_to_action: { type: ctaType, value: { link: params.linkUrl } },
    },
  }

  if (params.imageHash) {
    objectStorySpec.link_data.image_hash = params.imageHash
  } else if (params.imageUrl) {
    objectStorySpec.link_data.picture = params.imageUrl
  }

  if (params.videoId) {
    objectStorySpec.video_data = {
      video_id: params.videoId,
      message: params.primaryText,
      title: params.headline,
      call_to_action: { type: ctaType, value: { link: params.linkUrl } },
    }
    delete objectStorySpec.link_data
  }

  const body: Record<string, string> = {
    access_token: config.access_token,
    name: params.name,
    object_story_spec: JSON.stringify(objectStorySpec),
  }

  const result = await postMeta(
    `${META_API_BASE}/${config.ad_account_id}/adcreatives`,
    body
  )

  return result.id
}

// Create an ad on Meta (connects creative to adset)
export async function createAd(
  config: MetaAdsConfig,
  params: {
    name: string
    adSetId: string
    creativeId: string
  }
): Promise<string> {
  const body: Record<string, string> = {
    access_token: config.access_token,
    name: params.name,
    adset_id: params.adSetId,
    creative: JSON.stringify({ creative_id: params.creativeId }),
    status: 'PAUSED',
  }

  const result = await postMeta(
    `${META_API_BASE}/${config.ad_account_id}/ads`,
    body
  )

  return result.id
}

// Create a campaign on Meta Ads (returns campaign ID)
export async function createCampaign(
  config: MetaAdsConfig,
  params: {
    name: string
    campaignType: string
    dailyBudget?: number // in BRL (e.g. 80.00)
    startTime?: string // ISO date
    stopTime?: string  // ISO date
  }
): Promise<string> {
  const objective = CAMPAIGN_TYPE_TO_META_OBJECTIVE[params.campaignType] || 'OUTCOME_LEADS'

  const body: Record<string, string> = {
    access_token: config.access_token,
    name: params.name,
    objective,
    status: 'PAUSED',
    special_ad_categories: '[]',
    // Budget is set at adset level, so we must specify these flags
    is_adset_budget_sharing_enabled: 'true',
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
  }

  const result = await postMeta(
    `${META_API_BASE}/${config.ad_account_id}/campaigns`,
    body
  )

  return result.id
}

// Create an ad set on Meta Ads (returns adset ID)
export async function createAdSet(
  config: MetaAdsConfig,
  params: {
    name: string
    campaignId: string
    campaignType: string
    dailyBudget: number // in BRL
    targeting: Record<string, any>
    startTime?: string
    endTime?: string
    pixelId?: string  // dataset/pixel for conversion tracking
    placementPreset?: string // key from PLACEMENT_PRESETS
    conversionLocation?: string // WEBSITE, APP, MESSAGING, INSTANT_FORM
  }
): Promise<string> {
  const optimizationGoal = CAMPAIGN_TYPE_TO_OPTIMIZATION_GOAL[params.campaignType] || 'LEAD_GENERATION'

  // Default start time: 1 hour from now (Meta requires future date)
  const defaultStart = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  const body: Record<string, string> = {
    access_token: config.access_token,
    name: params.name,
    campaign_id: params.campaignId,
    status: 'PAUSED',
    daily_budget: String(Math.round(params.dailyBudget * 100)),
    billing_event: 'IMPRESSIONS',
    optimization_goal: optimizationGoal,
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    targeting: JSON.stringify(params.targeting),
    start_time: params.startTime || defaultStart,
  }

  if (params.endTime) body.end_time = params.endTime

  // Pixel / Dataset for conversion tracking
  if (params.pixelId) {
    const convEvent = CAMPAIGN_TYPE_TO_CONVERSION_EVENT[params.campaignType] || 'Lead'
    body.promoted_object = JSON.stringify({
      pixel_id: params.pixelId,
      custom_event_type: convEvent === 'Lead' ? 'LEAD' : convEvent === 'Purchase' ? 'PURCHASE' : 'OTHER',
    })
  }

  // Conversion location (destination_type)
  if (params.conversionLocation) {
    body.destination_type = params.conversionLocation
  }

  // Placements
  const placementKey = params.placementPreset || 'automatic'
  const placements = PLACEMENT_PRESETS[placementKey]
  if (placements && Object.keys(placements).length > 0) {
    if (placements.publisher_platforms) body.publisher_platforms = JSON.stringify(placements.publisher_platforms)
    if (placements.facebook_positions) body.facebook_positions = JSON.stringify(placements.facebook_positions)
    if (placements.instagram_positions) body.instagram_positions = JSON.stringify(placements.instagram_positions)
  }

  const result = await postMeta(
    `${META_API_BASE}/${config.ad_account_id}/adsets`,
    body
  )

  return result.id
}

// Delete a campaign on Meta (for cleanup on partial failure)
export async function deleteCampaign(config: MetaAdsConfig, campaignId: string): Promise<void> {
  await postMeta(`${META_API_BASE}/${campaignId}`, {
    access_token: config.access_token,
    status: 'DELETED',
  })
}

// Alias for backwards compatibility with /api/analytics/sync
export async function getCampaignInsights(config: MetaAdsConfig, since: string, until: string) {
  return getInsights(config, {
    time_range: { since, until },
    fields: ['campaign_name', 'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'actions', 'cost_per_action_type'],
    level: 'campaign',
    time_increment: 0,
  })
}

// Pre-built report functions (kept for backwards compatibility)
export async function getAccountOverview(config: MetaAdsConfig, since: string, until: string) {
  return getInsights(config, {
    time_range: { since, until },
    fields: ['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'reach', 'actions'],
    level: 'account',
    time_increment: 0,
  })
}
