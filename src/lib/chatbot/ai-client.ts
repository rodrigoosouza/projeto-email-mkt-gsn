const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''

export async function generateAIResponse(
  systemPrompt: string,
  conversationHistory: { role: string; content: string }[],
  userMessage: string,
  model: string = 'anthropic/claude-haiku-4.5'
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    console.log('[DEV] AI response mock for:', userMessage)
    return 'Obrigado pela sua mensagem! Um atendente ira responder em breve.'
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content:
            systemPrompt ||
            'Voce e um assistente de atendimento ao cliente. Responda em portugues de forma educada e util.',
        },
        ...conversationHistory.map((m) => ({
          role: m.role === 'visitor' ? 'user' : 'assistant',
          content: m.content,
        })),
        { role: 'user', content: userMessage },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}
