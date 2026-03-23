import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { PublicFormClient } from './client'

export default async function PublicFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: form } = await admin
    .from('lead_forms')
    .select('id, name, description, fields, style, form_type, is_active, org_id')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (!form) return notFound()

  return <PublicFormClient form={form} />
}
