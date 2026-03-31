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
    fields: 'id,name,campaign_id,adset_id,status,effective_status,creative{id,image_url,thumbnail_url}',
    limit: '200',
    filtering: JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED'] }]),
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

// === CAMPAIGN CREATION (Meta Marketing API) ===

export const CAMPAIGN_TYPE_TO_META_OBJECTIVE: Record<string, string> = {
  lead_generation: 'OUTCOME_LEADS',
  traffic: 'OUTCOME_TRAFFIC',
  awareness: 'OUTCOME_AWARENESS',
  conversion: 'OUTCOME_SALES',
  engagement: 'OUTCOME_ENGAGEMENT',
  retargeting: 'OUTCOME_SALES',
}

export const CAMPAIGN_TYPE_TO_OPTIMIZATION_GOAL: Record<string, string> = {
  lead_generation: 'OFFSITE_CONVERSIONS',
  traffic: 'LINK_CLICKS',
  awareness: 'REACH',
  conversion: 'OFFSITE_CONVERSIONS',
  engagement: 'POST_ENGAGEMENT',
  retargeting: 'OFFSITE_CONVERSIONS',
}

export const CAMPAIGN_TYPE_TO_CONVERSION_EVENT: Record<string, string> = {
  lead_generation: 'Lead',
  conversion: 'Purchase',
  traffic: 'ViewContent',
  retargeting: 'Lead',
}

export const PLACEMENT_PRESETS: Record<string, any> = {
  automatic: {},
  feed_only: { publisher_platforms: ['facebook', 'instagram'], facebook_positions: ['feed'], instagram_positions: ['stream'] },
  feed_stories: { publisher_platforms: ['facebook', 'instagram'], facebook_positions: ['feed', 'story'], instagram_positions: ['stream', 'story', 'reels'] },
  feed_stories_reels: { publisher_platforms: ['facebook', 'instagram'], facebook_positions: ['feed', 'story', 'marketplace'], instagram_positions: ['stream', 'story', 'reels', 'explore'] },
  instagram_only: { publisher_platforms: ['instagram'], instagram_positions: ['stream', 'story', 'reels', 'explore'] },
  stories_reels: { publisher_platforms: ['facebook', 'instagram'], facebook_positions: ['story'], instagram_positions: ['story', 'reels'] },
}

async function postMeta(url: string, params: Record<string, string>): Promise<any> {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params).toString() })
  const data = await response.json()
  if (data.error) {
    console.error('[Meta API Error]', JSON.stringify(data.error, null, 2))
    throw new Error(`Meta API Error: ${data.error.message} (code: ${data.error.code}${data.error.error_subcode ? `, subcode: ${data.error.error_subcode}` : ''})`)
  }
  return data
}

export function buildMetaTargeting(targetAudience: any): Record<string, any> {
  const targeting: Record<string, any> = {}
  const locations = targetAudience?.locations || ['Brasil']
  const countryMap: Record<string, string> = { 'Brasil': 'BR', 'Brazil': 'BR', 'USA': 'US' }
  const geoLocations: Record<string, any> = {}
  if (targetAudience?.regions?.length > 0) geoLocations.regions = targetAudience.regions
  else if (targetAudience?.cities?.length > 0) geoLocations.cities = targetAudience.cities
  else geoLocations.countries = locations.map((l: string) => countryMap[l] || 'BR')
  targeting.geo_locations = geoLocations
  targeting.age_min = targetAudience?.age_min || 25
  targeting.age_max = targetAudience?.age_max || 55
  if (targetAudience?.gender === 'male') targeting.genders = [1]
  else if (targetAudience?.gender === 'female') targeting.genders = [2]
  if (targetAudience?.interest_ids?.length > 0) {
    targeting.flexible_spec = [{ interests: targetAudience.interest_ids.map((i: any) => ({ id: i.id, name: i.name })) }]
  }
  if (targetAudience?.custom_audiences?.length > 0) targeting.custom_audiences = targetAudience.custom_audiences.map((id: string) => ({ id }))
  if (targetAudience?.excluded_custom_audiences?.length > 0) targeting.excluded_custom_audiences = targetAudience.excluded_custom_audiences.map((id: string) => ({ id }))
  targeting.targeting_automation = { advantage_audience: 0 }
  return targeting
}

export async function searchInterests(accessToken: string, query: string) {
  const params = new URLSearchParams({ access_token: accessToken, type: 'adinterest', q: query, limit: '10' })
  const response = await fetch(`${META_API_BASE}/search?${params}`)
  const data = await response.json()
  if (data.error) throw new Error(`Meta Search API Error: ${data.error.message}`)
  return (data.data || []).map((item: any) => ({ id: item.id, name: item.name, audience_size_lower_bound: item.audience_size_lower_bound || 0, audience_size_upper_bound: item.audience_size_upper_bound || 0 }))
}

export async function resolveInterests(accessToken: string, interestTexts: string[]) {
  const resolved: { id: string; name: string }[] = []
  for (const text of interestTexts) {
    try { const results = await searchInterests(accessToken, text); if (results.length > 0) resolved.push({ id: results[0].id, name: results[0].name }) } catch { /* skip */ }
  }
  return resolved
}

export async function createCampaign(config: MetaAdsConfig, params: { name: string; campaignType: string; dailyBudget?: number; startTime?: string; stopTime?: string }): Promise<string> {
  const objective = CAMPAIGN_TYPE_TO_META_OBJECTIVE[params.campaignType] || 'OUTCOME_LEADS'
  const body: Record<string, string> = { access_token: config.access_token, name: params.name, objective, status: 'PAUSED', special_ad_categories: '[]', is_adset_budget_sharing_enabled: 'true', bid_strategy: 'LOWEST_COST_WITHOUT_CAP' }
  const result = await postMeta(`${META_API_BASE}/${config.ad_account_id}/campaigns`, body)
  return result.id
}

