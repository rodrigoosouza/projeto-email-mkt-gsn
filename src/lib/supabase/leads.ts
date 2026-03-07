import { createClient } from './client'
import type { Lead, LeadTag, CreateLeadPayload } from '@/lib/types'

async function logLeadEvent(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  leadId: string,
  eventType: string,
  title: string,
  description?: string,
  metadata?: Record<string, any>
) {
  try {
    await supabase.from('lead_events').insert({
      org_id: orgId,
      lead_id: leadId,
      event_type: eventType,
      title,
      description: description || null,
      metadata: metadata || {},
    })
  } catch (error) {
    // Silent fail — event logging should never break main operations
    console.error('Erro ao registrar evento do lead:', error)
  }
}

export async function queryLeads(
  orgId: string,
  filters: {
    search?: string
    status?: string
    tags?: string[]
    minScore?: number
    maxScore?: number
  },
  options: {
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  } = {}
) {
  const { page = 1, pageSize = 25, sortBy = 'created_at', sortOrder = 'desc' } = options
  const supabase = createClient()

  let query = supabase
    .from('leads')
    .select('*, lead_tag_assignments(tag:lead_tags(*))', { count: 'exact' })
    .eq('org_id', orgId)

  if (filters.search) {
    query = query.or(
      `email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,company.ilike.%${filters.search}%`
    )
  }
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.minScore !== undefined) query = query.gte('score', filters.minScore)
  if (filters.maxScore !== undefined) query = query.lte('score', filters.maxScore)

  query = query.order(sortBy, { ascending: sortOrder === 'asc' })

  const from = (page - 1) * pageSize
  query = query.range(from, from + pageSize - 1)

  const { data, error, count } = await query
  if (error) throw error

  return {
    leads: (data || []) as (Lead & { lead_tag_assignments: { tag: LeadTag }[] })[],
    total: count || 0,
    page,
    pageSize,
  }
}

export async function getLead(id: string): Promise<Lead> {
  const supabase = createClient()
  const { data, error } = await supabase.from('leads').select('*').eq('id', id).single()
  if (error) throw error
  return data as Lead
}

export async function createLead(orgId: string, payload: CreateLeadPayload): Promise<Lead> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('leads')
    .insert({
      org_id: orgId,
      email: payload.email,
      first_name: payload.first_name || null,
      last_name: payload.last_name || null,
      phone: payload.phone || null,
      company: payload.company || null,
      position: payload.position || null,
      score: payload.score || 0,
      custom_fields: payload.custom_fields || {},
      source: payload.source || 'manual',
      external_id: payload.external_id || null,
    })
    .select()
    .single()
  if (error) throw error

  // Log created event
  await logLeadEvent(supabase, orgId, data.id, 'created', 'Lead criado', `Email: ${payload.email}`)

  // Handle tags
  if (payload.tags?.length) {
    const { data: existingTags } = await supabase
      .from('lead_tags')
      .select()
      .eq('org_id', orgId)
      .in('name', payload.tags)

    if (existingTags) {
      const assignments = existingTags.map((tag) => ({ lead_id: data.id, tag_id: tag.id }))
      await supabase.from('lead_tag_assignments').insert(assignments)
    }
  }

  return data as Lead
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Lead
}

export async function deleteLead(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('leads').delete().eq('id', id)
  if (error) throw error
}

export async function deleteLeads(ids: string[]): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('leads').delete().in('id', ids)
  if (error) throw error
}

export async function deleteAllLeads(orgId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('leads').delete().eq('org_id', orgId)
  if (error) throw error
}

export async function bulkCreateLeads(
  orgId: string,
  leads: CreateLeadPayload[]
): Promise<{ created: number; skipped: number; errors: string[] }> {
  const supabase = createClient()
  let created = 0
  let skipped = 0
  const errors: string[] = []

  for (const lead of leads) {
    if (!lead.email) {
      skipped++
      continue
    }
    try {
      await supabase.from('leads').upsert(
        {
          org_id: orgId,
          email: lead.email,
          first_name: lead.first_name || null,
          last_name: lead.last_name || null,
          phone: lead.phone || null,
          company: lead.company || null,
          position: lead.position || null,
          source: lead.source || 'csv',
        },
        { onConflict: 'org_id,email' }
      )
      created++
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro desconhecido'
      errors.push(`${lead.email}: ${message}`)
      skipped++
    }
  }

  return { created, skipped, errors }
}

export async function getLeadTags(orgId: string): Promise<LeadTag[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('lead_tags')
    .select()
    .eq('org_id', orgId)
    .order('name')
  if (error) throw error
  return (data || []) as LeadTag[]
}

export async function createLeadTag(orgId: string, name: string, color: string): Promise<LeadTag> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('lead_tags')
    .insert({ org_id: orgId, name, color })
    .select()
    .single()
  if (error) throw error
  return data as LeadTag
}

export async function addTagToLead(leadId: string, tagId: string): Promise<void> {
  const supabase = createClient()
  await supabase
    .from('lead_tag_assignments')
    .upsert({ lead_id: leadId, tag_id: tagId }, { onConflict: 'lead_id,tag_id' })

  // Log tag_added event
  try {
    const [{ data: lead }, { data: tag }] = await Promise.all([
      supabase.from('leads').select('org_id').eq('id', leadId).single(),
      supabase.from('lead_tags').select('name').eq('id', tagId).single(),
    ])
    if (lead && tag) {
      await logLeadEvent(supabase, lead.org_id, leadId, 'tag_added', `Tag adicionada: ${tag.name}`, undefined, { tag_id: tagId, tag_name: tag.name })
    }
  } catch (error) {
    console.error('Erro ao registrar evento tag_added:', error)
  }
}

export async function removeTagFromLead(leadId: string, tagId: string): Promise<void> {
  const supabase = createClient()

  // Fetch info before deleting
  let orgId: string | null = null
  let tagName: string | null = null
  try {
    const [{ data: lead }, { data: tag }] = await Promise.all([
      supabase.from('leads').select('org_id').eq('id', leadId).single(),
      supabase.from('lead_tags').select('name').eq('id', tagId).single(),
    ])
    orgId = lead?.org_id || null
    tagName = tag?.name || null
  } catch (error) {
    // ignore
  }

  await supabase
    .from('lead_tag_assignments')
    .delete()
    .eq('lead_id', leadId)
    .eq('tag_id', tagId)

  // Log tag_removed event
  if (orgId) {
    await logLeadEvent(supabase, orgId, leadId, 'tag_removed', `Tag removida: ${tagName || tagId}`, undefined, { tag_id: tagId, tag_name: tagName })
  }
}
