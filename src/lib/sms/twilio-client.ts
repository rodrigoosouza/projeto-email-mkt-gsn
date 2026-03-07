const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || ''
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || ''
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || ''

const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01'

export async function sendSms(to: string, body: string) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.log(`[SMS DEV] To: ${to}, Body: ${body}`)
    return { sid: `dev_${Date.now()}`, status: 'queued' }
  }

  const url = `${TWILIO_API_BASE}/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: to,
      From: TWILIO_PHONE_NUMBER,
      Body: body,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Twilio error: ${response.status} - ${error}`)
  }

  return response.json()
}

export async function getMessageStatus(messageSid: string) {
  if (!TWILIO_ACCOUNT_SID) return null

  const url = `${TWILIO_API_BASE}/Accounts/${TWILIO_ACCOUNT_SID}/Messages/${messageSid}.json`
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')

  const response = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
  })

  if (!response.ok) return null
  return response.json()
}
