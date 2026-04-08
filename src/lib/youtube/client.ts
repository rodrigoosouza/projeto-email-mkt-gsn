// src/lib/youtube/client.ts
// Client para YouTube Data API v3 — criar broadcast, stream, bind, thumbnail.
// Docs: https://developers.google.com/youtube/v3/live/docs

import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/crypto/tokens'

const YT_API = 'https://www.googleapis.com/youtube/v3'
const YT_UPLOAD = 'https://www.googleapis.com/upload/youtube/v3'
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token'

export interface YouTubeIntegration {
  id: string
  org_id: string
  access_token: string
  refresh_token: string | null
  expires_at: string | null
  external_id: string | null // channel_id
}

export type YouTubePrivacy = 'public' | 'unlisted' | 'private'

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

async function refreshYouTubeToken(integration: YouTubeIntegration): Promise<string> {
  const refreshToken = decrypt(integration.refresh_token)
  if (!refreshToken) throw new Error('YouTube refresh_token ausente')

  const res = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`YouTube refresh failed: ${res.status} ${body}`)
  }

  const data = (await res.json()) as {
    access_token: string
    expires_in: number
    scope: string
    token_type: string
  }

  const supabase = createClient()
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
  await supabase
    .from('live_integrations')
    .update({
      access_token: encrypt(data.access_token),
      expires_at: expiresAt,
      last_refresh_at: new Date().toISOString(),
    })
    .eq('id', integration.id)

  return data.access_token
}

async function getValidAccessToken(integration: YouTubeIntegration): Promise<string> {
  const expiresAt = integration.expires_at ? new Date(integration.expires_at).getTime() : 0
  if (expiresAt - Date.now() < 120_000) {
    return refreshYouTubeToken(integration)
  }
  const token = decrypt(integration.access_token)
  if (!token) throw new Error('YouTube access_token ausente')
  return token
}

export async function getYouTubeIntegration(orgId: string): Promise<YouTubeIntegration> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('live_integrations')
    .select('*')
    .eq('org_id', orgId)
    .eq('provider', 'youtube')
    .eq('is_active', true)
    .single()

  if (error || !data) {
    throw new Error('YouTube nao conectado. Conecte em Configuracoes > Integracoes.')
  }
  return data as YouTubeIntegration
}

async function ytFetch(
  integration: YouTubeIntegration,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getValidAccessToken(integration)
  return fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': (init.headers as any)?.['Content-Type'] ?? 'application/json',
    },
  })
}

// ---------------------------------------------------------------------------
// API wrappers
// ---------------------------------------------------------------------------

export interface CreateBroadcastInput {
  title: string
  description?: string
  scheduledStart: string // ISO
  scheduledEnd?: string
  privacy: YouTubePrivacy
}

export interface YouTubeBroadcast {
  id: string
  snippet: { title: string; scheduledStartTime: string }
  status: { privacyStatus: string; lifeCycleStatus: string }
  contentDetails?: any
}

/**
 * Cria o liveBroadcast (equivalente ao "evento" no YouTube Studio).
 * Cota: 50 units.
 */
export async function createLiveBroadcast(
  integration: YouTubeIntegration,
  input: CreateBroadcastInput,
): Promise<YouTubeBroadcast> {
  const url = `${YT_API}/liveBroadcasts?part=snippet,status,contentDetails`
  const body = {
    snippet: {
      title: input.title,
      description: input.description ?? '',
      scheduledStartTime: input.scheduledStart,
      scheduledEndTime: input.scheduledEnd,
    },
    status: {
      privacyStatus: input.privacy,
      selfDeclaredMadeForKids: false,
    },
    contentDetails: {
      enableAutoStart: true,
      enableAutoStop: true,
      enableDvr: true,
      enableContentEncryption: true,
      enableEmbed: true,
      recordFromStart: true,
      monitorStream: {
        enableMonitorStream: false,
        broadcastStreamDelayMs: 0,
      },
    },
  }
  const res = await ytFetch(integration, url, { method: 'POST', body: JSON.stringify(body) })
  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`YouTube createBroadcast failed: ${res.status} ${errBody}`)
  }
  return res.json()
}

