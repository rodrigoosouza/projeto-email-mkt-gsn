import { createClient } from '@/lib/supabase/client'
import type { Integration, IntegrationProvider, AnalyticsData, AnalyticsMetricType } from '@/lib/types'

export async function getIntegrations(orgId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('org_id', orgId)
    .order('provider')

  if (error) throw error
  return data as Integration[]
}

export async function getIntegration(orgId: string, provider: IntegrationProvider) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('org_id', orgId)
    .eq('provider', provider)
    .maybeSingle()

  if (error) throw error
  return data as Integration | null
}

export async function upsertIntegration(
  orgId: string,
  provider: IntegrationProvider,
  config: Record<string, any>,
  isActive: boolean
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('integrations')
    .upsert(
      { org_id: orgId, provider, config, is_active: isActive },
      { onConflict: 'org_id,provider' }
    )
    .select()
    .single()

  if (error) throw error
  return data as Integration
}

export async function deleteIntegration(integrationId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('integrations')
    .delete()
    .eq('id', integrationId)

  if (error) throw error
}

export async function getAnalyticsData(
  orgId: string,
  metricType?: AnalyticsMetricType,
  periodStart?: string,
  periodEnd?: string
) {
  const supabase = createClient()
  let query = supabase
    .from('analytics_data')
    .select('*')
    .eq('org_id', orgId)

  if (metricType) query = query.eq('metric_type', metricType)
  if (periodStart) query = query.gte('period_start', periodStart)
  if (periodEnd) query = query.lte('period_end', periodEnd)

  const { data, error } = await query.order('period_start', { ascending: false })

  if (error) throw error
  return data as AnalyticsData[]
}

export async function saveAnalyticsData(
  orgId: string,
  integrationId: string,
  metricType: AnalyticsMetricType,
  data: Record<string, any>,
  periodStart: string,
  periodEnd: string
) {
  const supabase = createClient()
  const { error } = await supabase
    .from('analytics_data')
    .insert({
      org_id: orgId,
      integration_id: integrationId,
      metric_type: metricType,
      data,
      period_start: periodStart,
      period_end: periodEnd,
    })

  if (error) throw error
}
