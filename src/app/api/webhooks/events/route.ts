import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(apiKey)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const keyHash = await hashApiKey(apiKey)

    const { data: keyRecord, error: keyError } = await supabase
      .from('api_keys')
      .select('id, org_id')
      .eq('key_hash', keyHash)
      .single()

    if (keyError || !keyRecord) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyRecord.id)

    const body = await request.json()

    // For now, just acknowledge the event
    // Future: process events, update lead scores, trigger automations
    return NextResponse.json({
      status: 'received',
      org_id: keyRecord.org_id,
      event: (body.event as string) || 'unknown',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Event webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
