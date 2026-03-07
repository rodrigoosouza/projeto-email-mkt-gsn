import { createClient } from './client'
import type {
  ChatbotConfig,
  ChatbotRule,
  ChatbotConversation,
  ChatbotMessage,
} from '@/lib/types'

// ============= CONFIGS =============

export async function getChatbotConfigs(orgId: string): Promise<ChatbotConfig[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('chatbot_configs')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Erro ao listar chatbots: ${error.message}`)
  return (data || []) as ChatbotConfig[]
}

export async function getChatbotConfig(id: string): Promise<ChatbotConfig> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('chatbot_configs')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(`Erro ao buscar chatbot: ${error.message}`)
  return data as ChatbotConfig
}

export async function createChatbotConfig(
  config: Omit<ChatbotConfig, 'id' | 'created_at' | 'updated_at'>
): Promise<ChatbotConfig> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('chatbot_configs')
    .insert(config)
    .select()
    .single()

  if (error) throw new Error(`Erro ao criar chatbot: ${error.message}`)
  return data as ChatbotConfig
}

export async function updateChatbotConfig(
  id: string,
  updates: Partial<ChatbotConfig>
): Promise<ChatbotConfig> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('chatbot_configs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Erro ao atualizar chatbot: ${error.message}`)
  return data as ChatbotConfig
}

export async function deleteChatbotConfig(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('chatbot_configs')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Erro ao excluir chatbot: ${error.message}`)
}

// ============= RULES =============

export async function getChatbotRules(chatbotId: string): Promise<ChatbotRule[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('chatbot_rules')
    .select('*')
    .eq('chatbot_id', chatbotId)
    .order('priority', { ascending: true })

  if (error) throw new Error(`Erro ao listar regras: ${error.message}`)
  return (data || []) as ChatbotRule[]
}

export async function createChatbotRule(
  rule: Omit<ChatbotRule, 'id' | 'created_at'>
): Promise<ChatbotRule> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('chatbot_rules')
    .insert(rule)
    .select()
    .single()

  if (error) throw new Error(`Erro ao criar regra: ${error.message}`)
  return data as ChatbotRule
}

export async function updateChatbotRule(
  id: string,
  updates: Partial<ChatbotRule>
): Promise<ChatbotRule> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('chatbot_rules')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Erro ao atualizar regra: ${error.message}`)
  return data as ChatbotRule
}

export async function deleteChatbotRule(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('chatbot_rules')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Erro ao excluir regra: ${error.message}`)
}

// ============= CONVERSATIONS =============

export async function getChatbotConversations(
  chatbotId: string
): Promise<ChatbotConversation[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('chatbot_conversations')
    .select('*')
    .eq('chatbot_id', chatbotId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(`Erro ao listar conversas: ${error.message}`)
  return (data || []) as ChatbotConversation[]
}

// ============= MESSAGES =============

export async function getChatbotMessages(
  conversationId: string
): Promise<ChatbotMessage[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('chatbot_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Erro ao listar mensagens: ${error.message}`)
  return (data || []) as ChatbotMessage[]
}

export async function createChatbotMessage(
  message: Omit<ChatbotMessage, 'id' | 'created_at'>
): Promise<ChatbotMessage> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('chatbot_messages')
    .insert(message)
    .select()
    .single()

  if (error) throw new Error(`Erro ao criar mensagem: ${error.message}`)
  return data as ChatbotMessage
}

// ============= RULE MATCHING =============

export async function matchRule(
  chatbotId: string,
  message: string
): Promise<string | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('chatbot_rules')
    .select('trigger_pattern, response_text')
    .eq('chatbot_id', chatbotId)
    .eq('is_active', true)
    .order('priority', { ascending: true })

  if (error) throw new Error(`Erro ao buscar regras: ${error.message}`)
  if (!data || data.length === 0) return null

  const lowerMessage = message.toLowerCase()
  for (const rule of data) {
    if (lowerMessage.includes(rule.trigger_pattern.toLowerCase())) {
      return rule.response_text
    }
  }

  return null
}