export async function createAdSet(config: MetaAdsConfig, params: { name: string; campaignId: string; campaignType: string; dailyBudget: number; targeting: Record<string, any>; startTime?: string; endTime?: string; pixelId?: string; placementPreset?: string; conversionLocation?: string }): Promise<string> {
  const optimizationGoal = CAMPAIGN_TYPE_TO_OPTIMIZATION_GOAL[params.campaignType] || 'OFFSITE_CONVERSIONS'
  const defaultStart = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  const body: Record<string, string> = { access_token: config.access_token, name: params.name, campaign_id: params.campaignId, status: 'PAUSED', daily_budget: String(Math.round(params.dailyBudget * 100)), billing_event: 'IMPRESSIONS', optimization_goal: optimizationGoal, bid_strategy: 'LOWEST_COST_WITHOUT_CAP', targeting: JSON.stringify(params.targeting), start_time: params.startTime || defaultStart }
  if (params.endTime) body.end_time = params.endTime
  if (params.pixelId) { body.promoted_object = JSON.stringify({ pixel_id: params.pixelId, custom_event_type: params.campaignType === 'lead_generation' ? 'LEAD' : 'PURCHASE' }) }
  if (params.conversionLocation) body.destination_type = params.conversionLocation
  const placementKey = params.placementPreset || 'automatic'
  const placements = PLACEMENT_PRESETS[placementKey]
  if (placements && Object.keys(placements).length > 0) {
    const t = JSON.parse(body.targeting)
    if (placements.publisher_platforms) t.publisher_platforms = placements.publisher_platforms
    if (placements.facebook_positions) t.facebook_positions = placements.facebook_positions
    if (placements.instagram_positions) t.instagram_positions = placements.instagram_positions
    body.targeting = JSON.stringify(t)
  }
  const result = await postMeta(`${META_API_BASE}/${config.ad_account_id}/adsets`, body)
  return result.id
}

export async function createAdCreative(config: MetaAdsConfig, params: { name: string; pageId: string; imageHash?: string; imageUrl?: string; videoId?: string; headline: string; primaryText: string; description?: string; cta: string; linkUrl: string }): Promise<string> {
  const ctaMap: Record<string, string> = { 'Saiba Mais': 'LEARN_MORE', 'Cadastre-se': 'SIGN_UP', 'Inscrever-se': 'SIGN_UP', 'Quero o Teste': 'SIGN_UP', 'Descobrir Como': 'LEARN_MORE', 'Garantir Vaga': 'SIGN_UP', 'Agendar': 'BOOK_TRAVEL', 'Comprar': 'SHOP_NOW', 'Baixar': 'DOWNLOAD', 'Contato': 'CONTACT_US' }
  const ctaType = ctaMap[params.cta] || 'LEARN_MORE'
  const spec: any = { page_id: params.pageId, link_data: { message: params.primaryText, link: params.linkUrl, name: params.headline, description: params.description || '', call_to_action: { type: ctaType, value: { link: params.linkUrl } } } }
  if (params.imageHash) spec.link_data.image_hash = params.imageHash
  else if (params.imageUrl) spec.link_data.picture = params.imageUrl
  const body: Record<string, string> = { access_token: config.access_token, name: params.name, object_story_spec: JSON.stringify(spec) }
  const result = await postMeta(`${META_API_BASE}/${config.ad_account_id}/adcreatives`, body)
  return result.id
}

export async function createAd(config: MetaAdsConfig, params: { name: string; adSetId: string; creativeId: string }): Promise<string> {
  const body: Record<string, string> = { access_token: config.access_token, name: params.name, adset_id: params.adSetId, creative: JSON.stringify({ creative_id: params.creativeId }), status: 'PAUSED' }
  const result = await postMeta(`${META_API_BASE}/${config.ad_account_id}/ads`, body)
  return result.id
}

export async function deleteCampaign(config: MetaAdsConfig, campaignId: string): Promise<void> {
  await postMeta(`${META_API_BASE}/${campaignId}`, { access_token: config.access_token, status: 'DELETED' })
}

export async function uploadImageFromUrl(config: MetaAdsConfig, imageUrl: string): Promise<{ hash: string; url: string }> {
  const result = await postMeta(`${META_API_BASE}/${config.ad_account_id}/adimages`, { access_token: config.access_token, url: imageUrl })
  const images = result.images; const firstKey = Object.keys(images)[0]
  return { hash: images[firstKey].hash, url: images[firstKey].url }
}

export async function getCustomAudiences(config: MetaAdsConfig) {
  const params = new URLSearchParams({ access_token: config.access_token, fields: 'id,name,subtype', limit: '100' })
  const data = await fetchAllPages(`${META_API_BASE}/${config.ad_account_id}/customaudiences?${params}`)
  return data.map((a: any) => ({ id: a.id, name: a.name, subtype: a.subtype }))
}

export async function getPixels(config: MetaAdsConfig) {
  const params = new URLSearchParams({ access_token: config.access_token, fields: 'id,name' })
  const data = await fetchAllPages(`${META_API_BASE}/${config.ad_account_id}/adspixels?${params}`)
  return data.map((p: any) => ({ id: p.id, name: p.name }))
}

export async function getPromotePages(config: MetaAdsConfig) {
  const params = new URLSearchParams({ access_token: config.access_token, fields: 'id,name' })
  const data = await fetchAllPages(`${META_API_BASE}/${config.ad_account_id}/promote_pages?${params}`)
  return data.map((p: any) => ({ id: p.id, name: p.name }))
}
