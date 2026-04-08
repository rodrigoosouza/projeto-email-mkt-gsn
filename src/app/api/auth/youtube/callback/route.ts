// src/app/api/auth/youtube/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeYouTubeCode, getYouTubeChannel } from '@/lib/youtube/client'
import { encrypt } from '@/lib/crypto/tokens'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  if (!code || !state) return NextResponse.redirect(new URL('/settings?error=youtube_missing_code', req.url))

  let parsed: { orgId: string; userId: string }
  try {
    parsed = JSON.parse(Buffer.from(state, 'base64url').toString())
  } catch {
    return NextResponse.redirect(new URL('/settings?error=youtube_bad_state', req.url))
  }

  try {
    const tok = await exchangeYouTubeCode(code)
    const channel = await getYouTubeChannel(tok.access_token)
    const supabase = createClient()

    const expiresAt = new Date(Date.now() + tok.expires_in * 1000).toISOString()

    await supabase.from('live_integrations').upsert(
      {
        org_id: parsed.orgId,
        provider: 'youtube',
        account_name: channel.title,
        external_id: channel.id,
        access_token: encrypt(tok.access_token),
        refresh_token: encrypt(tok.refresh_token),
        expires_at: expiresAt,
        scope: tok.scope,
        connected_by: parsed.userId,
        is_active: true,
      },
      { onConflict: 'org_id,provider' },
    )

    return NextResponse.redirect(new URL('/settings?youtube=connected', req.url))
  } catch (e: any) {
    console.error('[youtube callback]', e)
    return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(e.message)}`, req.url))
  }
}
