'use client'

import { useEffect, useState } from 'react'
import {
  Mail,
  MessageCircle,
  Smartphone,
  BarChart3,
  Code,
  Target,
  Facebook,
  Bot,
  Zap,
  Rocket,
  RefreshCw,
  Check,
  X,
  FlaskConical,
  ExternalLink,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { getIntegrations, upsertIntegration } from '@/lib/supabase/integrations'
import type { Integration, IntegrationProvider } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ProviderField {
  key: string
  label: string
  placeholder: string
  type?: string
  helpText?: string
}

interface ProviderConfig {
  provider: IntegrationProvider
  name: string
  description: string
  icon: any
  fields: ProviderField[]
  helpUrl: string
  helpLabel: string
  setupSteps: string[]
}

interface ProviderCategory {
  title: string
  description: string
  providers: ProviderConfig[]
}

const PROVIDER_CATEGORIES: ProviderCategory[] = [
  {
    title: 'Comunicacao',
    description: 'Ferramentas para envio de emails, SMS e mensagens',
    providers: [
      {
        provider: 'mailersend',
        name: 'MailerSend',
        description: 'Envio de emails transacionais e em massa com rastreamento completo.',
        icon: Mail,
        helpUrl: 'https://app.mailersend.com/api-tokens',
        helpLabel: 'Abrir painel do MailerSend',
        setupSteps: [
          'Crie uma conta em mailersend.com',
          'Va em "API Tokens" no menu lateral',
          'Clique em "Generate new token" e copie a chave',
          'Cole a API Key no campo abaixo',
          'Configure seu dominio de envio em "Domains"',
        ],
        fields: [
          { key: 'api_key', label: 'API Key', placeholder: 'mlsn.xxxxx', type: 'password', helpText: 'Encontre em: MailerSend > API Tokens > Generate new token' },
          { key: 'webhook_secret', label: 'Webhook Secret', placeholder: 'whsec_xxxxx', type: 'password', helpText: 'Encontre em: MailerSend > Webhooks > seu webhook > Signing secret' },
          { key: 'sender_domain', label: 'Dominio de Envio', placeholder: 'mail.suaempresa.com.br', helpText: 'O dominio verificado para envio (ex: mail.suaempresa.com.br)' },
        ],
      },
      {
        provider: 'whatsapp',
        name: 'WhatsApp Business',
        description: 'Envie e receba mensagens via WhatsApp Business API.',
        icon: MessageCircle,
        helpUrl: 'https://business.facebook.com/settings/whatsapp-business-accounts',
        helpLabel: 'Abrir Meta Business Suite',
        setupSteps: [
          'Acesse o Meta Business Suite (business.facebook.com)',
          'Va em Configuracoes > Contas do WhatsApp Business',
          'Crie um app no Meta for Developers (developers.facebook.com)',
          'No app, va em WhatsApp > Configuracao da API',
          'Copie o Phone Number ID e gere um Access Token permanente',
        ],
        fields: [
          { key: 'phone_number_id', label: 'Phone Number ID', placeholder: '1234567890', helpText: 'Meta for Developers > Seu App > WhatsApp > Configuracao da API' },
          { key: 'access_token', label: 'Access Token (permanente)', placeholder: 'EAAxxxxx', type: 'password', helpText: 'Gere um token permanente em Configuracao do Sistema' },
          { key: 'business_account_id', label: 'Business Account ID', placeholder: '9876543210', helpText: 'Encontre no Meta Business Suite > Configuracoes > Info da conta' },
          { key: 'verify_token', label: 'Webhook Verify Token', placeholder: 'meu_token_secreto', type: 'password', helpText: 'Token que voce define para verificar webhooks' },
        ],
      },
      {
        provider: 'twilio',
        name: 'SMS (Twilio)',
        description: 'Envio de SMS para campanhas e notificacoes.',
        icon: Smartphone,
        helpUrl: 'https://console.twilio.com/',
        helpLabel: 'Abrir console do Twilio',
        setupSteps: [
          'Crie uma conta em twilio.com',
          'No Dashboard, copie o Account SID e Auth Token',
          'Compre um numero de telefone em Phone Numbers',
          'Cole as credenciais nos campos abaixo',
        ],
        fields: [
          { key: 'account_sid', label: 'Account SID', placeholder: 'ACxxxxx', helpText: 'Encontre no Dashboard principal do Twilio' },
          { key: 'auth_token', label: 'Auth Token', placeholder: 'xxxxx', type: 'password', helpText: 'Encontre no Dashboard principal do Twilio (clique para revelar)' },
          { key: 'phone_number', label: 'Numero de Telefone', placeholder: '+5511999999999', helpText: 'Numero comprado no Twilio para envio de SMS' },
        ],
      },
    ],
  },
  {
    title: 'Analytics & Ads',
    description: 'Conecte suas plataformas de anuncios e analytics',
    providers: [
      {
        provider: 'google_analytics',
        name: 'Google Analytics 4',
        description: 'Metricas de trafego, paginas visitadas e fontes de aquisicao.',
        icon: BarChart3,
        helpUrl: 'https://analytics.google.com/analytics/web/#/a/admin',
        helpLabel: 'Abrir Google Analytics',
        setupSteps: [
          'Acesse analytics.google.com e va em Administrador',
          'Copie o Property ID (numero de 9 digitos)',
          'Para API: crie credenciais OAuth no Google Cloud Console',
          'Habilite a API "Google Analytics Data API"',
          'Gere Client ID, Client Secret e obtenha um Refresh Token',
        ],
        fields: [
          { key: 'property_id', label: 'Property ID', placeholder: '123456789', helpText: 'GA4 > Administrador > Propriedade > Detalhes da propriedade' },
          { key: 'client_id', label: 'Client ID (OAuth)', placeholder: 'xxxxx.apps.googleusercontent.com', helpText: 'Google Cloud Console > APIs > Credenciais > OAuth 2.0' },
          { key: 'client_secret', label: 'Client Secret', placeholder: 'GOCSPX-xxxxx', type: 'password', helpText: 'Google Cloud Console > APIs > Credenciais > OAuth 2.0' },
          { key: 'refresh_token', label: 'Refresh Token', placeholder: '1//xxxxx', type: 'password', helpText: 'Gerado apos autorizacao OAuth (use o OAuth Playground do Google)' },
        ],
      },
      {
        provider: 'gtm',
        name: 'Google Tag Manager',
        description: 'Gerencie tags e eventos de tracking.',
        icon: Code,
        helpUrl: 'https://tagmanager.google.com/',
        helpLabel: 'Abrir Google Tag Manager',
        setupSteps: [
          'Acesse tagmanager.google.com',
          'Selecione seu container e copie o Container ID (GTM-XXXXXXX)',
          'Se usar GA4, copie tambem o Measurement ID (G-XXXXXXXXXX)',
        ],
        fields: [
          { key: 'container_id', label: 'Container ID', placeholder: 'GTM-XXXXXXX', helpText: 'Encontre no topo do painel do GTM (formato: GTM-XXXXXXX)' },
          { key: 'measurement_id', label: 'Measurement ID (GA4)', placeholder: 'G-XXXXXXXXXX', helpText: 'GA4 > Administrador > Fluxos de dados > seu fluxo' },
        ],
      },
      {
        provider: 'google_ads',
        name: 'Google Ads',
        description: 'Campanhas, gastos e conversoes do Google Ads.',
        icon: Target,
        helpUrl: 'https://ads.google.com/',
        helpLabel: 'Abrir Google Ads',
        setupSteps: [
          'Acesse ads.google.com',
          'Copie o Customer ID (formato 123-456-7890)',
          'Para API: solicite um Developer Token em Ferramentas > Centro de API',
          'Configure credenciais OAuth no Google Cloud Console',
        ],
        fields: [
          { key: 'customer_id', label: 'Customer ID', placeholder: '123-456-7890', helpText: 'Encontre no canto superior direito do Google Ads' },
          { key: 'developer_token', label: 'Developer Token', placeholder: 'xxxxx', type: 'password', helpText: 'Google Ads > Ferramentas > Configuracao > Centro de API' },
          { key: 'client_id', label: 'Client ID (OAuth)', placeholder: 'xxxxx.apps.googleusercontent.com', helpText: 'Google Cloud Console > APIs > Credenciais > OAuth 2.0' },
          { key: 'client_secret', label: 'Client Secret', placeholder: 'GOCSPX-xxxxx', type: 'password', helpText: 'Google Cloud Console > APIs > Credenciais > OAuth 2.0' },
          { key: 'refresh_token', label: 'Refresh Token', placeholder: '1//xxxxx', type: 'password', helpText: 'Gerado apos autorizacao OAuth' },
        ],
      },
      {
        provider: 'meta_ads',
        name: 'Meta Ads',
        description: 'Gastos, impressoes e campanhas do Facebook/Instagram.',
        icon: Facebook,
        helpUrl: 'https://business.facebook.com/settings/ad-accounts',
        helpLabel: 'Abrir Meta Business Suite',
        setupSteps: [
          'Acesse business.facebook.com',
          'Va em Configuracoes > Contas de Anuncios',
          'Copie o ID da conta (formato: act_123456789)',
          'Crie um app em developers.facebook.com para obter o Access Token',
          'No app, gere um System User Token com permissao ads_read',
        ],
        fields: [
          { key: 'ad_account_id', label: 'ID da Conta de Anuncios', placeholder: 'act_123456789', helpText: 'Meta Business Suite > Configuracoes > Contas de Anuncios' },
          { key: 'access_token', label: 'Access Token', placeholder: 'EAAxxxxx', type: 'password', helpText: 'Meta for Developers > Seu App > System Users > Generate Token' },
          { key: 'app_secret', label: 'App Secret', placeholder: 'xxxxx', type: 'password', helpText: 'Meta for Developers > Seu App > Configuracoes > Basico' },
        ],
      },
    ],
  },
  {
    title: 'Ferramentas',
    description: 'IA, automacoes e deploy',
    providers: [
      {
        provider: 'openrouter',
        name: 'OpenRouter IA',
        description: 'Acesso a modelos de IA para geracao de conteudo e chatbot.',
        icon: Bot,
        helpUrl: 'https://openrouter.ai/keys',
        helpLabel: 'Abrir OpenRouter',
        setupSteps: [
          'Crie uma conta em openrouter.ai',
          'Va em "Keys" no menu lateral',
          'Clique em "Create Key" e copie a chave gerada',
          'Escolha o modelo padrao (recomendado: anthropic/claude-3.5-sonnet)',
        ],
        fields: [
          { key: 'api_key', label: 'API Key', placeholder: 'sk-or-xxxxx', type: 'password', helpText: 'OpenRouter > Keys > Create Key' },
          { key: 'default_model', label: 'Modelo Padrao', placeholder: 'anthropic/claude-3.5-sonnet', helpText: 'Ex: anthropic/claude-3.5-sonnet, openai/gpt-4o, meta-llama/llama-3-70b' },
        ],
      },
      {
        provider: 'n8n',
        name: 'n8n Automacoes',
        description: 'Workflows de automacao avancados via n8n.',
        icon: Zap,
        helpUrl: 'https://docs.n8n.io/api/',
        helpLabel: 'Ver documentacao n8n',
        setupSteps: [
          'Acesse seu painel n8n (self-hosted ou cloud)',
          'Va em Settings > API > Create API Key',
          'Copie a URL base e a API Key',
          'Para webhooks, configure a URL base dos webhooks',
        ],
        fields: [
          { key: 'base_url', label: 'URL Base', placeholder: 'https://n8n.suaempresa.com.br', helpText: 'URL do seu n8n (ex: https://n8n.suaempresa.com.br)' },
          { key: 'api_key', label: 'API Key', placeholder: 'n8n_api_xxxxx', type: 'password', helpText: 'n8n > Settings > API > Create API Key' },
          { key: 'webhook_base_url', label: 'URL Base dos Webhooks', placeholder: 'https://n8n.suaempresa.com.br/webhook', helpText: 'Normalmente e a URL base + /webhook' },
        ],
      },
      {
        provider: 'vercel',
        name: 'Vercel Deploy',
        description: 'Deploy automatico de landing pages e microsites.',
        icon: Rocket,
        helpUrl: 'https://vercel.com/account/tokens',
        helpLabel: 'Abrir painel da Vercel',
        setupSteps: [
          'Acesse vercel.com e faca login',
          'Va em Settings > Tokens',
          'Clique em "Create" e copie o token gerado',
          'Se usar teams, copie tambem o Team ID em Settings > General',
        ],
        fields: [
          { key: 'access_token', label: 'Access Token', placeholder: 'xxxxx', type: 'password', helpText: 'Vercel > Settings > Tokens > Create' },
          { key: 'team_id', label: 'Team ID', placeholder: 'team_xxxxx', helpText: 'Vercel > Settings (do team) > General > Team ID' },
        ],
      },
    ],
  },
]

export function IntegrationsManager() {
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [configs, setConfigs] = useState<Record<string, Record<string, string>>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [testing, setTesting] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [expandedSetup, setExpandedSetup] = useState<string | null>(null)
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (currentOrg) loadIntegrations()
  }, [currentOrg])

  const loadIntegrations = async () => {
    if (!currentOrg) return
    try {
      const data = await getIntegrations(currentOrg.id)
      setIntegrations(data)

      const initialConfigs: Record<string, Record<string, string>> = {}
      data.forEach((int) => {
        initialConfigs[int.provider] = int.config as Record<string, string>
      })
      setConfigs(initialConfigs)
    } catch (error) {
      console.error('Erro ao carregar integracoes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (provider: IntegrationProvider) => {
    if (!currentOrg) return
    setSaving(provider)
    try {
      const config = configs[provider] || {}
      const integration = await upsertIntegration(currentOrg.id, provider, config, true)
      setIntegrations((prev) => {
        const idx = prev.findIndex((i) => i.provider === provider)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = integration
          return updated
        }
        return [...prev, integration]
      })
      toast({ title: 'Integracao salva', description: `${provider} configurado com sucesso.` })
    } catch (error) {
      console.error('Erro ao salvar integracao:', error)
      toast({ title: 'Erro', description: 'Nao foi possivel salvar a integracao.', variant: 'destructive' })
    } finally {
      setSaving(null)
    }
  }

  const handleTestConnection = async (provider: IntegrationProvider, providerName: string) => {
    const config = configs[provider]
    if (!config || Object.values(config).every((v) => !v)) {
      toast({ title: 'Preencha os campos', description: 'Insira as credenciais antes de testar.', variant: 'destructive' })
      return
    }
    setTesting(provider)
    try {
      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, config }),
      })
      const result = await res.json()
      if (result.success) {
        toast({ title: 'Conexao verificada', description: result.message })
      } else {
        toast({ title: 'Falha no teste', description: result.message, variant: 'destructive' })
      }
    } catch (error: any) {
      toast({
        title: 'Falha no teste',
        description: error.message || `Nao foi possivel conectar ao ${providerName}.`,
        variant: 'destructive',
      })
    } finally {
      setTesting(null)
    }
  }

  const handleSync = async (provider: IntegrationProvider) => {
    if (!currentOrg) return
    setSyncing(provider)
    try {
      const response = await fetch('/api/analytics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: currentOrg.id }),
      })
      const result = await response.json()
      if (result.error) throw new Error(result.error)

      toast({ title: 'Sincronizacao concluida', description: `${result.synced} integracao(oes) sincronizada(s).` })
      await loadIntegrations()
    } catch (error: any) {
      toast({ title: 'Erro na sincronizacao', description: error.message, variant: 'destructive' })
    } finally {
      setSyncing(null)
    }
  }

  const updateConfig = (provider: string, key: string, value: string) => {
    setConfigs((prev) => ({
      ...prev,
      [provider]: { ...(prev[provider] || {}), [key]: value },
    }))
  }

  const togglePasswordVisibility = (fieldKey: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }))
  }

  if (loading) return <div className="text-sm text-muted-foreground">Carregando...</div>

  return (
    <div className="space-y-10">
      {PROVIDER_CATEGORIES.map((category, catIdx) => (
        <div key={category.title} className="space-y-6">
          {catIdx > 0 && <Separator />}
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{category.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
          </div>

          <div className="space-y-6">
            {category.providers.map((providerConfig) => {
              const integration = integrations.find((i) => i.provider === providerConfig.provider)
              const isConnected = integration?.is_active ?? false
              const Icon = providerConfig.icon
              const isSetupExpanded = expandedSetup === providerConfig.provider

              return (
                <Card key={providerConfig.provider}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{providerConfig.name}</CardTitle>
                          <CardDescription>{providerConfig.description}</CardDescription>
                        </div>
                      </div>
                      <Badge variant={isConnected ? 'default' : 'secondary'}>
                        {isConnected ? (
                          <><Check className="mr-1 h-3 w-3" /> Conectado</>
                        ) : (
                          <><X className="mr-1 h-3 w-3" /> Desconectado</>
                        )}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Setup guide */}
                    <div className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedSetup(isSetupExpanded ? null : providerConfig.provider)}
                        className="w-full px-4 py-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <HelpCircle className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Como configurar?</span>
                        </div>
                        {isSetupExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>

                      {isSetupExpanded && (
                        <div className="px-4 py-3 border-t bg-muted/10 space-y-3">
                          <ol className="space-y-2">
                            {providerConfig.setupSteps.map((step, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium mt-0.5">
                                  {i + 1}
                                </span>
                                <span className="text-muted-foreground">{step}</span>
                              </li>
                            ))}
                          </ol>
                          <a
                            href={providerConfig.helpUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {providerConfig.helpLabel}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {providerConfig.fields.map((field) => {
                        const fieldId = `${providerConfig.provider}-${field.key}`
                        const isPassword = field.type === 'password'
                        const isVisible = visiblePasswords[fieldId]

                        return (
                          <div key={field.key} className="space-y-1.5">
                            <Label className="text-sm">{field.label}</Label>
                            <div className="relative">
                              <Input
                                type={isPassword && !isVisible ? 'password' : 'text'}
                                placeholder={field.placeholder}
                                value={configs[providerConfig.provider]?.[field.key] || ''}
                                onChange={(e) => updateConfig(providerConfig.provider, field.key, e.target.value)}
                                className={isPassword ? 'pr-10' : ''}
                              />
                              {isPassword && (
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(fieldId)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                  {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              )}
                            </div>
                            {field.helpText && (
                              <p className="text-xs text-muted-foreground">{field.helpText}</p>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        {integration?.last_sync_at ? (
                          <>Ultima sincronizacao: {formatDistanceToNow(new Date(integration.last_sync_at), { addSuffix: true, locale: ptBR })}</>
                        ) : (
                          'Nunca sincronizado'
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestConnection(providerConfig.provider, providerConfig.name)}
                          disabled={testing === providerConfig.provider}
                        >
                          <FlaskConical className={`mr-2 h-4 w-4 ${testing === providerConfig.provider ? 'animate-pulse' : ''}`} />
                          {testing === providerConfig.provider ? 'Testando...' : 'Testar'}
                        </Button>
                        {isConnected && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSync(providerConfig.provider)}
                            disabled={syncing === providerConfig.provider}
                          >
                            <RefreshCw className={`mr-2 h-4 w-4 ${syncing === providerConfig.provider ? 'animate-spin' : ''}`} />
                            {syncing === providerConfig.provider ? 'Sincronizando...' : 'Sincronizar'}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleSave(providerConfig.provider)}
                          disabled={saving === providerConfig.provider}
                        >
                          {saving === providerConfig.provider ? 'Salvando...' : 'Salvar'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
