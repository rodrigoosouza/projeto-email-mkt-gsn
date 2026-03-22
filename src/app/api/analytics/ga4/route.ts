import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
    const type = searchParams.get('type') || 'full' // 'full' or 'overview'

    const propertyId = process.env.GA4_PROPERTY_ID
    if (!propertyId) {
      return NextResponse.json({ error: 'GA4_PROPERTY_ID não configurado' }, { status: 500 })
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
