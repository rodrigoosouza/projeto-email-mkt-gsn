// n8n REST API client
// Docs: https://docs.n8n.io/api/

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678'
const N8N_API_KEY = process.env.N8N_API_KEY || ''

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (N8N_API_KEY) headers['X-N8N-API-KEY'] = N8N_API_KEY
  return headers
}

export async function getWorkflows() {
  const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows`, {
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error(`n8n API error: ${response.status}`)
  return response.json()
}

export async function getWorkflow(workflowId: string) {
  const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${workflowId}`, {
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error(`n8n API error: ${response.status}`)
  return response.json()
}

export async function activateWorkflow(workflowId: string) {
  const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${workflowId}/activate`, {
    method: 'POST',
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error(`n8n API error: ${response.status}`)
  return response.json()
}

export async function deactivateWorkflow(workflowId: string) {
  const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${workflowId}/deactivate`, {
    method: 'POST',
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error(`n8n API error: ${response.status}`)
  return response.json()
}

export async function executeWorkflow(workflowId: string, data: Record<string, any>) {
  const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${workflowId}/run`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ data }),
  })
  if (!response.ok) throw new Error(`n8n API error: ${response.status}`)
  return response.json()
}

// Trigger a webhook-based workflow
export async function triggerWebhook(webhookPath: string, data: Record<string, any>) {
  const url = `${N8N_BASE_URL}/webhook/${webhookPath}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    // Webhook might not exist yet — fail silently
    console.error(`n8n webhook error: ${response.status} for ${webhookPath}`)
    return null
  }
  return response.json()
}

export async function getExecutions(workflowId?: string, limit = 20) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (workflowId) params.set('workflowId', workflowId)

  const response = await fetch(`${N8N_BASE_URL}/api/v1/executions?${params}`, {
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error(`n8n API error: ${response.status}`)
  return response.json()
}
