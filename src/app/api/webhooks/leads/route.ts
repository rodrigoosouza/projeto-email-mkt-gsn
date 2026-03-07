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
    // Validate API key from header
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

    // Update last_used_at
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyRecord.id)

    const orgId = keyRecord.org_id
    const body = await request.json()

    // Validate required fields
    if (!body.email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Upsert lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .upsert(
        {
          org_id: orgId,
          email: body.email,
          first_name: body.first_name || null,
          last_name: body.last_name || null,
          phone: body.phone || null,
          company: body.company || null,
          position: body.position || null,
          score: body.score || 0,
          custom_fields: body.custom_fields || {},
          source: body.source || 'api',
          external_id: body.external_id || null,
        },
        { onConflict: 'org_id,email' }
      )
      .select()
      .single()

    if (leadError) {
      return NextResponse.json({ error: leadError.message }, { status: 400 })
    }

    // Handle tags if provided
    if (body.tags && Array.isArray(body.tags) && body.tags.length > 0) {
      for (const tagName of body.tags as string[]) {
        // Find or create tag
        let { data: tag } = await supabase
          .from('lead_tags')
          .select()
          .eq('org_id', orgId)
          .eq('name', tagName)
          .single()

        if (!tag) {
          const { data: newTag } = await supabase
            .from('lead_tags')
            .insert({ org_id: orgId, name: tagName, color: '#3B82F6' })
            .select()
            .single()
          tag = newTag
        }

        if (tag) {
          await supabase
            .from('lead_tag_assignments')
            .upsert(
              { lead_id: lead.id, tag_id: tag.id },
              { onConflict: 'lead_id,tag_id' }
            )
        }
      }
    }

    return NextResponse.json({ success: true, lead })
  } catch (error) {
    console.error('Lead webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
