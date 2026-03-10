import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Provider =
  | 'mailersend'
  | 'whatsapp'
  | 'twilio'
  | 'google_analytics'
  | 'gtm'
  | 'google_ads'
  | 'meta_ads'
  | 'openrouter'
  | 'n8n'
  | 'vercel'

const VALID_PROVIDERS: Provider[] = [
  'mailersend',
  'whatsapp',
  'twilio',
  'google_analytics',
  'gtm',
  'google_ads',
  'meta_ads',
  'openrouter',
  'n8n',
  'vercel',
]

const OAUTH_PROVIDERS: Provider[] = ['google_analytics', 'gtm', 'google_ads', 'meta_ads']

interface TestResult {
  success: boolean
  message: string
}

async function testMailersend(config: Record<string, string>): Promise<TestResult> {
  const { api_key } = config
  if (!api_key) {
    return { success: false, message: 'Campo api_key é obrigatório.' }
  }

  const res = await fetch('https://api.mailersend.com/v1/domains', {
    method: 'GET',
    headers: { Authorization: `Bearer ${api_key}` },
  })

  if (res.ok) {
    return { success: true, message: 'Conexão com MailerSend verificada com sucesso.' }
  }

  if (res.status === 401) {
    return { success: false, message: 'API key do MailerSend inválida ou expirada.' }
  }

  return { success: false, message: `Erro ao conectar com MailerSend (HTTP ${res.status}).` }
}

async function testWhatsapp(config: Record<string, string>): Promise<TestResult> {
  const { phone_number_id, access_token } = config
  if (!phone_number_id || !access_token) {
    return { success: false, message: 'Campos phone_number_id e access_token são obrigatórios.' }
  }

  const url = `https://graph.facebook.com/v18.0/${encodeURIComponent(phone_number_id)}?access_token=${encodeURIComponent(access_token)}`
  const res = await fetch(url, { method: 'GET' })

  if (res.ok) {
    return { success: true, message: 'Conexão com WhatsApp Business API verificada com sucesso.' }
  }

  if (res.status === 401 || res.status === 403) {
    return { success: false, message: 'Access token do WhatsApp inválido ou sem permissão.' }
  }

  return { success: false, message: `Erro ao conectar com WhatsApp API (HTTP ${res.status}).` }
}

async function testTwilio(config: Record<string, string>): Promise<TestResult> {
  const { account_sid, auth_token } = config
  if (!account_sid || !auth_token) {
    return { success: false, message: 'Campos account_sid e auth_token são obrigatórios.' }
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(account_sid)}.json`
  const credentials = Buffer.from(`${account_sid}:${auth_token}`).toString('base64')
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Basic ${credentials}` },
  })

  if (res.ok) {
    return { success: true, message: 'Conexão com Twilio verificada com sucesso.' }
  }

  if (res.status === 401) {
    return { success: false, message: 'Credenciais do Twilio inválidas.' }
  }

  return { success: false, message: `Erro ao conectar com Twilio (HTTP ${res.status}).` }
}

async function testOpenrouter(config: Record<string, string>): Promise<TestResult> {
  const { api_key } = config
  if (!api_key) {
    return { success: false, message: 'Campo api_key é obrigatório.' }
  }

  const res = await fetch('https://openrouter.ai/api/v1/models', {
    method: 'GET',
    headers: { Authorization: `Bearer ${api_key}` },
  })

  if (res.ok) {
    return { success: true, message: 'Conexão com OpenRouter verificada com sucesso.' }
  }

  if (res.status === 401) {
    return { success: false, message: 'API key do OpenRouter inválida.' }
  }

  return { success: false, message: `Erro ao conectar com OpenRouter (HTTP ${res.status}).` }
}

async function testN8n(config: Record<string, string>): Promise<TestResult> {
  const { base_url, api_key } = config
  if (!base_url || !api_key) {
    return { success: false, message: 'Campos base_url e api_key são obrigatórios.' }
  }

  const normalizedUrl = base_url.replace(/\/+$/, '')
  const res = await fetch(`${normalizedUrl}/api/v1/workflows?limit=1`, {
    method: 'GET',
    headers: { 'X-N8N-API-KEY': api_key },
  })

  if (res.ok) {
    return { success: true, message: 'Conexão com n8n verificada com sucesso.' }
  }

  if (res.status === 401) {
    return { success: false, message: 'API key do n8n inválida.' }
  }

  return { success: false, message: `Erro ao conectar com n8n (HTTP ${res.status}).` }
}

async function testVercel(config: Record<string, string>): Promise<TestResult> {
  const { access_token } = config
  if (!access_token) {
    return { success: false, message: 'Campo access_token é obrigatório.' }
  }

  const res = await fetch('https://api.vercel.com/v9/projects?limit=1', {
    method: 'GET',
    headers: { Authorization: `Bearer ${access_token}` },
  })

  if (res.ok) {
    return { success: true, message: 'Conexão com Vercel verificada com sucesso.' }
  }

  if (res.status === 401 || res.status === 403) {
    return { success: false, message: 'Access token da Vercel inválido ou sem permissão.' }
  }

  return { success: false, message: `Erro ao conectar com Vercel (HTTP ${res.status}).` }
}

function testOAuthProvider(provider: string, config: Record<string, string>): TestResult {
  const requiredFields: Record<string, string[]> = {
    google_analytics: ['measurement_id'],
    gtm: ['container_id'],
    google_ads: ['customer_id'],
    meta_ads: ['ad_account_id', 'access_token'],
  }

  const fields = requiredFields[provider] || []
  const missing = fields.filter((f) => !config[f]?.trim())

  if (missing.length > 0) {
    return {
      success: false,
      message: `Campos obrigatórios ausentes: ${missing.join(', ')}.`,
    }
  }

  return {
    success: true,
    message: 'Credenciais salvas. Validação via OAuth será feita na próxima sincronização.',
  }
}

const providerTesters: Record<
  Provider,
  (config: Record<string, string>) => Promise<TestResult> | TestResult
> = {
  mailersend: testMailersend,
  whatsapp: testWhatsapp,
  twilio: testTwilio,
  openrouter: testOpenrouter,
  n8n: testN8n,
  vercel: testVercel,
  google_analytics: (config) => testOAuthProvider('google_analytics', config),
  gtm: (config) => testOAuthProvider('gtm', config),
  google_ads: (config) => testOAuthProvider('google_ads', config),
  meta_ads: (config) => testOAuthProvider('meta_ads', config),
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Não autorizado. Faça login para continuar.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { provider, config } = body as {
      provider: string
      config: Record<string, string>
    }

    if (!provider || !VALID_PROVIDERS.includes(provider as Provider)) {
      return NextResponse.json(
        {
          success: false,
          message: `Provider inválido. Valores aceitos: ${VALID_PROVIDERS.join(', ')}.`,
        },
        { status: 400 }
      )
    }

    if (!config || typeof config !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Campo config é obrigatório e deve ser um objeto.' },
        { status: 400 }
      )
    }

    const tester = providerTesters[provider as Provider]
    const result = await tester(config)

    return NextResponse.json(result, { status: result.success ? 200 : 422 })
  } catch (error) {
    console.error('[integrations/test] Erro:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno ao testar integração.' },
      { status: 500 }
    )
  }
}
