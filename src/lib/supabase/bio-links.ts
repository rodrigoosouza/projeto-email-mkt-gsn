import { createClient } from './client'
import { createAdminClient } from './admin'
import type { BioPage, BioLink } from '@/lib/types'

// ============= BIO PAGES =============

export async function getBioPages(orgId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('bio_pages')
    .select('*, links:bio_links(count)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as (BioPage & { links: { count: number }[] })[]
}

export async function getBioPage(id: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('bio_pages')
    .select('*, links:bio_links(*)')
    .eq('id', id)
    .single()

  if (error) throw error

  // Sort links by sort_order
  if (data?.links) {
    data.links.sort(
      (a: BioLink, b: BioLink) => a.sort_order - b.sort_order
    )
  }

  return data as BioPage
}

export async function getBioPageBySlug(slug: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('bio_pages')
    .select('*, links:bio_links(*)')
    .eq('slug', slug)
    .single()

  if (error) throw error

  // Sort links by sort_order
  if (data?.links) {
    data.links.sort(
      (a: BioLink, b: BioLink) => a.sort_order - b.sort_order
    )
  }

  return data as BioPage
}

export async function createBioPage(data: {
  org_id: string
  title: string
  slug: string
  description?: string | null
  avatar_url?: string | null
  background_color?: string
  text_color?: string
  button_style?: string
  custom_css?: string | null
  is_active?: boolean
  created_by: string
}) {
  const supabase = createClient()

  const { data: page, error } = await supabase
    .from('bio_pages')
    .insert({
      ...data,
      background_color: data.background_color || '#ffffff',
      text_color: data.text_color || '#000000',
      button_style: data.button_style || 'rounded',
      is_active: data.is_active ?? true,
    })
    .select()
    .single()

  if (error) throw error
  return page as BioPage
}

export async function updateBioPage(
  id: string,
  data: Partial<{
    title: string
    slug: string
    description: string | null
    avatar_url: string | null
    background_color: string
    text_color: string
    button_style: string
    custom_css: string | null
    is_active: boolean
  }>
) {
  const supabase = createClient()

  const { data: page, error } = await supabase
    .from('bio_pages')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return page as BioPage
}

export async function deleteBioPage(id: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('bio_pages')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============= BIO LINKS =============

export async function getBioLinks(pageId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('bio_links')
    .select('*')
    .eq('bio_page_id', pageId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data as BioLink[]
}

export async function createBioLink(data: {
  bio_page_id: string
  org_id: string
  title: string
  url: string
  icon?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  sort_order?: number
  is_active?: boolean
}) {
  const supabase = createClient()

  const { data: link, error } = await supabase
    .from('bio_links')
    .insert({
      ...data,
      sort_order: data.sort_order ?? 0,
      is_active: data.is_active ?? true,
    })
    .select()
    .single()

  if (error) throw error
  return link as BioLink
}

export async function updateBioLink(
  id: string,
  data: Partial<{
    title: string
    url: string
    icon: string | null
    utm_source: string | null
    utm_medium: string | null
    utm_campaign: string | null
    sort_order: number
    is_active: boolean
  }>
) {
  const supabase = createClient()

  const { data: link, error } = await supabase
    .from('bio_links')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return link as BioLink
}

export async function deleteBioLink(id: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('bio_links')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function reorderBioLinks(
  links: { id: string; sort_order: number }[]
) {
  const supabase = createClient()

  // Update each link's sort_order
  const updates = links.map(({ id, sort_order }) =>
    supabase
      .from('bio_links')
      .update({ sort_order })
      .eq('id', id)
  )

  const results = await Promise.all(updates)
  const errors = results.filter((r) => r.error)
  if (errors.length > 0) throw errors[0].error
}

export async function trackBioLinkClick(linkId: string) {
  const supabase = createAdminClient()

  const { error } = await supabase.rpc('increment_bio_link_clicks', {
    link_id: linkId,
  })

  // Fallback: manual increment if RPC doesn't exist
  if (error) {
    const { data: link } = await supabase
      .from('bio_links')
      .select('click_count')
      .eq('id', linkId)
      .single()

    if (link) {
      await supabase
        .from('bio_links')
        .update({ click_count: (link.click_count || 0) + 1 })
        .eq('id', linkId)
    }
  }
}

export async function trackBioPageView(pageId: string) {
  const supabase = createAdminClient()

  const { error } = await supabase.rpc('increment_bio_page_views', {
    page_id: pageId,
  })

  // Fallback: manual increment if RPC doesn't exist
  if (error) {
    const { data: page } = await supabase
      .from('bio_pages')
      .select('view_count')
      .eq('id', pageId)
      .single()

    if (page) {
      await supabase
        .from('bio_pages')
        .update({ view_count: (page.view_count || 0) + 1 })
        .eq('id', pageId)
    }
  }
}
