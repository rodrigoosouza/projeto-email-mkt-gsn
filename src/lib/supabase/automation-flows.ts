import { createClient } from './client'

export interface AutomationFlow {
  id: string
  org_id: string
  name: string
  description: string | null
  channel: 'whatsapp' | 'email' | 'sms'
  trigger_type: string
  trigger_config: Record<string, unknown>
  status: 'draft' | 'active' | 'paused' | 'archived'
  flow_data: FlowData
  stats: { total_entered: number; total_completed: number; total_active: number }
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface FlowNode {
  id: string
  type: 'message' | 'condition' | 'delay' | 'action' | 'webhook' | 'tag' | 'trigger'
  position: { x: number; y: number }
  data: Record<string, unknown>
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  label?: string
}

export interface FlowData {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

export async function getAutomationFlows(orgId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('automation_flows')
    .select('*')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data as AutomationFlow[]
}

export async function getAutomationFlow(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('automation_flows')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as AutomationFlow
}

export async function createAutomationFlow(
  orgId: string,
  flow: Pick<AutomationFlow, 'name' | 'description' | 'channel' | 'trigger_type'>
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('automation_flows')
    .insert({
      org_id: orgId,
      name: flow.name,
      description: flow.description,
      channel: flow.channel,
      trigger_type: flow.trigger_type,
      created_by: user?.id,
      flow_data: {
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 250, y: 50 },
            data: { label: 'Inicio', trigger_type: flow.trigger_type },
          },
        ],
        edges: [],
      },
    })
    .select()
    .single()

  if (error) throw error
  return data as AutomationFlow
}

export async function updateAutomationFlow(
  id: string,
  updates: Partial<Pick<AutomationFlow, 'name' | 'description' | 'status' | 'flow_data' | 'trigger_config'>>
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('automation_flows')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as AutomationFlow
}

export async function deleteAutomationFlow(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('automation_flows')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Lead Tags CRUD
export async function getLeadTags(orgId: string, leadId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('lead_tags')
    .select('*')
    .eq('org_id', orgId)
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function addLeadTag(orgId: string, leadId: string, tag: string, source: string = 'manual') {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('lead_tags')
    .upsert(
      { org_id: orgId, lead_id: leadId, tag, source },
      { onConflict: 'org_id,lead_id,tag' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

export async function removeLeadTag(orgId: string, leadId: string, tag: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('lead_tags')
    .delete()
    .eq('org_id', orgId)
    .eq('lead_id', leadId)
    .eq('tag', tag)

  if (error) throw error
}

// Tag Definitions CRUD
export async function getTagDefinitions(orgId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tag_definitions')
    .select('*')
    .eq('org_id', orgId)
    .order('name')

  if (error) throw error
  return data
}

export async function createTagDefinition(orgId: string, name: string, color: string = '#6b7280', description?: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tag_definitions')
    .insert({ org_id: orgId, name, color, description })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTagDefinition(orgId: string, name: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('tag_definitions')
    .delete()
    .eq('org_id', orgId)
    .eq('name', name)

  if (error) throw error
}
