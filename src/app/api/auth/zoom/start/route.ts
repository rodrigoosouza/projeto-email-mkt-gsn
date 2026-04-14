// src/app/api/auth/zoom/start/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { buildZoomAuthUrl } from '@/lib/zoom/client'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get('orgId')
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

  const state = Buffer.from(JSON.stringify({ orgId, userId: auth.user.id, t: Date.now() })).toString('base64url')
  return NextResponse.redirect(buildZoomAuthUrl(state))
}
