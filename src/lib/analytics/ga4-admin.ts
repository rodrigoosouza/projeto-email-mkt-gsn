// Google Analytics 4 Admin API client
// Creates properties, data streams, and conversion events for orgs

import { GoogleAuth } from 'google-auth-library'

const GA4_ADMIN_API_BASE = 'https://analyticsadmin.googleapis.com/v1beta'

interface Ga4PropertyResult {
  propertyId: string
  propertyName: string
}

interface Ga4DataStreamResult {
  dataStreamId: string
  measurementId: string
}

function getAuth(): GoogleAuth | null {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!serviceAccountJson) {
    console.warn('[GA4-Admin] GOOGLE_SERVICE_ACCOUNT_JSON not set, skipping GA4 setup')
    return null
  }

  try {
    const credentials = JSON.parse(serviceAccountJson)
    return new GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/analytics.edit',
      ],
    })
  } catch (err) {
    console.error('[GA4-Admin] Failed to parse service account JSON:', err)
    return null
  }
}

async function getAccessToken(): Promise<string | null> {
  const auth = getAuth()
  if (!auth) return null

  try {
    const client = await auth.getClient()
    const token = await client.getAccessToken()
    return token.token || null
  } catch (err) {
    console.error('[GA4-Admin] Failed to get access token:', err)
    return null
  }
}

async function ga4Fetch(path: string, options: RequestInit = {}): Promise<any | null> {
  const token = await getAccessToken()
  if (!token) return null

  try {
    const response = await fetch(`${GA4_ADMIN_API_BASE}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[GA4-Admin] API error ${response.status}: ${errorText}`)
      return null
    }

    return response.json()
  } catch (err) {
    console.error('[GA4-Admin] Request failed:', err)
    return null
  }
}

/**
 * Creates a new GA4 property for an organization
 */
export async function createProperty(
  accountId: string,
  orgName: string,
  websiteUrl: string
): Promise<Ga4PropertyResult | null> {
  console.log(`[GA4-Admin] Creating property for "${orgName}" in account ${accountId}`)

  const result = await ga4Fetch('/properties', {
    method: 'POST',
    body: JSON.stringify({
      parent: `accounts/${accountId}`,
      displayName: `${orgName} - Auto`,
      timeZone: 'America/Sao_Paulo',
      currencyCode: 'BRL',
      industryCategory: 'BUSINESS_AND_INDUSTRIAL_MARKETS',
      propertyType: 'PROPERTY_TYPE_ORDINARY',
    }),
  })

  if (!result) return null

  // Property name format: "properties/123456"
  const propertyId = result.name?.replace('properties/', '') || ''

  console.log(`[GA4-Admin] Property created: ${propertyId}`)
  return {
    propertyId,
    propertyName: result.displayName,
  }
}

/**
 * Creates a web data stream for a GA4 property
 * Returns the measurement ID (G-XXXXXX)
 */
export async function createWebDataStream(
  propertyId: string,
  websiteUrl: string
): Promise<Ga4DataStreamResult | null> {
  console.log(`[GA4-Admin] Creating web data stream for property ${propertyId}`)

  // Ensure URL has protocol
  const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`

  const result = await ga4Fetch(`/properties/${propertyId}/dataStreams`, {
    method: 'POST',
    body: JSON.stringify({
      type: 'WEB_DATA_STREAM',
      displayName: 'Website',
      webStreamData: {
        defaultUri: url,
      },
    }),
  })

  if (!result) return null

  const dataStreamId = result.name?.split('/').pop() || ''
  const measurementId = result.webStreamData?.measurementId || ''

  console.log(`[GA4-Admin] Data stream created: ${measurementId} (ID: ${dataStreamId})`)
  return {
    dataStreamId,
    measurementId,
  }
}

/**
 * Creates key conversion events for a GA4 property
 */
export async function createConversionEvents(
  propertyId: string
): Promise<string[]> {
  const conversionEvents = ['generate_lead', 'form_submit', 'purchase']
  const created: string[] = []

  console.log(`[GA4-Admin] Creating conversion events for property ${propertyId}`)

  for (const eventName of conversionEvents) {
    // Create the key event (formerly conversion event)
    const result = await ga4Fetch(`/properties/${propertyId}/keyEvents`, {
      method: 'POST',
      body: JSON.stringify({
        eventName,
        countingMethod: 'ONCE_PER_EVENT',
      }),
    })

    if (result) {
      created.push(eventName)
      console.log(`[GA4-Admin] Key event created: ${eventName}`)
    } else {
      console.warn(`[GA4-Admin] Failed to create key event: ${eventName}`)
    }
  }

  console.log(`[GA4-Admin] Created ${created.length}/${conversionEvents.length} key events`)
  return created
}

/**
 * Full GA4 setup: create property, data stream, and conversion events
 */
export async function fullSetup(
  accountId: string,
  orgName: string,
  websiteUrl: string
): Promise<{
  propertyId: string
  measurementId: string
  dataStreamId: string
  conversionEvents: string[]
} | null> {
  // Check auth first
  const token = await getAccessToken()
  if (!token) {
    console.warn('[GA4-Admin] No auth available, skipping GA4 setup')
    return null
  }

  // 1. Create property
  const property = await createProperty(accountId, orgName, websiteUrl)
  if (!property) return null

  // 2. Create web data stream
  const stream = await createWebDataStream(property.propertyId, websiteUrl)
  if (!stream) return null

  // 3. Create conversion events
  const conversionEvents = await createConversionEvents(property.propertyId)

  return {
    propertyId: property.propertyId,
    measurementId: stream.measurementId,
    dataStreamId: stream.dataStreamId,
    conversionEvents,
  }
}
