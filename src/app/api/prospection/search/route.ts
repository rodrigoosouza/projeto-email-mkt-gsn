import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchPlaces } from '@/lib/prospection/google-places'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      orgId,
      query,
      location,
      segment,
      radiusKm = 50,
      maxResults = 20,
    } = body

    if (!orgId || !query || !location) {
      return NextResponse.json(
        { error: 'orgId, query e location sao obrigatorios' },
        { status: 400 }
      )
    }

    // Search Google Places
    const places = await searchPlaces(query, location, radiusKm, maxResults)
    if (!places || places.length === 0) {
      // Save search even with 0 results
      await supabase.from('prospect_searches').insert({
        org_id: orgId,
        query,
        location,
        segment: segment || null,
        radius_km: radiusKm,
        results_count: 0,
      })

      return NextResponse.json({ prospects: [], total: 0 })
    }

    // Upsert prospects (dedup by org_id + place_id)
    const prospectsToUpsert = places.map((place) => ({
      org_id: orgId,
      place_id: place.placeId,
      name: place.name,
      address: place.address,
      phone: place.phone,
      website: place.website,
      rating: place.rating,
      total_ratings: place.totalRatings,
      business_type: place.businessType,
      latitude: place.latitude,
      longitude: place.longitude,
      photos: place.photos,
      opening_hours: place.openingHours,
      search_query: query,
      search_location: location,
      search_segment: segment || null,
    }))

    const { data: upserted, error: upsertError } = await supabase
      .from('prospects')
      .upsert(prospectsToUpsert, {
        onConflict: 'org_id,place_id',
        ignoreDuplicates: false,
      })
      .select()

    if (upsertError) {
      console.error('[Prospection] Upsert error:', upsertError)
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    // Save search history
    await supabase.from('prospect_searches').insert({
      org_id: orgId,
      query,
      location,
      segment: segment || null,
      radius_km: radiusKm,
      results_count: places.length,
    })

    return NextResponse.json({
      prospects: upserted || [],
      total: places.length,
    })
  } catch (err) {
    console.error('[Prospection] Search error:', err)
    return NextResponse.json(
      { error: 'Erro interno ao buscar empresas' },
      { status: 500 }
    )
  }
}
