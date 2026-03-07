import { createAdminClient } from '@/lib/supabase/admin'
import { triggerWebhook } from '@/lib/n8n/client'
import type { Automation, AutomationAction } from '@/lib/types'

interface ExecutionContext {
  orgId: string
  leadId: string
  lead: Record<string, any>
  triggerData: Record<string, any>
}

export async function executeAutomation(automation: Automation, context: ExecutionContext) {
  const supabase = createAdminClient()
  const startTime = Date.now()
  const actionsExecuted: Record<string, any>[] = []

  try {
    // If linked to n8n workflow, trigger it
    if (automation.n8n_workflow_id) {
      await triggerWebhook(`automation-${automation.id}`, {
        automation_id: automation.id,
        org_id: context.orgId,
        lead_id: context.leadId,
        lead: context.lead,
        trigger: context.triggerData,
      })
      actionsExecuted.push({ type: 'n8n_webhook', status: 'triggered' })
    }

    // Execute built-in actions sequentially
    for (const action of automation.actions) {
      try {
        await executeAction(supabase, action, context)
        actionsExecuted.push({ type: action.type, status: 'success', config: action.config })
      } catch (error: any) {
        actionsExecuted.push({ type: action.type, status: 'error', error: error.message })
      }
    }

    // Log success
    await supabase.from('automation_logs').insert({
      automation_id: automation.id,
      org_id: context.orgId,
      lead_id: context.leadId,
      status: 'success',
      trigger_data: context.triggerData,
      actions_executed: actionsExecuted,
      duration_ms: Date.now() - startTime,
    })

    // Update execution count
    await supabase
      .from('automations')
      .update({
        execution_count: automation.execution_count + 1,
        last_executed_at: new Date().toISOString(),
      })
      .eq('id', automation.id)

  } catch (error: any) {
    await supabase.from('automation_logs').insert({
      automation_id: automation.id,
      org_id: context.orgId,
      lead_id: context.leadId,
      status: 'error',
      trigger_data: context.triggerData,
      actions_executed: actionsExecuted,
      error_message: error.message,
      duration_ms: Date.now() - startTime,
    })
  }
}

async function executeAction(supabase: any, action: AutomationAction, context: ExecutionContext) {
  const { type, config } = action

  switch (type) {
    case 'add_tag': {
      if (!config.tag_name) break
      // Find or create tag
      let { data: tag } = await supabase
        .from('lead_tags')
        .select('id')
        .eq('org_id', context.orgId)
        .eq('name', config.tag_name)
        .maybeSingle()

      if (!tag) {
        const { data: newTag } = await supabase
          .from('lead_tags')
          .insert({ org_id: context.orgId, name: config.tag_name, color: config.tag_color || '#3B82F6' })
          .select('id')
          .single()
        tag = newTag
      }

      if (tag) {
        await supabase
          .from('lead_tag_assignments')
          .upsert({ lead_id: context.leadId, tag_id: tag.id }, { onConflict: 'lead_id,tag_id' })
      }
      break
    }

    case 'remove_tag': {
      if (!config.tag_name) break
      const { data: tag } = await supabase
        .from('lead_tags')
        .select('id')
        .eq('org_id', context.orgId)
        .eq('name', config.tag_name)
        .maybeSingle()

      if (tag) {
        await supabase
          .from('lead_tag_assignments')
          .delete()
          .eq('lead_id', context.leadId)
          .eq('tag_id', tag.id)
      }
      break
    }

    case 'update_field': {
      if (!config.field_name || config.field_value === undefined) break
      const standardFields = ['first_name', 'last_name', 'phone', 'company', 'position', 'status']

      if (standardFields.includes(config.field_name)) {
        await supabase
          .from('leads')
          .update({ [config.field_name]: config.field_value })
          .eq('id', context.leadId)
      } else {
        // Update custom field
        const { data: lead } = await supabase
          .from('leads')
          .select('custom_fields')
          .eq('id', context.leadId)
          .single()

        if (lead) {
          const customFields = { ...(lead.custom_fields || {}), [config.field_name]: config.field_value }
          await supabase
            .from('leads')
            .update({ custom_fields: customFields })
            .eq('id', context.leadId)
        }
      }
      break
    }

    case 'update_score': {
      if (config.score_change === undefined) break
      const { data: lead } = await supabase
        .from('leads')
        .select('score')
        .eq('id', context.leadId)
        .single()

      if (lead) {
        const newScore = Math.max(0, Math.min(100, lead.score + config.score_change))
        await supabase
          .from('leads')
          .update({ score: newScore })
          .eq('id', context.leadId)
      }
      break
    }

    case 'send_email': {
      // This would integrate with the existing MailerSend client
      // For now, we record the intent — actual sending via campaign system
      break
    }

    case 'webhook': {
      if (!config.url) break
      await fetch(config.url, {
        method: config.method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: context.leadId,
          lead: context.lead,
          automation_id: context.triggerData.automation_id,
          ...config.payload,
        }),
      })
      break
    }

    case 'notify': {
      // Create a lead event as notification
      await supabase.from('lead_events').insert({
        org_id: context.orgId,
        lead_id: context.leadId,
        event_type: 'custom',
        title: config.title || 'Notificacao de automacao',
        description: config.message || 'Automacao executada',
        metadata: { automation_id: context.triggerData.automation_id },
      })
      break
    }

    case 'add_to_segment': {
      if (!config.segment_id) break
      await supabase
        .from('segment_memberships')
        .upsert(
          { segment_id: config.segment_id, lead_id: context.leadId },
          { onConflict: 'segment_id,lead_id' }
        )
      break
    }

    case 'remove_from_segment': {
      if (!config.segment_id) break
      await supabase
        .from('segment_memberships')
        .delete()
        .eq('segment_id', config.segment_id)
        .eq('lead_id', context.leadId)
      break
    }

    case 'wait': {
      // Wait actions are handled by n8n workflows
      // In built-in mode, we skip them
      break
    }
  }
}

// Find and execute matching automations for a trigger
export async function processAutomationTrigger(
  orgId: string,
  triggerType: string,
  leadId: string,
  triggerData: Record<string, any> = {}
) {
  const supabase = createAdminClient()

  // Get active automations matching this trigger
  const { data: automations } = await supabase
    .from('automations')
    .select('*')
    .eq('org_id', orgId)
    .eq('trigger_type', triggerType)
    .eq('is_active', true)

  if (!automations || automations.length === 0) return

  // Get lead data
  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (!lead) return

  for (const automation of automations) {
    // Check trigger conditions
    if (shouldTrigger(automation, triggerData)) {
      await executeAutomation(automation as Automation, {
        orgId,
        leadId,
        lead,
        triggerData: { ...triggerData, automation_id: automation.id },
      })
    }
  }
}

function shouldTrigger(automation: any, triggerData: Record<string, any>): boolean {
  const config = automation.trigger_config || {}

  switch (automation.trigger_type) {
    case 'tag_added':
    case 'tag_removed':
      // If specific tag is configured, check it
      if (config.tag_name && triggerData.tag_name !== config.tag_name) return false
      return true

    case 'score_threshold':
      if (config.threshold && triggerData.new_score !== undefined) {
        return triggerData.new_score >= config.threshold
      }
      return true

    case 'status_changed':
      if (config.new_status && triggerData.new_status !== config.new_status) return false
      return true

    case 'custom_event':
      if (config.event_name && triggerData.event_name !== config.event_name) return false
      return true

    default:
      return true
  }
}
