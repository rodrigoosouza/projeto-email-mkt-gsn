// ============================================================
// Marketing Profile - Supabase CRUD
// ============================================================

import { createClient } from '@/lib/supabase/client'
import type { MarketingProfile, BriefingAnswers, BusinessPlan, BrandIdentity, Persona, ICP, FullStrategy } from './types'

export async function getMarketingProfile(orgId: string): Promise<MarketingProfile | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('org_marketing_profiles')
    .select('*')
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) throw error
  return data as MarketingProfile | null
}

export async function upsertMarketingProfile(
  orgId: string,
  updates: Partial<Pick<MarketingProfile, 'briefing' | 'briefing_completed_at' | 'persona' | 'icp' | 'strategy' | 'strategy_generated_at' | 'strategy_model' | 'business_plan' | 'business_plan_updated_at' | 'brand_identity' | 'status'>>
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('org_marketing_profiles')
    .upsert(
      {
        org_id: orgId,
        created_by: user?.id,
        ...updates,
      },
      { onConflict: 'org_id' }
    )
    .select()
    .single()

  if (error) throw error
  return data as MarketingProfile
}

export async function saveBriefing(orgId: string, answers: BriefingAnswers, completed: boolean) {
  return upsertMarketingProfile(orgId, {
    briefing: answers as unknown as BriefingAnswers,
    briefing_completed_at: completed ? new Date().toISOString() : null,
    status: completed ? 'briefing_done' : 'draft',
  })
}

export async function saveStrategy(orgId: string, persona: Persona, icp: ICP, strategy: FullStrategy, model: string) {
  return upsertMarketingProfile(orgId, {
    persona: persona as unknown as Persona,
    icp: icp as unknown as ICP,
    strategy: strategy as unknown as FullStrategy,
    strategy_generated_at: new Date().toISOString(),
    strategy_model: model,
    status: 'strategy_generated',
  })
}

export async function saveBusinessPlan(orgId: string, plan: BusinessPlan) {
  return upsertMarketingProfile(orgId, {
    business_plan: plan as unknown as BusinessPlan,
    business_plan_updated_at: new Date().toISOString(),
    status: 'complete',
  })
}

export async function saveBrandIdentity(orgId: string, brand: BrandIdentity) {
  return upsertMarketingProfile(orgId, {
    brand_identity: brand as unknown as BrandIdentity,
  })
}

export async function getIndustryBenchmarks() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('industry_benchmarks')
    .select('*')
    .order('segment_label')

  if (error) throw error
  return data as import('./types').IndustryBenchmark[]
}
