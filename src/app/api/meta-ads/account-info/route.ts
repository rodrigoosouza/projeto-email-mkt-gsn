import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCustomAudiences, getPixels, getPromotePages } from '@/lib/analytics/meta-ads-client'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')
    if (!orgId) {
      return NextResponse.json({ error: 'orgId é obrigatório' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: metaAccounts } = await admin
      .from('meta_ad_accounts')
      .select('access_token, ad_account_id, ad_account_name')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    const metaAccount = metaAccounts?.find(a => !a.ad_account_name?.includes('Read-Only'))
      || metaAccounts?.[0]

    if (!metaAccount) {
      return NextResponse.json({ error: 'Conta Meta não configurada' }, { status: 400 })
    }

    const config = {
      access_token: metaAccount.access_token,
      ad_account_id: metaAccount.ad_account_id.startsWith('act_')
        ? metaAccount.ad_account_id
        : `act_${metaAccount.ad_account_id}`,
    }

    const [audiences, pixels, pages] = await Promise.all([
      getCustomAudiences(config).catch(() => []),
      getPixels(config).catch(() => []),
      getPromotePages(config).catch(() => []),
    ])

    return NextResponse.json({ audiences, pixels, pages })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
