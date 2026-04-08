// src/app/api/auth/zoom/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeZoomCode, getZoomUserMe } from '@/lib/zoom/client'
import { encrypt } from '@/lib/crypto/tokens'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  if (!code || !state) return NextResponse.redirect(new URL('/settings?error=zoom_missing_code', req.url))

  let parsed: { orgId: string; userId: string }
  try {
    parsed = JSON.parse(Buffer.from(state, 'base64url').toString())
  } catch {
    return NextResponse.redirect(new URL('/settings?error=zoom_bad_state', req.url))
  }

  try {
    const tok = await exchangeZoomCode(code)
    const me = await getZoomUserMe(tok.access_token)
    const supabase = createClient()

    const expiresAt = new Date(Date.now() + tok.expires_in * 1000).toISOString()

    await supabase.from('live_integrations').upsert(
      {
        org_id: parsed.orgId,
        provider: 'zoom',
        account_email: me.email,
        account_name: `${me.first_name} ${me.last_name}`.trim(),
        external_id: me.id,
        access_token: encrypt(tok.access_token),
        refresh_token: encrypt(tok.refresh_token),
        expires_at: expiresAt,
        scope: tok.scope,
        connected_by: parsed.userId,
        is_active: true,
      },
      { onConflict: 'org_id,provider' },
    )

    return NextResponse.redirect(new URL('/settings?zoom=connected', req.url))
  } catch (e: any) {
    console.error('[zoom callback]', e)
    return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(e.message)}`, req.url))
  }
}
