// TODO: Encrypt access_token before storing in database (AES-256-GCM)
// Current implementation stores plain text — acceptable for MVP but must be encrypted before production multi-tenant release

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAccountInfo, type InstagramConfig } from '@/lib/instagram/client'

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

    // Verify user belongs to org
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Sem permissão para esta organização' },
        { status: 403 }
      )
    }

    const admin = createAdminClient()
    const { data: account } = await admin
      .from('org_instagram_accounts')
      .select('id, instagram_business_id, facebook_page_id, username, profile_picture_url, status, token_expires_at, created_at, updated_at')
      .eq('org_id', orgId)
      .single()

    return NextResponse.json({ account: account || null })
  } catch (error: any) {
    console.error('Instagram account GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { orgId, instagramBusinessId, facebookPageId, accessToken } = await request.json()

    if (!orgId || !instagramBusinessId || !facebookPageId || !accessToken) {
      return NextResponse.json(
        { error: 'orgId, instagramBusinessId, facebookPageId e accessToken são obrigatórios' },
        { status: 400 }
      )
    }

    // Verify user is admin of org
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .single()

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Apenas administradores podem conectar contas Instagram' },
        { status: 403 }
      )
    }

    // Validate by fetching account info
    const config: InstagramConfig = {
      access_token: accessToken,
      instagram_business_id: instagramBusinessId,
    }

    const accountInfo = await getAccountInfo(config)
    if (!accountInfo) {
      return NextResponse.json(
        { error: 'Não foi possível validar a conta Instagram. Verifique os dados e o token.' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Upsert (UNIQUE on org_id)
    const { data: saved, error: saveError } = await admin
      .from('org_instagram_accounts')
      .upsert(
        {
          org_id: orgId,
          instagram_business_id: instagramBusinessId,
          facebook_page_id: facebookPageId,
          access_token: accessToken,
          username: accountInfo.username,
          profile_picture_url: accountInfo.profile_picture_url,
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'org_id' }
      )
      .select('id, instagram_business_id, username, profile_picture_url, status')
      .single()

    if (saveError) {
      console.error('Instagram account save error:', saveError)
      return NextResponse.json(
        { error: 'Erro ao salvar conta Instagram' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      account: saved,
      accountInfo,
      message: `Conta @${accountInfo.username} conectada com sucesso!`,
    })
  } catch (error: any) {
    console.error('Instagram account POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}
