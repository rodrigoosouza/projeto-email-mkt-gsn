import { createClient } from './client'
import type { SeoAnalysis } from '@/lib/types'

export async function getSeoAnalyses(orgId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('seo_analyses')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as SeoAnalysis[]
}

export async function getSeoAnalysis(id: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('seo_analyses')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as SeoAnalysis
}

export async function createSeoAnalysis(data: {
  org_id: string
  url: string
  created_by: string
}) {
  const supabase = createClient()

  const { data: result, error } = await supabase
    .from('seo_analyses')
    .insert({
      ...data,
      status: 'pending',
      overall_score: 0,
      issues: [],
      recommendations: [],
      performance_data: {},
    })
    .select()
    .single()

  if (error) throw error
  return result as SeoAnalysis
}

export async function updateSeoAnalysis(
  id: string,
  data: Partial<SeoAnalysis>
) {
  const supabase = createClient()

  const { data: result, error } = await supabase
    .from('seo_analyses')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return result as SeoAnalysis
}

export async function deleteSeoAnalysis(id: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('seo_analyses')
    .delete()
    .eq('id', id)

  if (error) throw error
}
