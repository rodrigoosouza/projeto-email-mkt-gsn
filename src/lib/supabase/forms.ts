import { createClient } from './client'
import type { LeadForm, FormSubmission } from '@/lib/types'

export async function getForms(
  orgId: string,
  options: { page?: number; pageSize?: number } = {}
) {
  const { page = 1, pageSize = 25 } = options
  const supabase = createClient()

  const from = (page - 1) * pageSize
  const { data, error, count } = await supabase
    .from('lead_forms')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1)

  if (error) throw error

  return {
    forms: (data || []) as LeadForm[],
    total: count || 0,
    page,
    pageSize,
  }
}

export async function getForm(id: string): Promise<LeadForm> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('lead_forms')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as LeadForm
}

export async function createForm(
  orgId: string,
  userId: string,
  form: {
    name: string
    description?: string
    form_type: string
    fields: any[]
    settings?: Record<string, any>
    style?: Record<string, any>
    success_message?: string
    redirect_url?: string
    tag_ids?: string[]
    segment_id?: string
  }
): Promise<LeadForm> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('lead_forms')
    .insert({
      org_id: orgId,
      name: form.name,
      description: form.description || null,
      form_type: form.form_type,
      fields: form.fields,
      settings: form.settings || {},
      style: form.style || {},
      success_message: form.success_message || 'Obrigado! Recebemos seus dados.',
      redirect_url: form.redirect_url || null,
      tag_ids: form.tag_ids || [],
      segment_id: form.segment_id || null,
      created_by: userId,
    })
    .select()
    .single()

  if (error) throw error
  return data as LeadForm
}

export async function updateForm(
  id: string,
  updates: Partial<Pick<LeadForm, 'name' | 'description' | 'form_type' | 'fields' | 'settings' | 'style' | 'success_message' | 'redirect_url' | 'tag_ids' | 'segment_id' | 'is_active'>>
): Promise<LeadForm> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('lead_forms')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as LeadForm
}

export async function deleteForm(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('lead_forms').delete().eq('id', id)
  if (error) throw error
}

export async function getFormSubmissions(
  formId: string,
  options: { page?: number; pageSize?: number } = {}
) {
  const { page = 1, pageSize = 25 } = options
  const supabase = createClient()

  const from = (page - 1) * pageSize
  const { data, error, count } = await supabase
    .from('form_submissions')
    .select('*', { count: 'exact' })
    .eq('form_id', formId)
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1)

  if (error) throw error

  return {
    submissions: (data || []) as FormSubmission[],
    total: count || 0,
    page,
    pageSize,
  }
}

export async function toggleFormActive(id: string, isActive: boolean): Promise<LeadForm> {
  return updateForm(id, { is_active: isActive })
}
