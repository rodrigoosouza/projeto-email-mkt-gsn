import { createAdminClient } from '@/lib/supabase/admin'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const BUCKET = 'ad-creatives'

/**
 * Cache a Meta CDN image to Supabase Storage.
 * Returns the Supabase public URL, or the original URL on failure.
 */
export async function cacheMetaImage(
  imageUrl: string,
  adId: string,
  orgId: string
): Promise<string | null> {
  try {
    // Already a Supabase URL — return as-is
    if (imageUrl.includes(SUPABASE_URL) || imageUrl.includes('supabase.co/storage')) {
      return imageUrl
    }

    // Fetch the image from Meta CDN
    const response = await fetch(imageUrl)
    if (!response.ok) {
      console.warn(`[meta-image-cache] Failed to fetch image for ad ${adId}: ${response.status}`)
      return imageUrl
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Determine file extension from content type
    let ext = 'jpg'
    if (contentType.includes('png')) ext = 'png'
    else if (contentType.includes('webp')) ext = 'webp'
    else if (contentType.includes('gif')) ext = 'gif'

    const storagePath = `meta-ads/${orgId}/${adId}.${ext}`

    const admin = createAdminClient()

    // Upload to Supabase Storage (upsert to overwrite if exists)
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType,
        upsert: true,
      })

    if (uploadError) {
      console.warn(`[meta-image-cache] Upload error for ad ${adId}:`, uploadError.message)
      return imageUrl
    }

    // Get public URL
    const { data: publicUrlData } = admin.storage
      .from(BUCKET)
      .getPublicUrl(storagePath)

    if (publicUrlData?.publicUrl) {
      return publicUrlData.publicUrl
    }

    return imageUrl
  } catch (error: any) {
    console.warn(`[meta-image-cache] Error caching image for ad ${adId}:`, error.message)
    return imageUrl
  }
}

/**
 * Cache multiple Meta ad images in batch. Non-blocking, limited to maxCount.
 * Returns the number of images cached successfully.
 */
export async function cacheMetaImagesBatch(
  ads: Array<{ ad_id: string; org_id: string; image_url: string }>,
  maxCount: number = 20
): Promise<number> {
  const toCacheAds = ads
    .filter(
      (ad) =>
        ad.image_url &&
        ad.image_url.startsWith('https://scontent') &&
        !ad.image_url.includes('supabase.co')
    )
    .slice(0, maxCount)

  if (toCacheAds.length === 0) return 0

  const admin = createAdminClient()
  let cached = 0

  for (const ad of toCacheAds) {
    try {
      const newUrl = await cacheMetaImage(ad.image_url, ad.ad_id, ad.org_id)
      if (newUrl && newUrl !== ad.image_url) {
        // Update the record with the new Supabase URL
        await admin
          .from('meta_ads')
          .update({ image_url: newUrl })
          .eq('ad_id', ad.ad_id)
          .eq('org_id', ad.org_id)
        cached++
      }
    } catch (e: any) {
      console.warn(`[meta-image-cache] Batch error for ad ${ad.ad_id}:`, e.message)
    }
  }

  return cached
}
