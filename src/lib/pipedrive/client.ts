// Pipedrive API client
// Docs: https://developers.pipedrive.com/docs/api/v1

const PIPEDRIVE_API_BASE = 'https://api.pipedrive.com/v1'

export interface PipedriveConfig {
  api_token: string
  filter_id?: number
}

interface PipedriveResponse<T> {
  success: boolean
  data: T | null
  additional_data?: {
    pagination?: {
      start: number
      limit: number
      more_items_in_collection: boolean
      next_start?: number
    }
  }
  error?: string
}

async function fetchPipedrive<T>(
  endpoint: string,
  token: string,
  params?: Record<string, string>
): Promise<T[]> {
  const allData: T[] = []
  let start = 0
  const limit = 500
  let hasMore = true

  while (hasMore) {
    const queryParams = new URLSearchParams({
      api_token: token,
      start: String(start),
      limit: String(limit),
      ...params,
    })

    const response = await fetch(`${PIPEDRIVE_API_BASE}${endpoint}?${queryParams}`)

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Pipedrive API error: ${response.status} - ${error}`)
    }

    const json: PipedriveResponse<T[]> = await response.json()

    if (!json.success) {
      throw new Error(`Pipedrive API error: ${json.error}`)
    }

    if (json.data && json.data.length > 0) {
      allData.push(...json.data)
    }

    hasMore = json.additional_data?.pagination?.more_items_in_collection || false
    start = json.additional_data?.pagination?.next_start || start + limit
  }

  return allData
}

// Get all deals (optionally filtered)
export async function getDeals(config: PipedriveConfig) {
  const params: Record<string, string> = {}
  if (config.filter_id) {
    params.filter_id = String(config.filter_id)
  }
  return fetchPipedrive<any>('/deals', config.api_token, params)
}

// Get deals updated after a specific date
export async function getRecentDeals(config: PipedriveConfig, since: string) {
  const params: Record<string, string> = {
    since_timestamp: since,
    sort: 'update_time DESC',
  }
  if (config.filter_id) {
    params.filter_id = String(config.filter_id)
  }
  return fetchPipedrive<any>('/recents', config.api_token, {
    ...params,
    items: 'deal',
  })
}

// Get all stages (pipeline stages)
export async function getStages(config: PipedriveConfig, pipelineId?: number) {
  const params: Record<string, string> = {}
  if (pipelineId) {
    params.pipeline_id = String(pipelineId)
  }
  return fetchPipedrive<any>('/stages', config.api_token, params)
}

// Get all pipelines
export async function getPipelines(config: PipedriveConfig) {
  return fetchPipedrive<any>('/pipelines', config.api_token)
}

// Get deal details with participants
export async function getDeal(config: PipedriveConfig, dealId: number) {
  const queryParams = new URLSearchParams({ api_token: config.api_token })
  const response = await fetch(`${PIPEDRIVE_API_BASE}/deals/${dealId}?${queryParams}`)

  if (!response.ok) {
    throw new Error(`Pipedrive API error: ${response.status}`)
  }

  const json: PipedriveResponse<any> = await response.json()
  return json.data
}

// Get person (contact) by ID
export async function getPerson(config: PipedriveConfig, personId: number) {
  const queryParams = new URLSearchParams({ api_token: config.api_token })
  const response = await fetch(`${PIPEDRIVE_API_BASE}/persons/${personId}?${queryParams}`)

  if (!response.ok) return null

  const json: PipedriveResponse<any> = await response.json()
  return json.data
}

// Get all filters
export async function getFilters(config: PipedriveConfig) {
  return fetchPipedrive<any>('/filters', config.api_token, { type: 'deals' })
}

// Test API connection
export async function testConnection(apiToken: string): Promise<{ success: boolean; user?: string; error?: string }> {
  try {
    const queryParams = new URLSearchParams({ api_token: apiToken })
    const response = await fetch(`${PIPEDRIVE_API_BASE}/users/me?${queryParams}`)

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` }
    }

    const json = await response.json()
    if (!json.success) {
      return { success: false, error: json.error || 'Token inválido' }
    }

    return {
      success: true,
      user: json.data?.name || json.data?.email,
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// Extract person email from Pipedrive deal data
export function extractPersonEmail(deal: any): string | null {
  if (deal.person_id?.email?.[0]?.value) return deal.person_id.email[0].value
  return null
}

// Extract person phone from Pipedrive deal data
export function extractPersonPhone(deal: any): string | null {
  if (deal.person_id?.phone?.[0]?.value) return deal.person_id.phone[0].value
  return null
}

// Extract person name
export function extractPersonName(deal: any): string | null {
  if (deal.person_id?.name) return deal.person_id.name
  return null
}

// Extract org name
export function extractOrgName(deal: any): string | null {
  if (deal.org_id?.name) return deal.org_id.name
  return null
}
