import { createClient } from './client'
import type { SocialAccount, SocialPost } from '@/lib/types'

// ============= SOCIAL ACCOUNTS =============

export async function getSocialAccounts(orgId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as SocialAccount[]
}

export async function getSocialAccount(id: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as SocialAccount
}

export async function createSocialAccount(data: {
  org_id: string
  platform: string
  account_name: string
  account_id?: string | null
  access_token?: string | null
  refresh_token?: string | null
  token_expires_at?: string | null
  avatar_url?: string | null
  is_active?: boolean
}) {
  const supabase = createClient()

  const { data: account, error } = await supabase
    .from('social_accounts')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return account as SocialAccount
}

export async function updateSocialAccount(
  id: string,
  data: Partial<{
    platform: string
    account_name: string
    account_id: string | null
    access_token: string | null
    refresh_token: string | null
    token_expires_at: string | null
    avatar_url: string | null
    is_active: boolean
  }>
) {
  const supabase = createClient()

  const { data: account, error } = await supabase
    .from('social_accounts')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return account as SocialAccount
}

export async function deleteSocialAccount(id: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('social_accounts')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============= SOCIAL POSTS =============

export async function getSocialPosts(
  orgId: string,
  filters?: { accountId?: string; status?: string }
) {
  const supabase = createClient()

  let query = supabase
    .from('social_posts')
    .select('*, account:social_accounts(*)')
    .eq('org_id', orgId)

  if (filters?.accountId) {
    query = query.eq('account_id', filters.accountId)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data as SocialPost[]
}

export async function getSocialPost(id: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('social_posts')
    .select('*, account:social_accounts(*)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as SocialPost
}

export async function createSocialPost(data: {
  org_id: string
  account_id: string
  content: string
  media_urls?: string[]
  hashtags?: string[]
  status?: string
  scheduled_for?: string | null
  created_by: string
}) {
  const supabase = createClient()

  const { data: post, error } = await supabase
    .from('social_posts')
    .insert({
      ...data,
      media_urls: data.media_urls || [],
      hashtags: data.hashtags || [],
      status: data.status || 'draft',
    })
    .select('*, account:social_accounts(*)')
    .single()

  if (error) throw error
  return post as SocialPost
}

export async function updateSocialPost(
  id: string,
  data: Partial<{
    account_id: string
    content: string
    media_urls: string[]
    hashtags: string[]
    status: string
    scheduled_for: string | null
    published_at: string | null
    platform_post_id: string | null
    metrics: Record<string, any>
    error_message: string | null
  }>
) {
  const supabase = createClient()

  const { data: post, error } = await supabase
    .from('social_posts')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, account:social_accounts(*)')
    .single()

  if (error) throw error
  return post as SocialPost
}

export async function deleteSocialPost(id: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('social_posts')
    .delete()
    .eq('id', id)

  if (error) throw error
}
