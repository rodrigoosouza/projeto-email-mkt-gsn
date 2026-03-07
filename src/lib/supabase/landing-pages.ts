import { createClient } from './server'

export async function getLandingPages(orgId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getLandingPage(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createLandingPage(data: {
  org_id: string
  name: string
  brand: string
  theme: string
  status?: string
  copy_text?: string
  created_by: string
}) {
  const supabase = await createClient()

  const { data: page, error } = await supabase
    .from('landing_pages')
    .insert({
      org_id: data.org_id,
      name: data.name,
      brand: data.brand,
      theme: data.theme,
      status: data.status || 'draft',
      copy_text: data.copy_text || null,
      created_by: data.created_by,
    })
    .select()
    .single()

  if (error) throw error
  return page
}

export async function updateLandingPage(
  id: string,
  data: Partial<{
    name: string
    brand: string
    theme: string
    status: string
    html_content: string
    copy_text: string
    deploy_url: string
    vercel_deployment_id: string
    session_id: string
  }>
) {
  const supabase = await createClient()

  const { data: page, error } = await supabase
    .from('landing_pages')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return page
}

export async function deleteLandingPage(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('landing_pages')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function publishLandingPage(
  id: string,
  deployUrl: string,
  deploymentId: string
) {
  const supabase = await createClient()

  const { data: page, error } = await supabase
    .from('landing_pages')
    .update({
      status: 'published',
      deploy_url: deployUrl,
      vercel_deployment_id: deploymentId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return page
}
