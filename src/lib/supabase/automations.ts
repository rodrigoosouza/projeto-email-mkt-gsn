import { createClient } from '@/lib/supabase/client'
import type { Automation, AutomationLog } from '@/lib/types'

export async function getAutomations(orgId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('automations')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Automation[]
}

export async function getAutomation(automationId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('automations')
    .select('*')
    .eq('id', automationId)
    .single()

  if (error) throw error
  return data as Automation
}

export async function createAutomation(
  orgId: string,
  userId: string,
  automation: {
    name: string
    description?: string
    trigger_type: string
    trigger_config?: Record<string, any>
    actions: any[]
  }
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('automations')
    .insert({
      org_id: orgId,
      name: automation.name,
      description: automation.description || null,
      trigger_type: automation.trigger_type,
      trigger_config: automation.trigger_config || {},
      actions: automation.actions,
      created_by: userId,
    })
    .select()
    .single()

  if (error) throw error
  return data as Automation
}

export async function updateAutomation(
  automationId: string,
  updates: Partial<Pick<Automation, 'name' | 'description' | 'trigger_type' | 'trigger_config' | 'actions' | 'is_active' | 'n8n_workflow_id'>>
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('automations')
    .update(updates)
    .eq('id', automationId)
    .select()
    .single()

  if (error) throw error
  return data as Automation
}

export async function deleteAutomation(automationId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('automations')
    .delete()
    .eq('id', automationId)

  if (error) throw error
}

export async function toggleAutomation(automationId: string, isActive: boolean) {
  return updateAutomation(automationId, { is_active: isActive })
}

export async function getAutomationLogs(automationId: string, limit = 50, offset = 0) {
  const supabase = createClient()
  const { data, error, count } = await supabase
    .from('automation_logs')
    .select('*', { count: 'exact' })
    .eq('automation_id', automationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return { logs: data as AutomationLog[], count: count || 0 }
}

export async function logAutomationExecution(
  automationId: string,
  orgId: string,
  log: {
    lead_id?: string
    status: 'success' | 'error' | 'skipped'
    trigger_data?: Record<string, any>
    actions_executed?: Record<string, any>[]
    error_message?: string
    duration_ms?: number
  }
) {
  const supabase = createClient()
  const { error } = await supabase
    .from('automation_logs')
    .insert({
      automation_id: automationId,
      org_id: orgId,
      ...log,
    })

  if (error) throw error

  // Increment execution count — fallback if RPC doesn't exist
  try {
    const { error: rpcError } = await supabase.rpc('increment_automation_count', { automation_id: automationId })
    if (rpcError) {
      await supabase
        .from('automations')
        .update({ last_executed_at: new Date().toISOString() })
        .eq('id', automationId)
    }
  } catch {
    // Silently fail
  }
}
