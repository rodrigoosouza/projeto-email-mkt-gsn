// Google Tag Manager Admin API client
// Creates containers, workspaces, tags, triggers, and variables for orgs

import { GoogleAuth } from 'google-auth-library'

const GTM_API_BASE = 'https://www.googleapis.com/tagmanager/v2'

// All 27 hidden fields captured from forms
const HIDDEN_FIELDS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'fbclid', 'referrer', 'landing_page', 'user_agent',
  'screen_resolution', 'viewport_size', 'device_type', 'browser', 'os',
  'city', 'region', 'country', 'ip_address', 'session_id',
  'client_id', 'first_visit', 'visit_count', 'time_on_site',
  'pages_viewed', 'scroll_depth', 'form_id',
]

interface GtmConfig {
  ga4MeasurementId?: string
  metaPixelId?: string
}

interface GtmResult {
  containerId: string
  containerPublicId: string
  workspaceId: string
}

function getAuth(): GoogleAuth | null {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!serviceAccountJson) {
    console.warn('[GTM-Admin] GOOGLE_SERVICE_ACCOUNT_JSON not set, skipping GTM setup')
    return null
  }

  try {
    const credentials = JSON.parse(serviceAccountJson)
    return new GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/tagmanager.edit.containers',
        'https://www.googleapis.com/auth/tagmanager.publish',
        'https://www.googleapis.com/auth/tagmanager.manage.accounts',
      ],
    })
  } catch (err) {
    console.error('[GTM-Admin] Failed to parse service account JSON:', err)
    return null
  }
}

async function getAccessToken(): Promise<string | null> {
  const auth = getAuth()
  if (!auth) return null

  try {
    const client = await auth.getClient()
    const token = await client.getAccessToken()
    return token.token || null
  } catch (err) {
    console.error('[GTM-Admin] Failed to get access token:', err)
    return null
  }
}

async function gtmFetch(path: string, options: RequestInit = {}): Promise<any | null> {
  const token = await getAccessToken()
  if (!token) return null

  try {
    const response = await fetch(`${GTM_API_BASE}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[GTM-Admin] API error ${response.status}: ${errorText}`)
      return null
    }

    return response.json()
  } catch (err) {
    console.error('[GTM-Admin] Request failed:', err)
    return null
  }
}

/**
 * Creates a new GTM container for an organization
 */
export async function createContainer(
  accountId: string,
  orgName: string
): Promise<{ containerId: string; containerPublicId: string } | null> {
  console.log(`[GTM-Admin] Creating container for "${orgName}" in account ${accountId}`)

  const result = await gtmFetch(`/accounts/${accountId}/containers`, {
    method: 'POST',
    body: JSON.stringify({
      name: `${orgName} - Auto`,
      usageContext: ['web'],
    }),
  })

  if (!result) return null

  const containerId = result.containerId
  const containerPublicId = result.publicId // e.g. GTM-XXXXXX

  console.log(`[GTM-Admin] Container created: ${containerPublicId} (ID: ${containerId})`)
  return { containerId, containerPublicId }
}

/**
 * Creates a workspace in a GTM container
 */
export async function createWorkspace(
  accountId: string,
  containerId: string
): Promise<string | null> {
  console.log(`[GTM-Admin] Creating workspace in container ${containerId}`)

  const result = await gtmFetch(
    `/accounts/${accountId}/containers/${containerId}/workspaces`,
    {
      method: 'POST',
      body: JSON.stringify({
        name: 'Auto Setup',
        description: 'Workspace criado automaticamente pela plataforma',
      }),
    }
  )

  if (!result) return null

  const workspaceId = result.workspaceId
  console.log(`[GTM-Admin] Workspace created: ${workspaceId}`)
  return workspaceId
}

/**
 * Sets up default tags, triggers, and variables in GTM
 */
