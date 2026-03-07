import { createClient } from './client'
import type { AudienceExport } from '@/lib/types'

export async function getAudienceExports(orgId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('audience_exports')
    .select('*, segment:segments(id, name)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as (AudienceExport & { segment: { id: string; name: string } | null })[]
}

export async function getAudienceExport(id: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('audience_exports')
    .select('*, segment:segments(id, name)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as AudienceExport & { segment: { id: string; name: string } | null }
}

export async function createAudienceExport(data: {
  org_id: string
  name: string
  platform: string
  segment_id: string | null
  config: Record<string, any>
  created_by: string
}) {
  const supabase = createClient()

  const { data: result, error } = await supabase
    .from('audience_exports')
    .insert({
      ...data,
      status: 'draft',
      total_leads: 0,
      exported_leads: 0,
    })
    .select()
    .single()

  if (error) throw error
  return result as AudienceExport
}

export async function updateAudienceExport(
  id: string,
  data: Partial<AudienceExport>
) {
  const supabase = createClient()

  const { data: result, error } = await supabase
    .from('audience_exports')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return result as AudienceExport
}

export async function deleteAudienceExport(id: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('audience_exports')
    .delete()
    .eq('id', id)

  if (error) throw error
}
