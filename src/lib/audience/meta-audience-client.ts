const META_ACCESS_TOKEN = process.env.META_SYSTEM_ACCESS_TOKEN || ''
const META_AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID || ''
const META_API_VERSION = 'v19.0'

export async function createCustomAudience(name: string, description: string): Promise<string> {
  if (!META_ACCESS_TOKEN) {
    console.log('[DEV] Mock create audience:', name)
    return 'mock_audience_' + Date.now()
  }
  const res = await fetch(`https://graph.facebook.com/${META_API_VERSION}/act_${META_AD_ACCOUNT_ID}/customaudiences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: META_ACCESS_TOKEN,
      name,
      description,
      subtype: 'CUSTOM',
      customer_file_source: 'USER_PROVIDED_ONLY',
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.id
}

export async function addUsersToAudience(audienceId: string, emails: string[]): Promise<{ num_received: number }> {
  if (!META_ACCESS_TOKEN) {
    console.log('[DEV] Mock add users to audience:', audienceId, emails.length)
    return { num_received: emails.length }
  }
  // Hash emails with SHA256 for Meta
  const crypto = await import('crypto')
  const schema = ['EMAIL']
  const data = emails.map(e => [crypto.createHash('sha256').update(e.toLowerCase().trim()).digest('hex')])

  const res = await fetch(`https://graph.facebook.com/${META_API_VERSION}/${audienceId}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: META_ACCESS_TOKEN,
      payload: { schema, data },
    }),
  })
  const result = await res.json()
  if (result.error) throw new Error(result.error.message)
  return result
}

export async function removeUsersFromAudience(audienceId: string, emails: string[]): Promise<void> {
  if (!META_ACCESS_TOKEN) {
    console.log('[DEV] Mock remove users from audience:', audienceId, emails.length)
    return
  }
  const crypto = await import('crypto')
  const schema = ['EMAIL']
  const data = emails.map(e => [crypto.createHash('sha256').update(e.toLowerCase().trim()).digest('hex')])

  await fetch(`https://graph.facebook.com/${META_API_VERSION}/${audienceId}/users`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: META_ACCESS_TOKEN,
      payload: { schema, data },
    }),
  })
}
