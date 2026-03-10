import { createClient } from './client'

export interface ContentPost {
  id: string
  org_id: string
  title: string
  pillar: 'growth' | 'connection' | 'objection_breaking' | 'authority'
  content_type: string
  format: 'reels' | 'carousel' | 'static_post' | 'stories' | 'article'
  platform: string
  caption: string | null
  hashtags: string[]
  image_prompt: string | null
  video_prompt: string | null
  image_urls: string[]
  video_urls: string[]
  scheduled_for: string | null
  published_at: string | null
  status: 'draft' | 'generated' | 'approved' | 'scheduled' | 'published' | 'failed'
  engagement_data: Record<string, unknown>
  ai_generated: boolean
  created_at: string
  updated_at: string
}

export const HYESSER_PILLARS = {
  growth: {
    label: 'Crescimento',
    color: '#ec4899',
    percentage: 44,
    postsPerWeek: 4,
    types: ['tip', 'tutorial', 'reels', 'carousel', 'motivational_quote'],
  },
  connection: {
    label: 'Conexao',
    color: '#8b5cf6',
    percentage: 22,
    postsPerWeek: 2,
    types: ['personal_story', 'behind_scenes', 'values', 'daily_life'],
  },
  objection_breaking: {
    label: 'Quebra de Objecoes',
    color: '#f59e0b',
    percentage: 22,
    postsPerWeek: 2,
    types: ['testimonial', 'case_study', 'results', 'before_after', 'faq'],
  },
  authority: {
    label: 'Autoridade',
    color: '#3b82f6',
    percentage: 12,
    postsPerWeek: 1,
    types: ['event', 'certification', 'collaboration', 'interview', 'article'],
  },
} as const

export type PillarKey = keyof typeof HYESSER_PILLARS

export async function getContentPosts(orgId: string, month?: string) {
  const supabase = createClient()
  let query = supabase
    .from('content_calendar')
    .select('*')
    .eq('org_id', orgId)
    .order('scheduled_for', { ascending: true, nullsFirst: false })

  if (month) {
    const start = `${month}-01T00:00:00Z`
    const [y, m] = month.split('-').map(Number)
    const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
    const end = `${nextMonth}-01T00:00:00Z`
    query = query.gte('scheduled_for', start).lt('scheduled_for', end)
  }

  const { data, error } = await query
  if (error) throw error
  return data as ContentPost[]
}

export async function createContentPost(orgId: string, post: Partial<ContentPost>) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('content_calendar')
    .insert({
      org_id: orgId,
      title: post.title || 'Novo Post',
      pillar: post.pillar || 'growth',
      content_type: post.content_type || 'tip',
      format: post.format || 'static_post',
      platform: post.platform || 'instagram',
      caption: post.caption,
      hashtags: post.hashtags || [],
      image_prompt: post.image_prompt,
      scheduled_for: post.scheduled_for,
      status: post.status || 'draft',
      ai_generated: post.ai_generated || false,
      created_by: user?.id,
    })
    .select()
    .single()

  if (error) throw error
  return data as ContentPost
}

export async function updateContentPost(id: string, updates: Partial<ContentPost>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('content_calendar')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as ContentPost
}

export async function deleteContentPost(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('content_calendar')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function bulkCreateContentPosts(orgId: string, posts: Partial<ContentPost>[]) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const rows = posts.map((p) => ({
    org_id: orgId,
    title: p.title || 'Post',
    pillar: p.pillar || 'growth',
    content_type: p.content_type || 'tip',
    format: p.format || 'static_post',
    platform: p.platform || 'instagram',
    caption: p.caption,
    hashtags: p.hashtags || [],
    image_prompt: p.image_prompt,
    scheduled_for: p.scheduled_for,
    status: 'generated' as const,
    ai_generated: true,
    created_by: user?.id,
  }))

  const { data, error } = await supabase
    .from('content_calendar')
    .insert(rows)
    .select()

  if (error) throw error
  return data as ContentPost[]
}
