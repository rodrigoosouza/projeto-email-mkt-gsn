import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cacheMetaImage } from '@/lib/analytics/meta-image-cache'

export const maxDuration = 120

// POST: Cache all Meta CDN images to Supabase Storage for an org
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orgId } = await request.json()
  if (!orgId) {
    return NextResponse.json({ error: 'orgId required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Get all ads with Meta CDN URLs (not yet cached)
  const { data: ads } = await admin
    .from('meta_ads')
    .select('ad_id, org_id, image_url')
    .eq('org_id', orgId)
    .not('image_url', 'is', null)
    .like('image_url', 'https://scontent%')

  if (!ads || ads.length === 0) {
    return NextResponse.json({ message: 'No images to cache', cached: 0 })
  }

  let cached = 0
  let failed = 0

  for (const ad of ads) {
    try {
      const newUrl = await cacheMetaImage(ad.image_url, ad.ad_id, ad.org_id)
      if (newUrl && newUrl !== ad.image_url) {
        await admin
          .from('meta_ads')
          .update({ image_url: newUrl })
          .eq('ad_id', ad.ad_id)
          .eq('org_id', ad.org_id)
        cached++
      } else {
        failed++
      }
    } catch {
      failed++
    }
  }

  return NextResponse.json({
    success: true,
    total: ads.length,
    cached,
    failed,
  })
}
