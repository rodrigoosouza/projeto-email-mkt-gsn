import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateAIResponse } from '@/lib/chatbot/ai-client'
import { getOrgContext } from '@/lib/supabase/org-context'
import type { ChatbotConfig, ChatbotMessage } from '@/lib/types'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { message, visitor_id, conversation_id } = body as {
      message: string
      visitor_id?: string
      conversation_id?: string
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Mensagem e obrigatoria' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const supabase = createAdminClient()

    // Fetch chatbot config
    const { data: config, error: configError } = await supabase
      .from('chatbot_configs')
      .select('*')
      .eq('id', id)
      .single()

    if (configError || !config) {
      return NextResponse.json(
        { error: 'Chatbot nao encontrado' },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    const chatbot = config as ChatbotConfig

    if (!chatbot.is_active) {
      return NextResponse.json(
        { error: 'Chatbot inativo' },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    // Get or create conversation
    let activeConversationId = conversation_id
    if (!activeConversationId) {
      const { data: conv, error: convError } = await supabase
        .from('chatbot_conversations')
        .insert({
          org_id: chatbot.org_id,
          chatbot_id: chatbot.id,
          visitor_id: visitor_id || null,
          status: 'open',
          metadata: {},
        })
        .select()
        .single()

      if (convError) {
        return NextResponse.json(
          { error: 'Erro ao criar conversa' },
          { status: 500, headers: CORS_HEADERS }
        )
      }
      activeConversationId = conv.id
    }

    // Save visitor message
    await supabase.from('chatbot_messages').insert({
      conversation_id: activeConversationId,
      org_id: chatbot.org_id,
      role: 'visitor',
      content: message,
      metadata: {},
    })

    // Try rule match first
    const { data: rules } = await supabase
      .from('chatbot_rules')
      .select('trigger_pattern, response_text')
      .eq('chatbot_id', chatbot.id)
      .eq('is_active', true)
      .order('priority', { ascending: true })

    let responseText: string | null = null
    const lowerMessage = message.toLowerCase()

    if (rules && rules.length > 0) {
      for (const rule of rules) {
        if (lowerMessage.includes(rule.trigger_pattern.toLowerCase())) {
          responseText = rule.response_text
          break
        }
      }
    }

    // Try AI if no rule match
    if (!responseText && chatbot.ai_enabled) {
      try {
        // Fetch conversation history
        const { data: history } = await supabase
          .from('chatbot_messages')
          .select('role, content')
          .eq('conversation_id', activeConversationId)
          .order('created_at', { ascending: true })
          .limit(20)

        const conversationHistory = (history || [])
          .filter((m: any) => m.content !== message || m.role !== 'visitor')
          .map((m: any) => ({ role: m.role, content: m.content }))

        // Enrich system prompt with org context (briefing, ICP, persona)
        let systemPrompt = chatbot.ai_system_prompt || ''
        const orgContext = await getOrgContext(chatbot.org_id)
        if (orgContext?.summary) {
          systemPrompt = `CONTEXTO DA EMPRESA:\n${orgContext.summary}\n\n${systemPrompt}`
        }

        responseText = await generateAIResponse(
          systemPrompt,
          conversationHistory,
          message,
          chatbot.ai_model || 'anthropic/claude-haiku-4-5-20251001'
        )
      } catch (aiError) {
        console.error('Erro na resposta AI:', aiError)
        responseText = 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.'
      }
    }

    // Default message if nothing matched
    if (!responseText) {
      responseText =
        'Obrigado pela sua mensagem! Um atendente ira responder em breve.'
    }

    // Save bot response
    await supabase.from('chatbot_messages').insert({
      conversation_id: activeConversationId,
      org_id: chatbot.org_id,
      role: 'bot',
      content: responseText,
      metadata: {},
    })

    // Update conversation timestamp
    await supabase
      .from('chatbot_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', activeConversationId)

    return NextResponse.json(
      {
        response: responseText,
        conversation_id: activeConversationId,
      },
      { headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error('Erro no chat:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
