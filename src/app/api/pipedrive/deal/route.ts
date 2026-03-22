import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const PIPEDRIVE_API = 'https://api.pipedrive.com/v1'

async function pipeFetch(endpoint: string, token: string) {
  const res = await fetch(`${PIPEDRIVE_API}${endpoint}?api_token=${token}&limit=100`)
  if (!res.ok) return null
  const json = await res.json()
  return json.success ? json.data : null
}

// System fields to skip (already shown in cards or irrelevant)
const SKIP_FIELDS = new Set([
  'id', 'creator_user_id', 'user_id', 'person_id', 'org_id',
  'stage_id', 'pipeline_id', 'title', 'value', 'currency',
  'status', 'add_time', 'update_time', 'close_time', 'won_time',
  'lost_time', 'lost_reason', 'expected_close_date', 'probability',
  'label', 'visible_to', 'cc_email', 'active', 'deleted',
  'stage_order_nr', 'stage_change_time', 'first_won_time',
  'weighted_value', 'weighted_value_currency', 'formatted_value',
  'formatted_weighted_value', 'acv', 'acv_currency', 'mrr', 'mrr_currency',
  'arr', 'arr_currency', 'rotten_time', 'owner_name',
  'person_name', 'org_name', 'next_activity_id', 'next_activity_subject',
  'next_activity_type', 'next_activity_duration', 'next_activity_note',
  'next_activity_date', 'next_activity_time', 'last_activity_id',
  'last_activity_date', 'done_activities_count', 'undone_activities_count',
  'activities_count', 'email_messages_count', 'participants_count',
  'followers_count', 'notes_count', 'files_count', 'products_count',
  'last_incoming_mail_time', 'last_outgoing_mail_time',
  'local_close_date', 'local_lost_date', 'local_won_date',
  'origin', 'origin_id', 'channel', 'channel_id',
])

// Format a value for display — extract .name from objects, join arrays
function formatFieldValue(value: any): string | null {
  if (value === null || value === undefined || value === '' || value === false) return null

  // Object with name (person, org, user)
  if (typeof value === 'object' && !Array.isArray(value)) {
    if (value.name) return value.name
    if (value.value) return String(value.value)
    // If it's a complex object with no useful display, skip
    const keys = Object.keys(value)
    if (keys.length > 5) return null // too complex, skip
    return JSON.stringify(value)
  }

  // Array of email/phone objects
  if (Array.isArray(value)) {
    const items = value
      .map((v: any) => (typeof v === 'object' ? v.value || v.name || '' : String(v)))
      .filter(Boolean)
    return items.length > 0 ? items.join(', ') : null
  }

  return String(value)
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dealId = request.nextUrl.searchParams.get('dealId')
  const orgId = request.nextUrl.searchParams.get('orgId')
  if (!dealId || !orgId) {
    return NextResponse.json({ error: 'dealId and orgId required' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: connection } = await admin
    .from('pipedrive_connections')
    .select('api_token')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .single()

  if (!connection) {
    return NextResponse.json({ error: 'No Pipedrive connection' }, { status: 404 })
  }

  const token = connection.api_token

  const [deal, activities, notes, participants, files, dealFields] = await Promise.all([
    pipeFetch(`/deals/${dealId}`, token),
    pipeFetch(`/deals/${dealId}/activities`, token),
    pipeFetch(`/deals/${dealId}/notes`, token),
    pipeFetch(`/deals/${dealId}/participants`, token),
    pipeFetch(`/deals/${dealId}/files`, token),
    pipeFetch(`/dealFields`, token),
  ])

  // Build field label map and option value maps
  const fieldMap: Record<string, { name: string; field_type: string; options?: any[] }> = {}
  if (dealFields) {
    dealFields.forEach((f: any) => {
      if (f.key && f.name) {
        fieldMap[f.key] = { name: f.name, field_type: f.field_type, options: f.options }
      }
    })
  }

  // Extract and format custom fields
  const customFields: { label: string; value: string }[] = []
  if (deal) {
    Object.entries(deal).forEach(([key, rawValue]) => {
      // Skip system/internal fields
      if (SKIP_FIELDS.has(key)) return

      const fieldDef = fieldMap[key]
      if (!fieldDef) return // skip unknown fields without a label

      // Format the value
      let displayValue: string | null = null

      // Enum fields — resolve option ID to label
      if (fieldDef.field_type === 'enum' && fieldDef.options && rawValue) {
        const option = fieldDef.options.find((o: any) => String(o.id) === String(rawValue))
        displayValue = option?.label || String(rawValue)
      }
      // Set fields (multi-select) — resolve comma-separated IDs
      else if (fieldDef.field_type === 'set' && fieldDef.options && rawValue) {
        const ids = String(rawValue).split(',')
        const labels = ids
          .map((id) => fieldDef.options?.find((o: any) => String(o.id) === id.trim())?.label || id)
          .filter(Boolean)
        displayValue = labels.join(', ')
      }
      else {
        displayValue = formatFieldValue(rawValue)
      }

      if (displayValue && displayValue.length > 0) {
        customFields.push({ label: fieldDef.name, value: displayValue })
      }
    })
  }

  // Get stage name
  let stageName = ''
  if (deal?.stage_id) {
    const { data: stage } = await admin
      .from('pipedrive_stages')
      .select('name')
      .eq('stage_id', deal.stage_id)
      .single()
    stageName = stage?.name || `Etapa ${deal.stage_order_nr}`
  }

  return NextResponse.json({
    deal: deal ? { ...deal, stage_name: stageName } : null,
    activities: activities || [],
    notes: notes || [],
    participants: participants || [],
    files: files || [],
    customFields,
  })
}
