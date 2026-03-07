const GOOGLE_ADS_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || ''
const GOOGLE_ADS_CUSTOMER_ID = process.env.GOOGLE_ADS_CUSTOMER_ID || ''

export async function createGoogleAudience(name: string): Promise<string> {
  if (!GOOGLE_ADS_TOKEN) {
    console.log('[DEV] Mock create Google audience:', name)
    return 'mock_google_audience_' + Date.now()
  }
  // In production, use Google Ads API client library
  // This is a simplified placeholder
  console.log(`[Google Ads] Create audience "${name}" for customer ${GOOGLE_ADS_CUSTOMER_ID}`)
  return `google_audience_${Date.now()}`
}

export async function syncGoogleAudience(audienceId: string, emails: string[]): Promise<{ processed: number }> {
  if (!GOOGLE_ADS_TOKEN) {
    console.log('[DEV] Mock sync Google audience:', audienceId, emails.length)
    return { processed: emails.length }
  }
  console.log(`[Google Ads] Sync ${emails.length} emails to audience ${audienceId}`)
  return { processed: emails.length }
}
