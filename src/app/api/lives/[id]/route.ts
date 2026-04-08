// src/app/api/lives/[id]/route.ts
// GET    — detalhe
// DELETE — cancela (remove no Zoom + YouTube + marca como cancelled)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getZoomIntegration, deleteZoomWebinar } from '@/lib/zoom/client'
import { getYouTubeIntegration, deleteBroadcast } from '@/lib/youtube/client'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('live_broadcasts')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  // Nao retorna chaves criptografadas pro client
  const { youtube_rtmp_url, youtube_stream_key, ...safe } = data as any
  return NextResponse.json(safe)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: live, error } = await supabase
    .from('live_broadcasts')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !live) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const errors: string[] = []

  if (live.zoom_meeting_id) {
    try {
      const zoom = await getZoomIntegration(live.org_id)
      await deleteZoomWebinar(zoom, live.zoom_meeting_id, live.zoom_type ?? 'webinar')
    } catch (e: any) {
      errors.push(`zoom: ${e.message}`)
    }
  }
  if (live.youtube_broadcast_id) {
    try {
      const yt = await getYouTubeIntegration(live.org_id)
      await deleteBroadcast(yt, live.youtube_broadcast_id)
    } catch (e: any) {
      errors.push(`youtube: ${e.message}`)
    }
  }

  await supabase
    .from('live_broadcasts')
    .update({ status: 'cancelled', last_error: errors.join(' | ') || null })
    .eq('id', params.id)

  return NextResponse.json({ ok: true, errors })
}
