// Meta (Facebook) Marketing API client
// Requires: access_token and ad_account_id in integration config

const META_API_VERSION = 'v19.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

interface MetaAdsConfig {
  access_token: string
  ad_account_id: string // format: act_123456
}

interface MetaInsightsParams {
  time_range: { since: string; until: string }
  fields: string[]
  level?: 'account' | 'campaign' | 'adset' | 'ad'
  limit?: number
}

export async function getInsights(config: MetaAdsConfig, params: MetaInsightsParams) {
  const queryParams = new URLSearchParams({
    access_token: config.access_token,
    fields: params.fields.join(','),
    time_range: JSON.stringify(params.time_range),
    level: params.level || 'account',
    limit: String(params.limit || 100),
  })

  const response = await fetch(
    `${META_API_BASE}/${config.ad_account_id}/insights?${queryParams}`
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Meta Ads API error: ${response.status} - ${error}`)
  }

  return response.json()
}

export async function getCampaigns(config: MetaAdsConfig) {
  const queryParams = new URLSearchParams({
    access_token: config.access_token,
    fields: 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time',
    limit: '100',
  })

  const response = await fetch(
    `${META_API_BASE}/${config.ad_account_id}/campaigns?${queryParams}`
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Meta Ads API error: ${response.status} - ${error}`)
  }

  return response.json()
}

// Pre-built report functions
export async function getAccountOverview(config: MetaAdsConfig, since: string, until: string) {
  return getInsights(config, {
    time_range: { since, until },
    fields: ['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'reach', 'actions'],
    level: 'account',
  })
}

export async function getCampaignInsights(config: MetaAdsConfig, since: string, until: string) {
  return getInsights(config, {
    time_range: { since, until },
    fields: ['campaign_name', 'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'actions', 'cost_per_action_type'],
    level: 'campaign',
  })
}

export async function getLeadAds(config: MetaAdsConfig, since: string, until: string) {
  return getInsights(config, {
    time_range: { since, until },
    fields: ['campaign_name', 'actions', 'cost_per_action_type'],
    level: 'campaign',
  })
}
