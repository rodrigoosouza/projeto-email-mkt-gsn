import { createClient } from './client'

export interface AdCampaign {
  id: string
  org_id: string
  name: string
  platform: 'meta_ads' | 'google_ads'
  campaign_type: 'lead_generation' | 'traffic' | 'conversion' | 'awareness' | 'engagement' | 'retargeting'
  status: 'draft' | 'ready' | 'active' | 'paused' | 'completed' | 'failed'
  objective: string | null
  target_audience: Record<string, unknown>
  budget_daily: number | null
  budget_total: number | null
  currency: string
  start_date: string | null
  end_date: string | null
  ad_creatives: AdCreative[]
  copy_variants: CopyVariant[]
  landing_page_url: string | null
  segment_id: string | null
  audience_export_id: string | null
  platform_campaign_id: string | null
  performance_data: Record<string, unknown>
  ai_generated: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AdCreative {
  headline: string
  description: string
  image_prompt: string
  image_url?: string
  cta: string
}

export interface CopyVariant {
  primary_text: string
  headline: string
  description: string
  cta: string
}

export async function getAdCampaigns(orgId: string, platform?: string) {
  const supabase = createClient()
  let query = supabase
    .from('ad_campaigns')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (platform) {
    query = query.eq('platform', platform)
  }

  const { data, error } = await query
  if (error) throw error
  return data as AdCampaign[]
}

export async function getAdCampaign(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('ad_campaigns')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as AdCampaign
}

export async function createAdCampaign(orgId: string, campaign: Partial<AdCampaign>) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('ad_campaigns')
    .insert({
      org_id: orgId,
      name: campaign.name || 'Nova Campanha',
      platform: campaign.platform || 'meta_ads',
      campaign_type: campaign.campaign_type || 'lead_generation',
      status: campaign.status || 'draft',
      objective: campaign.objective,
      target_audience: campaign.target_audience || {},
      budget_daily: campaign.budget_daily,
      budget_total: campaign.budget_total,
      start_date: campaign.start_date,
      end_date: campaign.end_date,
      ad_creatives: campaign.ad_creatives || [],
      copy_variants: campaign.copy_variants || [],
      landing_page_url: campaign.landing_page_url,
      ai_generated: campaign.ai_generated || false,
      created_by: user?.id,
    })
    .select()
    .single()

  if (error) throw error
  return data as AdCampaign
}

export async function updateAdCampaign(id: string, updates: Partial<AdCampaign>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('ad_campaigns')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as AdCampaign
}

export async function deleteAdCampaign(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('ad_campaigns').delete().eq('id', id)
  if (error) throw error
}

export async function bulkCreateAdCampaigns(orgId: string, campaigns: Partial<AdCampaign>[]) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const rows = campaigns.map((c) => ({
    org_id: orgId,
    name: c.name || 'Campanha',
    platform: c.platform || 'meta_ads',
    campaign_type: c.campaign_type || 'lead_generation',
    status: 'draft' as const,
    objective: c.objective,
    target_audience: c.target_audience || {},
    budget_daily: c.budget_daily,
    budget_total: c.budget_total,
    ad_creatives: c.ad_creatives || [],
    copy_variants: c.copy_variants || [],
    landing_page_url: c.landing_page_url,
    ai_generated: true,
    created_by: user?.id,
  }))

  const { data, error } = await supabase
    .from('ad_campaigns')
    .insert(rows)
    .select()

  if (error) throw error
  return data as AdCampaign[]
}
