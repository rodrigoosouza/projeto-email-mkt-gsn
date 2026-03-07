import { createClient } from '@/lib/supabase/client'
import type { CustomFieldDefinition } from '@/lib/types'

export async function getCustomFieldDefinitions(orgId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('custom_field_definitions')
    .select('*')
    .eq('org_id', orgId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data as CustomFieldDefinition[]
}

export async function createCustomFieldDefinition(
  orgId: string,
  field: { name: string; label: string; field_type: string; options?: string[]; required?: boolean }
) {
  const supabase = createClient()

  // Get max sort_order
  const { data: existing } = await supabase
    .from('custom_field_definitions')
    .select('sort_order')
    .eq('org_id', orgId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing && existing.length > 0 ? existing[0].sort_order : 0) + 1

  const { data, error } = await supabase
    .from('custom_field_definitions')
    .insert({
      org_id: orgId,
      name: field.name,
      label: field.label,
      field_type: field.field_type,
      options: field.options || null,
      required: field.required || false,
      sort_order: nextOrder,
    })
    .select()
    .single()

  if (error) throw error
  return data as CustomFieldDefinition
}

export async function updateCustomFieldDefinition(
  fieldId: string,
  updates: Partial<Pick<CustomFieldDefinition, 'label' | 'options' | 'required' | 'sort_order'>>
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('custom_field_definitions')
    .update(updates)
    .eq('id', fieldId)
    .select()
    .single()

  if (error) throw error
  return data as CustomFieldDefinition
}

export async function deleteCustomFieldDefinition(fieldId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('custom_field_definitions')
    .delete()
    .eq('id', fieldId)

  if (error) throw error
}
