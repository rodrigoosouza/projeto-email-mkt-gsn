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
