/**
 * Unified AI Client — supports Anthropic (direct), OpenAI, and OpenRouter.
 * Priority: ANTHROPIC_API_KEY > OPENAI_API_KEY > OPENROUTER_API_KEY
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''

interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface AIRequestOptions {
  messages: AIMessage[]
  maxTokens?: number
  temperature?: number
  /** Override model selection. If not set, uses best available. */
  model?: string
}

interface AIResponse {
  content: string
  model: string
  provider: 'anthropic' | 'openai' | 'openrouter'
}

// Model mapping per provider
const MODEL_MAP = {
  anthropic: {
    default: 'claude-sonnet-4-20250514',
    fast: 'claude-haiku-4-5-20251001',
  },
  openai: {
    default: 'gpt-4o',
    fast: 'gpt-4o-mini',
  },
  openrouter: {
    default: 'anthropic/claude-sonnet-4',
    fast: 'anthropic/claude-haiku-4.5',
  },
}

function getProvider(): 'anthropic' | 'openai' | 'openrouter' {
  if (ANTHROPIC_API_KEY) return 'anthropic'
  if (OPENAI_API_KEY) return 'openai'
  if (OPENROUTER_API_KEY) return 'openrouter'
  throw new Error('Nenhuma API key configurada (ANTHROPIC_API_KEY, OPENAI_API_KEY ou OPENROUTER_API_KEY)')
}

function getModel(provider: string, speed: 'default' | 'fast' = 'default'): string {
  return MODEL_MAP[provider as keyof typeof MODEL_MAP]?.[speed] || MODEL_MAP.openrouter[speed]
}

async function callAnthropic(messages: AIMessage[], maxTokens: number, temperature: number, model: string): Promise<string> {
  const systemMsg = messages.find((m) => m.role === 'system')
  const nonSystemMsgs = messages.filter((m) => m.role !== 'system')

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages: nonSystemMsgs.map((m) => ({ role: m.role, content: m.content })),
  }

  if (systemMsg) {
    body.system = systemMsg.content
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('Anthropic API error:', err)
    throw new Error(`Anthropic API error: ${response.status}`)
  }

  const data = await response.json()
  return data.content?.[0]?.text || ''
}

async function callOpenAI(messages: AIMessage[], maxTokens: number, temperature: number, model: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('OpenAI API error:', err)
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

async function callOpenRouter(messages: AIMessage[], maxTokens: number, temperature: number, model: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('OpenRouter API error:', err)
    throw new Error(`OpenRouter API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

/**
 * Generate AI response using the best available provider.
 * Tries Anthropic > OpenAI > OpenRouter in order.
 */
export async function generateAI(options: AIRequestOptions): Promise<AIResponse> {
  const { messages, maxTokens = 4000, temperature = 0.7 } = options

  const provider = getProvider()
  const model = options.model || getModel(provider)

  let content: string

  switch (provider) {
    case 'anthropic':
      content = await callAnthropic(messages, maxTokens, temperature, model)
      break
    case 'openai':
      content = await callOpenAI(messages, maxTokens, temperature, model)
      break
    case 'openrouter':
      content = await callOpenRouter(messages, maxTokens, temperature, model)
      break
  }

  return { content, model, provider }
}

/**
 * Parse JSON from AI response (handles markdown code blocks).
 */
export function parseAIJson(content: string): unknown {
  let jsonStr = content
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1]
  } else {
    const objMatch = content.match(/\{[\s\S]*\}/)
    if (objMatch) {
      jsonStr = objMatch[0]
    }
  }
  return JSON.parse(jsonStr)
}

/**
 * Get current provider info for display.
 */
export function getAIProviderInfo(): { provider: string; model: string } {
  try {
    const provider = getProvider()
    return { provider, model: getModel(provider) }
  } catch {
    return { provider: 'none', model: 'none' }
  }
}
