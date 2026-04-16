import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Cria/lista shares do usuário pra uma org
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      orgId,
      dashboardType = 'meta-ads',
      title,
      defaultFilters = {},
    } = body

    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

    const token = crypto.randomBytes(18).toString('base64url')
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('dashboard_shares')
      .insert({
        token,
        org_id: orgId,
        dashboard_type: dashboardType,
        title: title || null,
        default_filters: defaultFilters,
        created_by: user.id,
      })
      .select('id, token, dashboard_type, title, created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`
    const url = `${baseUrl}/share/${dashboardType}/${token}`

    return NextResponse.json({ ...data, url })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// Lista shares ativos da org
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const orgId = new URL(request.url).searchParams.get('orgId')
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

  const { data, error } = await supabase
    .from('dashboard_shares')
    .select('id, token, dashboard_type, title, default_filters, created_at, last_viewed_at, view_count, is_active, expires_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`
  const enriched = (data || []).map((s) => ({
    ...s,
    url: `${baseUrl}/share/${s.dashboard_type}/${s.token}`,
  }))

  return NextResponse.json(enriched)
}

// Revoga (desativa) um share
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase
    .from('dashboard_shares')
    .update({ is_active: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
