import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { searchInterests } from '@/lib/analytics/meta-ads-client'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const orgId = searchParams.get('orgId')

    if (!query || !orgId) {
      return NextResponse.json({ error: 'q e orgId são obrigatórios' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: metaAccount } = await admin
      .from('meta_ad_accounts')
      .select('access_token')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .single()

    if (!metaAccount) {
      return NextResponse.json({ error: 'Conta Meta não configurada' }, { status: 400 })
    }

    const results = await searchInterests(metaAccount.access_token, query)

    return NextResponse.json({ interests: results })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
