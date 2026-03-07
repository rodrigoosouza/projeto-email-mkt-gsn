import { createClient } from './client'
import type { Campaign, CampaignStats, CampaignSendLog } from '@/lib/types'

export async function queryCampaigns(
  orgId: string,
  filters: {
    search?: string
    status?: string
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
    .from('campaigns')
    .select('*, template:email_templates(name), segment:segments(name)', { count: 'exact' })
    .eq('org_id', orgId)

  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }
  if (filters.status) query = query.eq('status', filters.status)

  query = query.order(sortBy, { ascending: sortOrder === 'asc' })

  const from = (page - 1) * pageSize
  query = query.range(from, from + pageSize - 1)

  const { data, error, count } = await query
  if (error) throw error

  return {
    campaigns: (data || []) as (Campaign & {
      template: { name: string } | null
      segment: { name: string } | null
    })[],
    total: count || 0,
    page,
    pageSize,
  }
}

export async function getCampaign(
  id: string
): Promise<Campaign & { template?: { name: string }; segment?: { name: string } }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('campaigns')
    .select('*, template:email_templates(name), segment:segments(name)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Campaign & { template?: { name: string }; segment?: { name: string } }
}

export async function createCampaign(
  orgId: string,
  userId: string,
  data: {
    name: string
    template_id: string
    segment_id: string
    scheduled_for?: string
  }
): Promise<Campaign> {
  const supabase = createClient()
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .insert({
      org_id: orgId,
      name: data.name,
      status: 'draft',
      template_id: data.template_id,
      segment_id: data.segment_id,
      scheduled_for: data.scheduled_for || null,
      created_by: userId,
    })
    .select()
    .single()
  if (error) throw error
  return campaign as Campaign
}

export async function updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('campaigns')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Campaign
}

export async function deleteCampaign(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('campaigns').delete().eq('id', id)
  if (error) throw error
}

export async function getCampaignStats(campaignId: string): Promise<CampaignStats | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('campaign_stats')
    .select('*')
    .eq('campaign_id', campaignId)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as CampaignStats
}

export async function getCampaignSendLogs(
  campaignId: string,
  options: { page?: number; pageSize?: number } = {}
): Promise<{ logs: CampaignSendLog[]; total: number }> {
  const { page = 1, pageSize = 25 } = options
  const supabase = createClient()

  const from = (page - 1) * pageSize
  const { data, error, count } = await supabase
    .from('campaign_send_logs')
    .select('*', { count: 'exact' })
    .eq('campaign_id', campaignId)
    .order('sent_at', { ascending: false })
    .range(from, from + pageSize - 1)

  if (error) throw error

  return {
    logs: (data || []) as CampaignSendLog[],
    total: count || 0,
  }
}

export async function scheduleCampaign(id: string, scheduledFor: string): Promise<Campaign> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('campaigns')
    .update({ status: 'scheduled', scheduled_for: scheduledFor })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Campaign
}

export async function pauseCampaign(id: string): Promise<Campaign> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('campaigns')
    .update({ status: 'paused' })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Campaign
}
