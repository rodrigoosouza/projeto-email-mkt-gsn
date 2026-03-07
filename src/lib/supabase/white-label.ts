import { createClient } from '@/lib/supabase/server'

export interface WhiteLabelConfig {
  id: string
  org_id: string
  app_name: string
  logo_url: string | null
  favicon_url: string | null
  primary_color: string
  secondary_color: string
  accent_color: string
  custom_domain: string | null
  custom_css: string | null
  hide_branding: boolean
  email_footer_text: string | null
  created_at: string
  updated_at: string
}

export type WhiteLabelConfigInput = Omit<WhiteLabelConfig, 'id' | 'created_at' | 'updated_at' | 'org_id'>

export async function getWhiteLabelConfig(orgId: string): Promise<WhiteLabelConfig | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('white_label_configs')
    .select('*')
    .eq('org_id', orgId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  return data
}

export async function upsertWhiteLabelConfig(
  orgId: string,
  config: Partial<WhiteLabelConfigInput>
): Promise<WhiteLabelConfig> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('white_label_configs')
    .upsert(
      {
        org_id: orgId,
        ...config,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id' }
    )
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}
