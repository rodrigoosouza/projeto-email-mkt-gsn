// GA4 Data API client
// Uses Google Analytics Data API v1beta
// Requires: property_id and credentials in integration config

const GA4_API_BASE = 'https://analyticsdata.googleapis.com/v1beta'

interface GA4Config {
  property_id: string
  access_token?: string
  refresh_token?: string
  client_id?: string
  client_secret?: string
}

interface GA4ReportRequest {
  dateRanges: { startDate: string; endDate: string }[]
  metrics: { name: string }[]
  dimensions?: { name: string }[]
  limit?: number
}

export async function refreshAccessToken(config: GA4Config): Promise<string | null> {
  if (!config.refresh_token || !config.client_id || !config.client_secret) {
    return config.access_token || null
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.client_id,
        client_secret: config.client_secret,
        refresh_token: config.refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) return null
    const data = await response.json()
    return data.access_token
  } catch {
    return null
  }
}

export async function runGA4Report(config: GA4Config, request: GA4ReportRequest) {
  const token = await refreshAccessToken(config)
  if (!token) throw new Error('No valid access token for GA4')

  const response = await fetch(
    `${GA4_API_BASE}/properties/${config.property_id}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`GA4 API error: ${response.status} - ${error}`)
  }

  return response.json()
}

// Pre-built report functions
export async function getPageViews(config: GA4Config, startDate: string, endDate: string) {
  return runGA4Report(config, {
    dateRanges: [{ startDate, endDate }],
    metrics: [{ name: 'screenPageViews' }],
    dimensions: [{ name: 'date' }],
  })
}

export async function getTopPages(config: GA4Config, startDate: string, endDate: string, limit = 10) {
  return runGA4Report(config, {
    dateRanges: [{ startDate, endDate }],
    metrics: [{ name: 'screenPageViews' }, { name: 'averageSessionDuration' }],
    dimensions: [{ name: 'pagePath' }],
    limit,
  })
}

export async function getTrafficSources(config: GA4Config, startDate: string, endDate: string) {
  return runGA4Report(config, {
    dateRanges: [{ startDate, endDate }],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
    dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
    limit: 20,
  })
}

export async function getOverview(config: GA4Config, startDate: string, endDate: string) {
  return runGA4Report(config, {
    dateRanges: [{ startDate, endDate }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
    ],
  })
}
