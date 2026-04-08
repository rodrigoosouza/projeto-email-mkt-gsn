// src/app/api/lives/route.ts
// POST /api/lives  → cria Zoom webinar + YouTube broadcast + vincula RTMP
// GET  /api/lives  → lista lives da org

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/crypto/tokens'
import {
  getZoomIntegration,
  createZoomWebinar,
  createZoomMeeting,
  setZoomLiveStream,
  deleteZoomWebinar,
} from '@/lib/zoom/client'
import {
  getYouTubeIntegration,
  createLiveBroadcast,
  createLiveStream,
  bindBroadcastToStream,
  setBroadcastThumbnail,
  deleteBroadcast,
  YouTubePrivacy,
} from '@/lib/youtube/client'

const CreateLiveSchema = z.object({
  orgId: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional().default(''),
  scheduledStart: z.string(),
  durationMinutes: z.number().int().min(5).max(720).default(60),
  timezone: z.string().default('America/Sao_Paulo'),
  youtubePrivacy: z.enum(['public', 'unlisted', 'private']).default('unlisted'),
  zoomType: z.enum(['meeting', 'webinar']).default('webinar'),
  zoomEnabled: z.boolean().default(true),
  youtubeEnabled: z.boolean().default(true),
  thumbnailUrl: z.string().url().optional(),
})

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let parsed
  try {
    const body = await req.json()
    parsed = CreateLiveSchema.parse(body)
  } catch (e: any) {
    return NextResponse.json({ error: 'invalid_input', details: e.message }, { status: 400 })
  }

  const {
    orgId, title, description, scheduledStart, durationMinutes, timezone,
    youtubePrivacy, zoomType, zoomEnabled, youtubeEnabled, thumbnailUrl,
  } = parsed

  // Cria registro draft primeiro (pra ter id e rollback)
  const { data: draft, error: draftErr } = await supabase
    .from('live_broadcasts')
    .insert({
      org_id: orgId,
      title,
      description,
      scheduled_start: scheduledStart,
      duration_minutes: durationMinutes,
      timezone,
      youtube_privacy: youtubePrivacy,
      zoom_type: zoomType,
      zoom_enabled: zoomEnabled,
      youtube_enabled: youtubeEnabled,
      thumbnail_url: thumbnailUrl,
      status: 'draft',
      created_by: auth.user.id,
    })
    .select('id')
    .single()

  if (draftErr || !draft) {
    return NextResponse.json({ error: 'db_error', details: draftErr?.message }, { status: 500 })
  }
  const liveId = draft.id

  // Rollback helpers
  const cleanup: Array<() => Promise<void>> = []
  async function abort(msg: string, status = 500) {
    for (const fn of cleanup.reverse()) {
      try { await fn() } catch (e) { console.error('cleanup error', e) }
    }
    await supabase
      .from('live_broadcasts')
      .update({ status: 'failed', last_error: msg })
      .eq('id', liveId)
    return NextResponse.json({ error: msg }, { status })
  }

  try {
    let ytBroadcastId: string | undefined
    let ytStreamId: string | undefined
    let ytWatchUrl: string | undefined
    let rtmpUrl: string | undefined
    let streamKey: string | undefined

    // -------- YouTube primeiro (pra ter o RTMP antes de configurar no Zoom) --------
    if (youtubeEnabled) {
      const yt = await getYouTubeIntegration(orgId)

      const broadcast = await createLiveBroadcast(yt, {
        title,
        description,
        scheduledStart,
        privacy: youtubePrivacy as YouTubePrivacy,
      })
      ytBroadcastId = broadcast.id
      ytWatchUrl = `https://www.youtube.com/watch?v=${broadcast.id}`
      cleanup.push(() => deleteBroadcast(yt, broadcast.id))

      const stream = await createLiveStream(yt, `${title} — stream`)
      ytStreamId = stream.id
      rtmpUrl = stream.cdn.ingestionInfo.ingestionAddress
      streamKey = stream.cdn.ingestionInfo.streamName

      await bindBroadcastToStream(yt, broadcast.id, stream.id)

      // Thumbnail (se veio URL, baixa e sobe)
      if (thumbnailUrl) {
        try {
          const imgRes = await fetch(thumbnailUrl)
          if (imgRes.ok) {
            const buf = Buffer.from(await imgRes.arrayBuffer())
            const mime = imgRes.headers.get('content-type')?.includes('png')
              ? 'image/png' : 'image/jpeg'
            await setBroadcastThumbnail(yt, broadcast.id, buf, mime as any)
          }
        } catch (e) {
          console.warn('[lives] thumbnail upload falhou (nao critico):', e)
        }
      }
    }

    // -------- Zoom --------
    let zoomId: string | undefined
    let zoomJoinUrl: string | undefined
    let zoomStartUrl: string | undefined
    let zoomPassword: string | undefined

    if (zoomEnabled) {
      const zoom = await getZoomIntegration(orgId)

      const payload = {
        topic: title,
        agenda: description,
        start_time: scheduledStart,
        duration: durationMinutes,
        timezone,
      }
      const zres = zoomType === 'webinar'
        ? await createZoomWebinar(zoom, payload)
        : await createZoomMeeting(zoom, payload)

      zoomId = String(zres.id)
      zoomJoinUrl = zres.join_url
      zoomStartUrl = zres.start_url
      zoomPassword = zres.password
      cleanup.push(() => deleteZoomWebinar(zoom, zoomId!, zoomType))

      // Vincula RTMP do YouTube no Zoom
      if (youtubeEnabled && rtmpUrl && streamKey && ytWatchUrl) {
        await setZoomLiveStream(zoom, zoomId, {
          stream_url: rtmpUrl,
          stream_key: streamKey,
          page_url: ytWatchUrl,
          type: zoomType,
        })
      }
    }

    // -------- Grava tudo no banco --------
    const { error: upErr } = await supabase
      .from('live_broadcasts')
      .update({
        status: 'scheduled',
        zoom_meeting_id: zoomId,
        zoom_join_url: zoomJoinUrl,
        zoom_start_url: zoomStartUrl,
        zoom_password: zoomPassword,
        youtube_broadcast_id: ytBroadcastId,
        youtube_stream_id: ytStreamId,
        youtube_watch_url: ytWatchUrl,
        youtube_rtmp_url: encrypt(rtmpUrl),
        youtube_stream_key: encrypt(streamKey),
      })
      .eq('id', liveId)

    if (upErr) return abort(`db_update: ${upErr.message}`)

    return NextResponse.json({
      id: liveId,
      status: 'scheduled',
      zoom: zoomEnabled ? { id: zoomId, join_url: zoomJoinUrl, start_url: zoomStartUrl } : null,
      youtube: youtubeEnabled ? { broadcast_id: ytBroadcastId, watch_url: ytWatchUrl } : null,
    })
  } catch (e: any) {
    console.error('[POST /api/lives] erro:', e)
    return abort(e?.message ?? 'erro desconhecido')
  }
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get('orgId')
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

  const { data, error } = await supabase
    .from('live_broadcasts')
    .select('id,title,description,scheduled_start,status,thumbnail_url,zoom_join_url,youtube_watch_url,created_at')
    .eq('org_id', orgId)
    .order('scheduled_start', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lives: data })
}
