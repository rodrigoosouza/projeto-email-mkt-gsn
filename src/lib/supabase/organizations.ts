import { createClient } from '@/lib/supabase/client'
import type { Organization, OrganizationMember } from '@/lib/types'

export async function updateOrganization(
  orgId: string,
  updates: Partial<Pick<Organization, 'name' | 'sender_email' | 'sender_name' | 'website' | 'custom_domain' | 'logo_url'>>
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', orgId)
    .select()
    .single()

  if (error) throw error
  return data as Organization
}

export async function getOrganization(orgId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()

  if (error) throw error
  return data as Organization
}

export interface OrganizationMemberWithUser extends Omit<OrganizationMember, 'user'> {
  user: {
    id: string
    email: string
    name: string | null
    avatar_url: string | null
  }
}

export async function getOrganizationMembers(orgId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      id,
      org_id,
      user_id,
      role,
      created_at,
      user:users (
        id,
        email,
        name,
        avatar_url
      )
    `)
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as unknown as OrganizationMemberWithUser[]
}

export async function updateMemberRole(memberId: string, role: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('organization_members')
    .update({ role })
    .eq('id', memberId)
    .select()
    .single()

  if (error) throw error
  return data as OrganizationMember
}

export async function removeMember(memberId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('id', memberId)

  if (error) throw error
}

export async function createOrganization(name: string, _userId: string) {
  const supabase = createClient()

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const { data, error } = await supabase.rpc('create_organization_with_member', {
    org_name: name,
    org_slug: `${slug}-${Date.now()}`,
  })

  if (error) throw error
  return data as Organization
}

export async function createChildOrganization(
  parentOrgId: string,
  name: string,
  orgType: 'agency' | 'client' | 'sub_client'
) {
  const supabase = createClient()

  // Fetch parent to determine depth
  const parent = await getOrganization(parentOrgId)
  const parentDepth = (parent as Organization & { depth?: number }).depth ?? 0

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const { data, error } = await supabase
    .from('organizations')
    .insert({
      name,
      slug: `${slug}-${Date.now()}`,
      parent_org_id: parentOrgId,
      org_type: orgType,
      depth: parentDepth + 1,
    })
    .select()
    .single()

  if (error) throw error
  return data as Organization
}
