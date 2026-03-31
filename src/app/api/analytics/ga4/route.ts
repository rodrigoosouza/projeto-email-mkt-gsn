import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFullReport, getOverview } from '@/lib/analytics/ga4-client'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || '30daysAgo'
    const endDate = searchParams.get('endDate') || 'today'
    const type = searchParams.get('type') || 'full'
    const orgId = searchParams.get('orgId')

    // Try to get property ID from org_tracking_config first, then fallback to env var
    let propertyId = process.env.GA4_PROPERTY_ID || ''

    if (orgId) {
      const admin = createAdminClient()
      const { data: config } = await admin
        .from('org_tracking_config')
        .select('ga4_property_id')
        .eq('org_id', orgId)
        .single()

      if (config?.ga4_property_id) {
        propertyId = config.ga4_property_id
      }
    }

    if (!propertyId) {
      return NextResponse.json({ error: 'GA4 Property ID não configurado para esta organização' }, { status: 500 })
    }

    if (type === 'overview') {
      const data = await getOverview(propertyId, startDate, endDate)
      return NextResponse.json(data)
    }

    const data = await getFullReport(propertyId, startDate, endDate)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('GA4 API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
