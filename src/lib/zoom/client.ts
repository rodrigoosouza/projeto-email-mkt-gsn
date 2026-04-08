// src/lib/zoom/client.ts
// Client tipado para a API do Zoom. Faz refresh de token automatico.
// Documentacao: https://developers.zoom.us/docs/api/

import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/crypto/tokens'

const ZOOM_API = 'https://api.zoom.us/v2'
const ZOOM_OAUTH = 'https://zoom.us/oauth/token'

export interface ZoomIntegration {
  id: string
  org_id: string
  access_token: string
  refresh_token: string | null
  expires_at: string | null
  external_id: string | null
}

export interface ZoomMeetingInput {
  topic: string
  agenda?: string
  start_time: string  // ISO 8601
  duration: number    // minutos
  timezone?: string
  password?: string
  type?: 2 | 8        // 2 = scheduled, 8 = recurring. Webinar usa endpoint diferente
}

export interface ZoomMeetingResponse {
  id: number
  uuid: string
  topic: string
  start_url: string
  join_url: string
  password?: string
  start_time: string
  duration: number
  [key: string]: any
}

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

async function refreshZoomToken(integration: ZoomIntegration): Promise<string> {
  const refreshToken = decrypt(integration.refresh_token)
  if (!refreshToken) throw new Error('Zoom refresh_token ausente')

  const clientId = process.env.ZOOM_CLIENT_ID!
  const clientSecret = process.env.ZOOM_CLIENT_SECRET!
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch(ZOOM_OAUTH, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Zoom refresh failed: ${res.status} ${body}`)
  }

  const data = (await res.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  const supabase = createClient()
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
  await supabase
    .from('live_integrations')
    .update({
      access_token: encrypt(data.access_token),
      refresh_token: encrypt(data.refresh_token),
      expires_at: expiresAt,
      last_refresh_at: new Date().toISOString(),
    })
    .eq('id', integration.id)

  return data.access_token
}

async function getValidAccessToken(integration: ZoomIntegration): Promise<string> {
  const expiresAt = integration.expires_at ? new Date(integration.expires_at).getTime() : 0
  const now = Date.now()
  // Se expira em menos de 2 min, renova
  if (expiresAt - now < 120_000) {
    return refreshZoomToken(integration)
  }
  const token = decrypt(integration.access_token)
  if (!token) throw new Error('Zoom access_token ausente')
  return token
}

export async function getZoomIntegration(orgId: string): Promise<ZoomIntegration> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('live_integrations')
    .select('*')
    .eq('org_id', orgId)
    .eq('provider', 'zoom')
    .eq('is_active', true)
    .single()

  if (error || !data) {
    throw new Error('Zoom nao conectado. Conecte em Configuracoes > Integracoes.')
  }
  return data as ZoomIntegration
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

async function zoomFetch(
  integration: ZoomIntegration,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getValidAccessToken(integration)
  return fetch(`${ZOOM_API}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
}

/**
 * Cria webinar. Requer plano Zoom que inclua webinars.
 * Docs: https://developers.zoom.us/docs/api/webinars/#tag/webinars/POST/users/{userId}/webinars
 */
export async function createZoomWebinar(
  integration: ZoomIntegration,
  input: ZoomMeetingInput,
): Promise<ZoomMeetingResponse> {
  const body = {
    topic: input.topic,
    agenda: input.agenda,
    type: 5, // 5 = webinar agendado
    start_time: input.start_time,
    duration: input.duration,
    timezone: input.timezone ?? 'America/Sao_Paulo',
    password: input.password,
    settings: {
      host_video: true,
      panelists_video: true,
      approval_type: 2,
      audio: 'both',
      auto_recording: 'none',
      hd_video: true,
      allow_multiple_devices: true,
    },
  }

  const res = await zoomFetch(integration, '/users/me/webinars', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Zoom createWebinar failed: ${res.status} ${errBody}`)
  }
  return (await res.json()) as ZoomMeetingResponse
}

/**
 * Cria meeting comum (fallback caso nao use webinar).
 */
export async function createZoomMeeting(
  integration: ZoomIntegration,
  input: ZoomMeetingInput,
): Promise<ZoomMeetingResponse> {
  const body = {
    topic: input.topic,
    agenda: input.agenda,
    type: 2, // scheduled
    start_time: input.start_time,
    duration: input.duration,
    timezone: input.timezone ?? 'America/Sao_Paulo',
    password: input.password,
    settings: {
      host_video: true,
      participant_video: true,
      join_before_host: false,
      mute_upon_entry: true,
      waiting_room: false,
      audio: 'both',
      auto_recording: 'none',
    },
  }

  const res = await zoomFetch(integration, '/users/me/meetings', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Zoom createMeeting failed: ${res.status} ${errBody}`)
  }
  return (await res.json()) as ZoomMeetingResponse
}

/**
 * Configura Custom Live Streaming (RTMP) em um webinar/meeting.
 * Webinar endpoint: PATCH /webinars/{id}/livestream
 * Meeting endpoint: PATCH /meetings/{id}/livestream
 */
export async function setZoomLiveStream(
  integration: ZoomIntegration,
  zoomId: string,
  opts: {
    stream_url: string
    stream_key: string
    page_url: string
    type: 'meeting' | 'webinar'
  },
): Promise<void> {
  const base = opts.type === 'webinar' ? '/webinars' : '/meetings'
  const res = await zoomFetch(integration, `${base}/${zoomId}/livestream`, {
    method: 'PATCH',
    body: JSON.stringify({
      stream_url: opts.stream_url,
      stream_key: opts.stream_key,
      page_url: opts.page_url,
    }),
  })
  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Zoom setLiveStream failed: ${res.status} ${errBody}`)
  }
}

export async function deleteZoomWebinar(
  integration: ZoomIntegration,
  zoomId: string,
  type: 'meeting' | 'webinar' = 'webinar',
): Promise<void> {
  const base = type === 'webinar' ? '/webinars' : '/meetings'
  const res = await zoomFetch(integration, `${base}/${zoomId}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) {
    const errBody = await res.text()
    throw new Error(`Zoom delete failed: ${res.status} ${errBody}`)
  }
}

// ---------------------------------------------------------------------------
// OAuth helpers (para rotas /api/auth/zoom/*)
// ---------------------------------------------------------------------------

export function buildZoomAuthUrl(state: string): string {
  const clientId = process.env.ZOOM_CLIENT_ID!
  const redirect = process.env.ZOOM_REDIRECT_URI!
  const url = new URL('https://zoom.us/oauth/authorize')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirect)
  url.searchParams.set('state', state)
  return url.toString()
}

export async function exchangeZoomCode(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string
}> {
  const clientId = process.env.ZOOM_CLIENT_ID!
  const clientSecret = process.env.ZOOM_CLIENT_SECRET!
  const redirect = process.env.ZOOM_REDIRECT_URI!
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch(ZOOM_OAUTH, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirect,
    }),
  })
  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Zoom exchange failed: ${res.status} ${errBody}`)
  }
  return res.json()
}

export async function getZoomUserMe(accessToken: string): Promise<{
  id: string
  email: string
  first_name: string
  last_name: string
}> {
  const res = await fetch(`${ZOOM_API}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Falha ao buscar usuario Zoom')
  return res.json()
}
