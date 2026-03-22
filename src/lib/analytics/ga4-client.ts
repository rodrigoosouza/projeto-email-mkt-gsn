// Google Analytics 4 Data API client
// Uses service account authentication via google-auth-library

import { GoogleAuth } from 'google-auth-library'

const GA4_API_BASE = 'https://analyticsdata.googleapis.com/v1beta'

let authClient: GoogleAuth | null = null

function getAuth(): GoogleAuth {
  if (authClient) return authClient

  const clientEmail = process.env.GA4_CLIENT_EMAIL
  const privateKey = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!clientEmail || !privateKey) {
    throw new Error('GA4_CLIENT_EMAIL and GA4_PRIVATE_KEY must be set')
  }

  authClient = new GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  })

  return authClient
}

async function fetchGA4(propertyId: string, body: Record<string, any>): Promise<any> {
  const auth = getAuth()
  const client = await auth.getClient()
  const token = await client.getAccessToken()

  const response = await fetch(
    `${GA4_API_BASE}/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`GA4 API Error: ${response.status} - ${error}`)
  }

  return response.json()
}

// Parse GA4 response rows into clean objects
function parseRows(response: any, dimensionNames: string[], metricNames: string[]): Record<string, any>[] {
  if (!response.rows) return []

  return response.rows.map((row: any) => {
    const obj: Record<string, any> = {}
    row.dimensionValues?.forEach((dim: any, i: number) => {
      obj[dimensionNames[i]] = dim.value
    })
    row.metricValues?.forEach((met: any, i: number) => {
      obj[metricNames[i]] = Number(met.value)
    })
    return obj
  })
}

// Get overview metrics
export async function getOverview(propertyId: string, startDate: string, endDate: string) {
  const response = await fetchGA4(propertyId, {
    dateRanges: [{ startDate, endDate }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'newUsers' },
      { name: 'screenPageViews' },
      { name: 'averageSessionDuration' },
      { name: 'bounceRate' },
      { name: 'conversions' },
      { name: 'engagedSessions' },
    ],
  })

  const row = response.rows?.[0]
  if (!row) return null

  const metrics = row.metricValues || []
  return {
    sessions: Number(metrics[0]?.value || 0),
    totalUsers: Number(metrics[1]?.value || 0),
    newUsers: Number(metrics[2]?.value || 0),
    pageViews: Number(metrics[3]?.value || 0),
    avgSessionDuration: Number(metrics[4]?.value || 0),
    bounceRate: Number(metrics[5]?.value || 0),
    conversions: Number(metrics[6]?.value || 0),
    engagedSessions: Number(metrics[7]?.value || 0),
  }
}

// Get traffic sources
export async function getTrafficSources(propertyId: string, startDate: string, endDate: string) {
  const response = await fetchGA4(propertyId, {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'conversions' },
      { name: 'bounceRate' },
    ],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 20,
  })

  return parseRows(response, ['source', 'medium'], ['sessions', 'users', 'conversions', 'bounceRate'])
}

// Get top pages
export async function getTopPages(propertyId: string, startDate: string, endDate: string) {
  const response = await fetchGA4(propertyId, {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'totalUsers' },
      { name: 'averageSessionDuration' },
      { name: 'bounceRate' },
      { name: 'conversions' },
    ],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 20,
  })

  return parseRows(response, ['pagePath'], ['pageViews', 'users', 'avgDuration', 'bounceRate', 'conversions'])
}

// Get daily trend
export async function getDailyTrend(propertyId: string, startDate: string, endDate: string) {
  const response = await fetchGA4(propertyId, {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'date' }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'screenPageViews' },
      { name: 'conversions' },
    ],
    orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
  })

  return parseRows(response, ['date'], ['sessions', 'users', 'pageViews', 'conversions'])
}

// Get geography
export async function getGeography(propertyId: string, startDate: string, endDate: string) {
  const response = await fetchGA4(propertyId, {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'region' }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'conversions' },
    ],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 15,
  })

  return parseRows(response, ['region'], ['sessions', 'users', 'conversions'])
}

// Get devices
export async function getDevices(propertyId: string, startDate: string, endDate: string) {
  const response = await fetchGA4(propertyId, {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'deviceCategory' }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'conversions' },
    ],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
  })

  return parseRows(response, ['device'], ['sessions', 'users', 'conversions'])
}

// Get top events
export async function getTopEvents(propertyId: string, startDate: string, endDate: string) {
  const response = await fetchGA4(propertyId, {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'eventName' }],
    metrics: [
      { name: 'eventCount' },
      { name: 'totalUsers' },
    ],
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: 20,
  })

  return parseRows(response, ['eventName'], ['count', 'users'])
}

// Full report
export async function getFullReport(propertyId: string, startDate: string, endDate: string) {
  const [overview, sources, pages, daily, geography, devices, events] = await Promise.all([
    getOverview(propertyId, startDate, endDate),
    getTrafficSources(propertyId, startDate, endDate),
    getTopPages(propertyId, startDate, endDate),
    getDailyTrend(propertyId, startDate, endDate),
    getGeography(propertyId, startDate, endDate),
    getDevices(propertyId, startDate, endDate),
    getTopEvents(propertyId, startDate, endDate),
  ])

  return { overview, sources, pages, daily, geography, devices, events }
}
