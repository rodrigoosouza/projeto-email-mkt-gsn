// TODO: Encrypt access_token before storing in database (AES-256-GCM)
// Current implementation stores plain text — acceptable for MVP but must be encrypted before production multi-tenant release

// Instagram Graph API v22.0 client for publishing content

const GRAPH_API_BASE = 'https://graph.facebook.com/v22.0'

export interface InstagramConfig {
  access_token: string
  instagram_business_id: string
}

export interface InstagramMediaResult {
  id: string
  permalink: string | null
}

export interface InstagramAccountInfo {
  id: string
  username: string
  name: string
  profile_picture_url: string | null
  followers_count: number
  media_count: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function graphFetch(
  url: string,
  options: RequestInit = {},
  retryOn429 = true
): Promise<any> {
  const res = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(30_000),
  })

  // Rate limit — wait 10s and retry once
  if (res.status === 429 && retryOn429) {
    console.warn('[Instagram] Rate limited (429). Waiting 10s and retrying...')
    await sleep(10_000)
    return graphFetch(url, options, false)
  }

  const data = await res.json()

  if (!res.ok || data.error) {
    const msg = data.error?.message || `HTTP ${res.status}`
    console.error('[Instagram] API error:', msg)
    throw new Error(msg)
  }

  return data
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Polls a media container until its status is FINISHED or an error occurs.
 * Returns the container ID when ready.
 */
async function waitForContainer(
  config: InstagramConfig,
  containerId: string,
  maxWaitMs = 60_000,
  intervalMs = 5_000
): Promise<string> {
  const start = Date.now()

  while (Date.now() - start < maxWaitMs) {
    const url = `${GRAPH_API_BASE}/${containerId}?fields=status_code,status&access_token=${config.access_token}`
    const data = await graphFetch(url)

    const status = data.status_code || data.status
    console.log(`[Instagram] Container ${containerId} status: ${status}`)

    if (status === 'FINISHED') {
      return containerId
    }

    if (status === 'ERROR') {
      throw new Error(`Container ${containerId} failed processing`)
    }

    await sleep(intervalMs)
  }

  throw new Error(`Container ${containerId} timed out after ${maxWaitMs / 1000}s`)
}

/**
 * Publishes a ready container and returns the media ID + permalink.
 */