export async function setupDefaultTags(
  accountId: string,
  containerId: string,
  workspaceId: string,
  config: GtmConfig
): Promise<boolean> {
  const basePath = `/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`

  console.log('[GTM-Admin] Setting up default tags, triggers, and variables...')

  // 1. Create form_submit_lead trigger (Custom Event)
  const trigger = await gtmFetch(`${basePath}/triggers`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'form_submit_lead',
      type: 'customEvent',
      customEventFilter: [
        {
          type: 'equals',
          parameter: [
            { type: 'template', key: 'arg0', value: '{{_event}}' },
            { type: 'template', key: 'arg1', value: 'form_submit_lead' },
          ],
        },
      ],
    }),
  })

  const triggerId = trigger?.triggerId
  if (!triggerId) {
    console.error('[GTM-Admin] Failed to create form_submit_lead trigger')
    return false
  }
  console.log(`[GTM-Admin] Trigger form_submit_lead created: ${triggerId}`)

  // 2. Create GA4 Configuration tag
  if (config.ga4MeasurementId) {
    const ga4Tag = await gtmFetch(`${basePath}/tags`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'GA4 Configuration',
        type: 'gaawc',
        parameter: [
          { type: 'template', key: 'measurementId', value: config.ga4MeasurementId },
          { type: 'boolean', key: 'sendPageView', value: 'true' },
        ],
        firingTriggerId: ['2147479553'], // All Pages built-in trigger
      }),
    })

    if (ga4Tag) {
      console.log(`[GTM-Admin] GA4 Configuration tag created: ${ga4Tag.tagId}`)
    } else {
      console.warn('[GTM-Admin] Failed to create GA4 Configuration tag')
    }
  }

  // 3. Create Meta Pixel tag
  if (config.metaPixelId) {
    const pixelTag = await gtmFetch(`${basePath}/tags`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Meta Pixel',
        type: 'html',
        parameter: [
          {
            type: 'template',
            key: 'html',
            value: `<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${config.metaPixelId}');
fbq('track', 'PageView');
</script>`,
          },
          { type: 'boolean', key: 'supportDocumentWrite', value: 'false' },
        ],
        firingTriggerId: ['2147479553'], // All Pages
      }),
    })

    if (pixelTag) {
      console.log(`[GTM-Admin] Meta Pixel tag created: ${pixelTag.tagId}`)
    } else {
      console.warn('[GTM-Admin] Failed to create Meta Pixel tag')
    }
  }

  // 4. Create all 27 hidden field variables (DOM Element type)
  let variablesCreated = 0
  for (const field of HIDDEN_FIELDS) {
    const variable = await gtmFetch(`${basePath}/variables`, {
      method: 'POST',
      body: JSON.stringify({
        name: `Hidden - ${field}`,
        type: 'd', // DOM Element
        parameter: [
          { type: 'template', key: 'elementId', value: `h_${field}` },
          { type: 'template', key: 'attributeName', value: '' },
        ],
      }),
    })

    if (variable) {
      variablesCreated++
    } else {
      console.warn(`[GTM-Admin] Failed to create variable for ${field}`)
    }
  }

  console.log(`[GTM-Admin] Created ${variablesCreated}/${HIDDEN_FIELDS.length} hidden field variables`)

  return true
}

/**
 * Creates a version and publishes the container
 */
export async function publishContainer(
  accountId: string,
  containerId: string
): Promise<boolean> {
  console.log(`[GTM-Admin] Publishing container ${containerId}`)

  // First create a version from the default workspace
  // Get the default workspace (ID 0 or first workspace)
  const workspaces = await gtmFetch(
    `/accounts/${accountId}/containers/${containerId}/workspaces`
  )

  if (!workspaces?.workspace?.length) {
    console.error('[GTM-Admin] No workspaces found for publishing')
    return false
  }

  const workspace = workspaces.workspace[0]
  const workspaceId = workspace.workspaceId

  // Create version
  const version = await gtmFetch(
    `/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}:createVersion`,
    {
      method: 'POST',
      body: JSON.stringify({
        name: 'Auto Setup v1',
        notes: 'Versao criada automaticamente pela plataforma',
      }),
    }
  )

  if (!version?.containerVersion?.containerVersionId) {
    console.error('[GTM-Admin] Failed to create version')
    return false
  }

  const versionId = version.containerVersion.containerVersionId

  // Publish the version
  const published = await gtmFetch(
    `/accounts/${accountId}/containers/${containerId}/versions/${versionId}:publish`,
    { method: 'POST' }
  )

  if (!published) {
    console.error('[GTM-Admin] Failed to publish version')
    return false
  }

  console.log(`[GTM-Admin] Container published successfully (version ${versionId})`)
  return true
}

/**
 * Full GTM setup: create container, workspace, tags, and publish
 */
export async function fullSetup(
  accountId: string,
  orgName: string,
  config: GtmConfig
): Promise<GtmResult | null> {
  // Check auth first
  const token = await getAccessToken()
  if (!token) {
    console.warn('[GTM-Admin] No auth available, skipping GTM setup')
    return null
  }

  // 1. Create container
  const container = await createContainer(accountId, orgName)
  if (!container) return null

  // 2. Create workspace
  const workspaceId = await createWorkspace(accountId, container.containerId)
  if (!workspaceId) return null

  // 3. Setup tags
  await setupDefaultTags(accountId, container.containerId, workspaceId, config)

  // 4. Publish
  await publishContainer(accountId, container.containerId)

  return {
    containerId: container.containerId,
    containerPublicId: container.containerPublicId,
    workspaceId,
  }
}
