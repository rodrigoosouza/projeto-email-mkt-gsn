import { createClient } from '@/lib/supabase/client'
import { createAdminClient } from '@/lib/supabase/admin'
import type { LeadScoringRule } from '@/lib/types'

export async function getScoringRules(orgId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('lead_scoring_rules')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as LeadScoringRule[]
}

export async function createScoringRule(
  orgId: string,
  rule: {
    name: string
    description?: string
    condition_type: string
    condition_value?: string
    score_change: number
  }
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('lead_scoring_rules')
    .insert({
      org_id: orgId,
      name: rule.name,
      description: rule.description || null,
      condition_type: rule.condition_type,
      condition_value: rule.condition_value || null,
      score_change: rule.score_change,
    })
    .select()
    .single()

  if (error) throw error
  return data as LeadScoringRule
}

export async function updateScoringRule(
  ruleId: string,
  updates: Partial<Pick<LeadScoringRule, 'name' | 'description' | 'condition_value' | 'score_change' | 'is_active'>>
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('lead_scoring_rules')
    .update(updates)
    .eq('id', ruleId)
    .select()
    .single()

  if (error) throw error
  return data as LeadScoringRule
}

export async function deleteScoringRule(ruleId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('lead_scoring_rules')
    .delete()
    .eq('id', ruleId)

  if (error) throw error
}

// Apply scoring rules to a lead based on an event (client-side)
export async function applyScoring(orgId: string, leadId: string, eventType: string, eventValue?: string) {
  const supabase = createClient()
  return applyScoringSql(supabase, orgId, leadId, eventType, eventValue)
}

// Apply scoring rules using admin client (for webhooks / server-side)
export async function applyScoringAdmin(orgId: string, leadId: string, eventType: string, eventValue?: string) {
  const supabase = createAdminClient()
  return applyScoringSql(supabase, orgId, leadId, eventType, eventValue)
}

// Shared scoring logic that accepts any supabase client instance
async function applyScoringSql(
  supabase: ReturnType<typeof createClient> | ReturnType<typeof createAdminClient>,
  orgId: string,
  leadId: string,
  eventType: string,
  eventValue?: string
) {
  // Get active rules for this org
  const { data: rules } = await supabase
    .from('lead_scoring_rules')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)

  if (!rules || rules.length === 0) return 0

  let totalChange = 0

  for (const rule of rules) {
    let matches = false

    // Direct event type match (email_opened, email_clicked, etc.)
    if (rule.condition_type === eventType) {
      if (rule.condition_value) {
        // If rule has a condition_value, check if eventValue matches
        matches = eventValue === rule.condition_value
      } else {
        matches = true
      }
    }

    if (matches) {
      totalChange += rule.score_change
    }
  }

  if (totalChange !== 0) {
    // Get current score
    const { data: lead } = await supabase
      .from('leads')
      .select('score')
      .eq('id', leadId)
      .single()

    if (lead) {
      const newScore = Math.max(0, Math.min(100, (lead.score ?? 0) + totalChange))
      await supabase
        .from('leads')
        .update({ score: newScore })
        .eq('id', leadId)

      // Log score change event
      await supabase
        .from('lead_events')
        .insert({
          org_id: orgId,
          lead_id: leadId,
          event_type: 'score_changed',
          title: `Score ${totalChange > 0 ? 'aumentou' : 'diminuiu'} ${Math.abs(totalChange)} pontos`,
          description: `Score: ${lead.score ?? 0} → ${newScore}`,
          metadata: { previous_score: lead.score ?? 0, new_score: newScore, change: totalChange },
        })
        .then(() => {}) // silent
    }
  }

  return totalChange
}
