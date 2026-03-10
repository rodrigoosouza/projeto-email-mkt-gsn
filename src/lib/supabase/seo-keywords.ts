import { createClient } from './client'

export interface SeoKeyword {
  id: string
  org_id: string
  keyword: string
  search_volume: number | null
  difficulty: number | null
  current_position: number | null
  previous_position: number | null
  url: string | null
  search_engine: string
  country: string
  tracked_at: string
  created_at: string
}

export interface SeoCompetitor {
  id: string
  org_id: string
  domain: string
  name: string | null
  created_at: string
}

export async function getSeoKeywords(orgId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('seo_keywords')
    .select('*')
    .eq('org_id', orgId)
    .order('current_position', { ascending: true, nullsFirst: false })
  if (error) throw error
  return data as SeoKeyword[]
}

export async function addSeoKeyword(orgId: string, keyword: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('seo_keywords')
    .insert({ org_id: orgId, keyword })
    .select()
    .single()
  if (error) throw error
  return data as SeoKeyword
}

export async function deleteSeoKeyword(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('seo_keywords').delete().eq('id', id)
  if (error) throw error
}

export async function updateSeoKeyword(id: string, updates: Partial<SeoKeyword>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('seo_keywords')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as SeoKeyword
}

export async function getSeoCompetitors(orgId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('seo_competitors')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as SeoCompetitor[]
}

export async function addSeoCompetitor(orgId: string, domain: string, name?: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('seo_competitors')
    .insert({ org_id: orgId, domain, name })
    .select()
    .single()
  if (error) throw error
  return data as SeoCompetitor
}

export async function deleteSeoCompetitor(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('seo_competitors').delete().eq('id', id)
  if (error) throw error
}