export interface YouTubeStream {
  id: string
  cdn: {
    ingestionInfo: {
      ingestionAddress: string
      streamName: string // stream key
      backupIngestionAddress: string
    }
    resolution: string
    frameRate: string
  }
}

/**
 * Cria o liveStream (o "input" RTMP).
 * Cota: 50 units.
 */
export async function createLiveStream(
  integration: YouTubeIntegration,
  title: string,
): Promise<YouTubeStream> {
  const url = `${YT_API}/liveStreams?part=snippet,cdn,contentDetails,status`
  const body = {
    snippet: { title },
    cdn: {
      frameRate: 'variable',
      ingestionType: 'rtmp',
      resolution: 'variable',
    },
    contentDetails: { isReusable: false },
  }
  const res = await ytFetch(integration, url, { method: 'POST', body: JSON.stringify(body) })
  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`YouTube createStream failed: ${res.status} ${errBody}`)
  }
  return res.json()
}

/**
 * Vincula broadcast e stream. Cota: 50 units.
 */
export async function bindBroadcastToStream(
  integration: YouTubeIntegration,
  broadcastId: string,
  streamId: string,
): Promise<void> {
  const url = `${YT_API}/liveBroadcasts/bind?id=${broadcastId}&streamId=${streamId}&part=id,contentDetails`
  const res = await ytFetch(integration, url, { method: 'POST' })
  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`YouTube bind failed: ${res.status} ${errBody}`)
  }
}

/**
 * Upload de thumbnail. Cota: 50 units.
 * image precisa ser um Buffer de JPEG/PNG (<= 2MB).
 */
export async function setBroadcastThumbnail(
  integration: YouTubeIntegration,
  videoId: string,
  image: Buffer,
  mimeType: 'image/jpeg' | 'image/png' = 'image/jpeg',
): Promise<void> {
  const token = await getValidAccessToken(integration)
  const url = `${YT_UPLOAD}/thumbnails/set?videoId=${videoId}&uploadType=media`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': mimeType,
      'Content-Length': image.length.toString(),
    },
    body: image,
  })
  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`YouTube thumbnail failed: ${res.status} ${errBody}`)
  }
}

export async function deleteBroadcast(
  integration: YouTubeIntegration,
  broadcastId: string,
): Promise<void> {
  const res = await ytFetch(integration, `${YT_API}/liveBroadcasts?id=${broadcastId}`, {
    method: 'DELETE',
  })
  if (!res.ok && res.status !== 404) {
    const errBody = await res.text()
    throw new Error(`YouTube deleteBroadcast failed: ${res.status} ${errBody}`)
  }
}

// ---------------------------------------------------------------------------
// OAuth helpers
// ---------------------------------------------------------------------------

const YT_SCOPES = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.force-ssl',
  'https://www.googleapis.com/auth/youtube.upload',
].join(' ')

export function buildYouTubeAuthUrl(state: string): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!)
  url.searchParams.set('redirect_uri', process.env.GOOGLE_YOUTUBE_REDIRECT_URI!)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', YT_SCOPES)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', state)
  return url.toString()
}

export async function exchangeYouTubeCode(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string
}> {
  const res = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.GOOGLE_YOUTUBE_REDIRECT_URI!,
    }),
  })
  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`YouTube exchange failed: ${res.status} ${errBody}`)
  }
  return res.json()
}

export async function getYouTubeChannel(accessToken: string): Promise<{
  id: string
  title: string
}> {
  const res = await fetch(`${YT_API}/channels?part=snippet&mine=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Falha ao buscar canal YouTube')
  const data = await res.json()
  const ch = data.items?.[0]
  if (!ch) throw new Error('Nenhum canal YouTube encontrado nessa conta')
  return { id: ch.id, title: ch.snippet?.title ?? '' }
}
