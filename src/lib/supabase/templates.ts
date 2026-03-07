import { createClient } from './client'
import type { EmailTemplate } from '@/lib/types'

export async function queryTemplates(
  orgId: string,
  filters: { search?: string; category?: string },
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
    .from('email_templates')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,subject.ilike.%${filters.search}%`)
  }
  if (filters.category) query = query.eq('category', filters.category)

  query = query.order(sortBy, { ascending: sortOrder === 'asc' })
  const from = (page - 1) * pageSize
  query = query.range(from, from + pageSize - 1)

  const { data, error, count } = await query
  if (error) throw error

  return {
    templates: (data || []) as EmailTemplate[],
    total: count || 0,
    page,
    pageSize,
  }
}

export async function getTemplate(id: string): Promise<EmailTemplate> {
  const supabase = createClient()
  const { data, error } = await supabase.from('email_templates').select('*').eq('id', id).single()
  if (error) throw error
  return data as EmailTemplate
}

export async function createTemplate(
  orgId: string,
  userId: string,
  data: {
    name: string
    description?: string
    category: string
    subject: string
    html_content: string
    unlayer_json?: any
    preview_text?: string
  }
): Promise<EmailTemplate> {
  const supabase = createClient()
  const { data: result, error } = await supabase
    .from('email_templates')
    .insert({
      org_id: orgId,
      created_by: userId,
      name: data.name,
      description: data.description || null,
      category: data.category,
      subject: data.subject,
      html_content: data.html_content,
      unlayer_json: data.unlayer_json || null,
      preview_text: data.preview_text || null,
      is_ai_generated: false,
    })
    .select()
    .single()
  if (error) throw error
  return result as EmailTemplate
}

export async function updateTemplate(
  id: string,
  updates: Partial<EmailTemplate>
): Promise<EmailTemplate> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('email_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as EmailTemplate
}

export async function deleteTemplate(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('email_templates').delete().eq('id', id)
  if (error) throw error
}

export async function duplicateTemplate(
  id: string,
  orgId: string,
  userId: string
): Promise<EmailTemplate> {
  const original = await getTemplate(id)
  return createTemplate(orgId, userId, {
    name: `${original.name} (copia)`,
    description: original.description || undefined,
    category: original.category,
    subject: original.subject,
    html_content: original.html_content,
    unlayer_json: original.unlayer_json,
    preview_text: original.preview_text || undefined,
  })
}
