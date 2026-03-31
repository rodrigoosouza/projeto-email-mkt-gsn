/**
 * Google Places API (New) Client
 * Uses the latest Places API endpoints for searching businesses.
 * All functions are non-fatal: errors are logged and null is returned.
 */

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || ''

const BASE_URL = 'https://places.googleapis.com/v1'

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.types',
  'places.location',
  'places.photos',
  'places.currentOpeningHours',
  'places.businessStatus',
].join(',')

const DETAIL_FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'nationalPhoneNumber',
  'internationalPhoneNumber',
  'websiteUri',
  'rating',
  'userRatingCount',
  'types',
  'location',
  'photos',
  'currentOpeningHours',
  'businessStatus',
  'editorialSummary',
  'googleMapsUri',
].join(',')

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlaceResult {
  placeId: string
  name: string
  address: string
  phone: string | null
  website: string | null
  rating: number | null
  totalRatings: number
  businessType: string | null
  latitude: number | null
  longitude: number | null
  photos: string[]
  openingHours: Record<string, unknown>
  businessStatus: string | null
}

interface GooglePlaceResponse {
  id: string
  displayName?: { text: string; languageCode?: string }
  formattedAddress?: string
  nationalPhoneNumber?: string
  internationalPhoneNumber?: string
  websiteUri?: string
  rating?: number
  userRatingCount?: number
  types?: string[]
  location?: { latitude: number; longitude: number }
  photos?: { name: string; widthPx?: number; heightPx?: number }[]
  currentOpeningHours?: Record<string, unknown>
  businessStatus?: string
  editorialSummary?: { text: string }
  googleMapsUri?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPlace(place: GooglePlaceResponse): PlaceResult {
  return {
    placeId: place.id,
    name: place.displayName?.text || '',
    address: place.formattedAddress || '',
    phone: place.nationalPhoneNumber || place.internationalPhoneNumber || null,
    website: place.websiteUri || null,
    rating: place.rating ?? null,
    totalRatings: place.userRatingCount || 0,
    businessType: place.types?.[0] || null,
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    photos: (place.photos || []).map((p) => p.name),
    openingHours: place.currentOpeningHours || {},
    businessStatus: place.businessStatus || null,
  }
}

// ---------------------------------------------------------------------------
// 1. searchPlaces (Text Search)
// ---------------------------------------------------------------------------

export async function searchPlaces(
  query: string,
  location: string,
  radiusKm: number = 50,
  maxResults: number = 20
): Promise<PlaceResult[] | null> {
  if (!API_KEY) {
    console.error('[GooglePlaces] No API key configured (GOOGLE_PLACES_API_KEY or GOOGLE_GEMINI_API_KEY)')
    return null
  }

  try {
    console.log(`[GooglePlaces] Text Search: "${query} em ${location}" (radius ${radiusKm}km, max ${maxResults})`)

    const body: Record<string, unknown> = {
      textQuery: `${query} em ${location}`,
      maxResultCount: Math.min(maxResults, 20),
      languageCode: 'pt-BR',
    }

    const response = await fetch(`${BASE_URL}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error(`[GooglePlaces] Text Search error ${response.status}:`, err.slice(0, 500))
      return null
    }

    const data = await response.json()
    const places: GooglePlaceResponse[] = data.places || []

    console.log(`[GooglePlaces] Found ${places.length} results`)
    return places.map(formatPlace)
  } catch (err) {
    console.error('[GooglePlaces] searchPlaces error:', err)
    return null
  }
}

// ---------------------------------------------------------------------------
// 2. getPlaceDetails
// ---------------------------------------------------------------------------

export async function getPlaceDetails(placeId: string): Promise<PlaceResult | null> {
  if (!API_KEY) {
    console.error('[GooglePlaces] No API key configured')
    return null
  }

  try {
    console.log(`[GooglePlaces] Getting details for: ${placeId}`)

    const response = await fetch(`${BASE_URL}/places/${placeId}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': DETAIL_FIELD_MASK,
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error(`[GooglePlaces] Details error ${response.status}:`, err.slice(0, 500))
      return null
    }

    const place: GooglePlaceResponse = await response.json()
    return formatPlace(place)
  } catch (err) {
    console.error('[GooglePlaces] getPlaceDetails error:', err)
    return null
  }
}

// ---------------------------------------------------------------------------
// 3. searchNearby
// ---------------------------------------------------------------------------

export async function searchNearby(
  latitude: number,
  longitude: number,
  radiusMeters: number = 50000,
  type?: string
): Promise<PlaceResult[] | null> {
  if (!API_KEY) {
    console.error('[GooglePlaces] No API key configured')
    return null
  }

  try {
    console.log(`[GooglePlaces] Nearby Search: (${latitude}, ${longitude}) radius ${radiusMeters}m`)

    const body: Record<string, unknown> = {
      locationRestriction: {
        circle: {
          center: { latitude, longitude },
          radius: Math.min(radiusMeters, 50000),
        },
      },
      maxResultCount: 20,
      languageCode: 'pt-BR',
    }

    if (type) {
      body.includedTypes = [type]
    }

    const response = await fetch(`${BASE_URL}/places:searchNearby`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error(`[GooglePlaces] Nearby Search error ${response.status}:`, err.slice(0, 500))
      return null
    }

    const data = await response.json()
    const places: GooglePlaceResponse[] = data.places || []

    console.log(`[GooglePlaces] Found ${places.length} nearby results`)
    return places.map(formatPlace)
  } catch (err) {
    console.error('[GooglePlaces] searchNearby error:', err)
    return null
  }
}

// ---------------------------------------------------------------------------
// 4. getPlacePhoto
// ---------------------------------------------------------------------------

export function getPlacePhotoUrl(photoName: string, maxWidth: number = 400): string {
  if (!API_KEY || !photoName) return ''
  return `${BASE_URL}/${photoName}/media?maxWidthPx=${maxWidth}&key=${API_KEY}`
}
