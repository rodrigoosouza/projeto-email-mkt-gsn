const MAILERSEND_API_URL = 'https://api.mailersend.com/v1'

interface SendEmailParams {
  from: { email: string; name: string }
  to: { email: string; name?: string }[]
  subject: string
  html: string
  personalization?: { email: string; data: Record<string, string> }[]
}

export async function sendEmail(params: SendEmailParams) {
  const apiKey = process.env.MAILERSEND_API_KEY
  if (!apiKey) throw new Error('MAILERSEND_API_KEY not configured')

  const response = await fetch(`${MAILERSEND_API_URL}/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: params.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      personalization: params.personalization,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      `MailerSend error: ${response.status} ${JSON.stringify(error)}`
    )
  }

  // MailerSend returns 202 with x-message-id header
  const messageId = response.headers.get('x-message-id')
  return { messageId }
}

export async function sendBulkEmail(params: SendEmailParams[]) {
  const apiKey = process.env.MAILERSEND_API_KEY
  if (!apiKey) throw new Error('MAILERSEND_API_KEY not configured')

  const response = await fetch(`${MAILERSEND_API_URL}/bulk-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      `MailerSend bulk error: ${response.status} ${JSON.stringify(error)}`
    )
  }

  const data = await response.json()
  return { bulkEmailId: data.bulk_email_id as string }
}