async function publishContainer(
  config: InstagramConfig,
  containerId: string
): Promise<InstagramMediaResult> {
  const url = `${GRAPH_API_BASE}/${config.instagram_business_id}/media_publish`
  const body = new URLSearchParams({
    creation_id: containerId,
    access_token: config.access_token,
  })

  const data = await graphFetch(url, {
    method: 'POST',
    body,
  })

  const mediaId = data.id

  // Fetch permalink
  let permalink: string | null = null
  try {
    const mediaData = await graphFetch(
      `${GRAPH_API_BASE}/${mediaId}?fields=permalink&access_token=${config.access_token}`
    )
    permalink = mediaData.permalink || null
  } catch {
    console.warn('[Instagram] Could not fetch permalink for media', mediaId)
  }

  return { id: mediaId, permalink }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Publish a single photo to Instagram.
 */
export async function publishPhoto(
  config: InstagramConfig,
  imageUrl: string,
  caption: string
): Promise<InstagramMediaResult | null> {
  try {
    console.log('[Instagram] Publishing photo...')

    // 1. Create media container
    const createUrl = `${GRAPH_API_BASE}/${config.instagram_business_id}/media`
    const createBody = new URLSearchParams({
      image_url: imageUrl,
      caption,
      access_token: config.access_token,
    })

    const containerData = await graphFetch(createUrl, {
      method: 'POST',
      body: createBody,
    })

    const containerId = containerData.id
    console.log(`[Instagram] Photo container created: ${containerId}`)

    // 2. Wait for container to be ready
    await waitForContainer(config, containerId, 30_000, 3_000)

    // 3. Publish
    const result = await publishContainer(config, containerId)
    console.log(`[Instagram] Photo published: ${result.id}`)
    return result
  } catch (error: any) {
    console.error('[Instagram] Failed to publish photo:', error.message)
    return null
  }
}

/**
 * Publish a carousel (multiple images) to Instagram.
 */
export async function publishCarousel(
  config: InstagramConfig,
  imageUrls: string[],
  caption: string
): Promise<InstagramMediaResult | null> {
  try {
    console.log(`[Instagram] Publishing carousel with ${imageUrls.length} images...`)

    if (imageUrls.length < 2) {
      console.error('[Instagram] Carousel requires at least 2 images')
      return null
    }

    if (imageUrls.length > 10) {
      console.warn('[Instagram] Carousel limited to 10 images, truncating')
      imageUrls = imageUrls.slice(0, 10)
    }

    // 1. Create container for each image
    const childIds: string[] = []
    for (const imgUrl of imageUrls) {
      const createUrl = `${GRAPH_API_BASE}/${config.instagram_business_id}/media`
      const createBody = new URLSearchParams({
        image_url: imgUrl,
        is_carousel_item: 'true',
        access_token: config.access_token,
      })

      const data = await graphFetch(createUrl, { method: 'POST', body: createBody })
      childIds.push(data.id)
      console.log(`[Instagram] Carousel child created: ${data.id}`)
    }

    // 2. Create carousel container
    const carouselUrl = `${GRAPH_API_BASE}/${config.instagram_business_id}/media`
    const carouselBody = new URLSearchParams({
      media_type: 'CAROUSEL',
      caption,
      access_token: config.access_token,
    })
    // children must be comma-separated
    carouselBody.append('children', childIds.join(','))

    const carouselData = await graphFetch(carouselUrl, {
      method: 'POST',
      body: carouselBody,
    })

    const carouselContainerId = carouselData.id
    console.log(`[Instagram] Carousel container created: ${carouselContainerId}`)

    // 3. Wait and publish
    await waitForContainer(config, carouselContainerId, 30_000, 3_000)
    const result = await publishContainer(config, carouselContainerId)
    console.log(`[Instagram] Carousel published: ${result.id}`)
    return result
  } catch (error: any) {
    console.error('[Instagram] Failed to publish carousel:', error.message)
    return null
  }
}

/**
 * Publish a Reel (video) to Instagram.
 */
export async function publishReels(
  config: InstagramConfig,
  videoUrl: string,
  caption: string,
  coverUrl?: string
): Promise<InstagramMediaResult | null> {
  try {
    console.log('[Instagram] Publishing reel...')

    // 1. Create reels container
    const createUrl = `${GRAPH_API_BASE}/${config.instagram_business_id}/media`
    const params: Record<string, string> = {
      media_type: 'REELS',
      video_url: videoUrl,
      caption,
      access_token: config.access_token,
    }
    if (coverUrl) {
      params.cover_url = coverUrl
    }

    const createBody = new URLSearchParams(params)
    const containerData = await graphFetch(createUrl, {
      method: 'POST',
      body: createBody,
    })

    const containerId = containerData.id
    console.log(`[Instagram] Reels container created: ${containerId}`)

    // 2. Poll status until FINISHED (videos take longer)
    await waitForContainer(config, containerId, 60_000, 5_000)

    // 3. Publish
    const result = await publishContainer(config, containerId)
    console.log(`[Instagram] Reel published: ${result.id}`)
    return result
  } catch (error: any) {
    console.error('[Instagram] Failed to publish reel:', error.message)
    return null
  }
}

/**
 * Fetch Instagram Business account info.
 */
export async function getAccountInfo(
  config: InstagramConfig
): Promise<InstagramAccountInfo | null> {
  try {
    const url = `${GRAPH_API_BASE}/${config.instagram_business_id}?fields=id,username,name,profile_picture_url,followers_count,media_count&access_token=${config.access_token}`
    const data = await graphFetch(url)

    return {
      id: data.id,
      username: data.username,
      name: data.name,
      profile_picture_url: data.profile_picture_url || null,
      followers_count: data.followers_count || 0,
      media_count: data.media_count || 0,
    }
  } catch (error: any) {
    console.error('[Instagram] Failed to get account info:', error.message)
    return null
  }
}
