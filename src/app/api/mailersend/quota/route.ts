import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.MAILERSEND_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'MAILERSEND_API_KEY not configured' }, { status: 500 })
  }

  const res = await fetch('https://api.mailersend.com/v1/api-quota', {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch quota' }, { status: 502 })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
