const WA_API_VERSION = 'v19.0'
const WA_API_BASE = `https://graph.facebook.com/${WA_API_VERSION}`

interface WhatsAppConfig {
  phone_number_id: string
  access_token: string
  business_account_id?: string
}

function getConfig(): WhatsAppConfig {
  return {
    phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    access_token: process.env.WHATSAPP_ACCESS_TOKEN || '',
    business_account_id: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  }
}

function getHeaders(token?: string) {
  const config = getConfig()
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token || config.access_token}`,
  }
}

export async function sendTextMessage(to: string, text: string, token?: string) {
  const config = getConfig()
  const response = await fetch(`${WA_API_BASE}/${config.phone_number_id}/messages`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  })
  if (!response.ok) throw new Error(`WhatsApp API error: ${response.status} ${await response.text()}`)
  return response.json()
}

export async function sendTemplateMessage(
  to: string,
  templateName: string,
  language: string,
  components?: any[],
  token?: string
) {
  const config = getConfig()
  const body: any = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: language },
    },
  }
  if (components) body.template.components = components

  const response = await fetch(`${WA_API_BASE}/${config.phone_number_id}/messages`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`WhatsApp API error: ${response.status} ${await response.text()}`)
  return response.json()
}

export async function sendInteractiveMessage(to: string, interactive: any, token?: string) {
  const config = getConfig()
  const response = await fetch(`${WA_API_BASE}/${config.phone_number_id}/messages`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive,
    }),
  })
  if (!response.ok) throw new Error(`WhatsApp API error: ${response.status} ${await response.text()}`)
  return response.json()
}

export async function sendMediaMessage(
  to: string,
  type: 'image' | 'document' | 'video' | 'audio',
  mediaUrl: string,
  caption?: string,
  token?: string
) {
  const config = getConfig()
  const body: any = {
    messaging_product: 'whatsapp',
    to,
    type,
    [type]: { link: mediaUrl },
  }
  if (caption && (type === 'image' || type === 'document')) {
    body[type].caption = caption
  }

  const response = await fetch(`${WA_API_BASE}/${config.phone_number_id}/messages`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`WhatsApp API error: ${response.status} ${await response.text()}`)
  return response.json()
}

export async function markAsRead(messageId: string, token?: string) {
  const config = getConfig()
  const response = await fetch(`${WA_API_BASE}/${config.phone_number_id}/messages`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  })
  if (!response.ok) throw new Error(`WhatsApp API error: ${response.status}`)
  return response.json()
}

export async function getMessageTemplates(token?: string) {
  const config = getConfig()
  if (!config.business_account_id) throw new Error('WHATSAPP_BUSINESS_ACCOUNT_ID not configured')

  const response = await fetch(
    `${WA_API_BASE}/${config.business_account_id}/message_templates?limit=100`,
    { headers: getHeaders(token) }
  )
  if (!response.ok) throw new Error(`WhatsApp API error: ${response.status}`)
  return response.json()
}

export async function createMessageTemplate(
  template: { name: string; language: string; category: string; components: any[] },
  token?: string
) {
  const config = getConfig()
  if (!config.business_account_id) throw new Error('WHATSAPP_BUSINESS_ACCOUNT_ID not configured')

  const response = await fetch(
    `${WA_API_BASE}/${config.business_account_id}/message_templates`,
    {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(template),
    }
  )
  if (!response.ok) throw new Error(`WhatsApp API error: ${response.status} ${await response.text()}`)
  return response.json()
}
