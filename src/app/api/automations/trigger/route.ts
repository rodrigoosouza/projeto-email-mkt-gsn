import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processAutomationTrigger } from '@/lib/automation-engine'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { org_id, trigger_type, lead_id, data } = await request.json()
    if (!org_id || !trigger_type || !lead_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await processAutomationTrigger(org_id, trigger_type, lead_id, data || {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Automation trigger error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
