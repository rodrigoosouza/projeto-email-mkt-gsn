import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTextMessage, sendTemplateMessage, sendMediaMessage } from '@/lib/whatsapp/client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { to, text, template_name, template_language, template_components, media_type, media_url, caption } = body

    if (!to) {
      return NextResponse.json({ error: 'Missing "to" parameter' }, { status: 400 })
    }

    let result

    if (template_name) {
      result = await sendTemplateMessage(to, template_name, template_language || 'pt_BR', template_components)
    } else if (media_type && media_url) {
      result = await sendMediaMessage(to, media_type, media_url, caption)
    } else if (text) {
      result = await sendTextMessage(to, text)
    } else {
      return NextResponse.json({ error: 'Missing message content' }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('WhatsApp send error:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
