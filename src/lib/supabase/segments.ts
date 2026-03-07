import { createClient } from './client'
import type { Segment, Lead } from '@/lib/types'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'

export async function querySegments(
  orgId: string,
  filters: { search?: string; type?: string },
  options: {
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  } = {}
) {
  const { page = 1, pageSize = DEFAULT_PAGE_SIZE, sortBy = 'created_at', sortOrder = 'desc' } = options
  const supabase = createClient()

  let query = supabase
    .from('segments')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)

  if (filters.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    )
  }
  if (filters.type) query = query.eq('type', filters.type)

  query = query.order(sortBy, { ascending: sortOrder === 'asc' })

  const from = (page - 1) * pageSize
  query = query.range(from, from + pageSize - 1)

  const { data, error, count } = await query
  if (error) throw error

  return {
    segments: (data || []) as Segment[],
    total: count || 0,
    page,
    pageSize,
  }
}

export async function getSegment(id: string): Promise<Segment> {
  const supabase = createClient()
  const { data, error } = await supabase.from('segments').select('*').eq('id', id).single()
  if (error) throw error
  return data as Segment
}

export async function createSegment(
  orgId: string,
  data: {
    name: string
    description?: string
    type: 'static' | 'dynamic'
    rules?: any[]
  }
): Promise<Segment> {
  const supabase = createClient()
  const { data: segment, error } = await supabase
    .from('segments')
    .insert({
      org_id: orgId,
      name: data.name,
      description: data.description || null,
      type: data.type,
      rules: data.rules || null,
      lead_count: 0,
    })
    .select()
    .single()
  if (error) throw error
  return segment as Segment
}

export async function updateSegment(id: string, updates: Partial<Segment>): Promise<Segment> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('segments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Segment
}

export async function deleteSegment(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('segments').delete().eq('id', id)
  if (error) throw error
}

export async function getSegmentLeads(
  segmentId: string,
  orgId: string,
  options: { page?: number; pageSize?: number } = {}
): Promise<{ leads: Lead[]; total: number }> {
  const { page = 1, pageSize = DEFAULT_PAGE_SIZE } = options
  const supabase = createClient()

  // First get the segment to check its type
  const segment = await getSegment(segmentId)

  if (segment.type === 'static') {
    // For static segments, query via segment_memberships
    const from = (page - 1) * pageSize

    const { data, error, count } = await supabase
      .from('segment_memberships')
      .select('lead:leads(*)', { count: 'exact' })
      .eq('segment_id', segmentId)
      .range(from, from + pageSize - 1)

    if (error) throw error

    const leads = (data || []).map((row: any) => row.lead).filter(Boolean) as Lead[]
    return { leads, total: count || 0 }
  } else {
    // For dynamic segments, evaluate rules against leads
    if (!segment.rules || segment.rules.length === 0) {
      return { leads: [], total: 0 }
    }

    const from = (page - 1) * pageSize
    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('org_id', orgId)

    query = applyRulesToQuery(query, segment.rules)
    query = query.range(from, from + pageSize - 1)

    const { data, error, count } = await query
    if (error) throw error

    return { leads: (data || []) as Lead[], total: count || 0 }
  }
}

export async function addLeadsToSegment(segmentId: string, leadIds: string[]): Promise<void> {
  const supabase = createClient()
  const rows = leadIds.map((leadId) => ({ segment_id: segmentId, lead_id: leadId }))
  const { error } = await supabase.from('segment_memberships').upsert(rows, {
    onConflict: 'segment_id,lead_id',
  })
  if (error) throw error
}

export async function removeLeadFromSegment(segmentId: string, leadId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('segment_memberships')
    .delete()
    .eq('segment_id', segmentId)
    .eq('lead_id', leadId)
  if (error) throw error
}

export async function evaluateSegmentRules(orgId: string, rules: any[]): Promise<number> {
  const supabase = createClient()

  let query = supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)

  query = applyRulesToQuery(query, rules)

  const { error, count } = await query
  if (error) throw error

  return count || 0
}

export async function recalculateSegmentCount(segmentId: string, orgId: string): Promise<number> {
  const segment = await getSegment(segmentId)
  let newCount = 0

  if (segment.type === 'static') {
    const supabase = createClient()
    const { count, error } = await supabase
      .from('segment_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('segment_id', segmentId)
    if (error) throw error
    newCount = count || 0
  } else {
    if (segment.rules && segment.rules.length > 0) {
      newCount = await evaluateSegmentRules(orgId, segment.rules)
    }
  }

  await updateSegment(segmentId, { lead_count: newCount })
  return newCount
}

// ============= HELPERS =============

export function applyRulesToQuery(query: any, rules: any[]): any {
  for (const rule of rules) {
    const { field, operator, value } = rule

    switch (operator) {
      case 'equals':
        query = query.eq(field, value)
        break
      case 'contains':
        query = query.ilike(field, `%${value}%`)
        break
      case 'starts_with':
        query = query.ilike(field, `${value}%`)
        break
      case 'ends_with':
        query = query.ilike(field, `%${value}`)
        break
      case 'greater_than':
        query = query.gt(field, value)
        break
      case 'less_than':
        query = query.lt(field, value)
        break
      case 'is_empty':
        query = query.is(field, null)
        break
      case 'is_not_empty':
        query = query.not(field, 'is', null)
        break
    }
  }

  return query
}
