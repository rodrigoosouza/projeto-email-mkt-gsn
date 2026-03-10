// ============================================================
// Client-side hook to load org marketing context
// For components that need briefing/ICP/persona data
// ============================================================

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOrganizationContext } from '@/contexts/organization-context'
import type { MarketingProfile, BriefingAnswers, Persona, ICP, BrandIdentity, FullStrategy } from '@/lib/marketing/types'

export interface ClientOrgContext {
  briefing: BriefingAnswers | null
  persona: Persona | null
  icp: ICP | null
  brand: BrandIdentity | null
  strategy: FullStrategy | null
  toneOfVoice: string | null
  loading: boolean
}

export function useOrgMarketingContext(): ClientOrgContext {
  const { currentOrg } = useOrganizationContext()
  const [profile, setProfile] = useState<MarketingProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentOrg?.id) {
      setLoading(false)
      return
    }

    const supabase = createClient()
    setLoading(true)

    supabase
      .from('org_marketing_profiles')
      .select('*')
      .eq('org_id', currentOrg.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error) setProfile(data as MarketingProfile | null)
        setLoading(false)
      })
  }, [currentOrg?.id])

  return {
    briefing: profile?.briefing || null,
    persona: profile?.persona || null,
    icp: profile?.icp || null,
    brand: profile?.brand_identity || null,
    strategy: profile?.strategy || null,
    toneOfVoice: profile?.brand_identity?.tone_of_voice || null,
    loading,
  }
}
