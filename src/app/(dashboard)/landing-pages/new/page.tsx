'use client'

import { Suspense, useReducer, useRef, useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Loader2,
  Send,
  Paperclip,
  Monitor,
  Smartphone,
  Check,
  MessageSquare,
  ArrowLeft,
  Moon,
  Sun,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { generateSessionId } from '@/lib/lp-builder/session'
import type {
  Brand,
  ChatPhase,
  Message,
  UploadedImage,
  AppState,
  AppAction,
  ContentBlock,
} from '@/lib/lp-builder/types'

const BRAND_OPTIONS: { slug: Brand; name: string; logo: string; description: string }[] = [
  {
    slug: 'templum',
    name: 'Templum',
    logo: '/logos/templum-logo.jpeg',
    description: 'Consultoria e Tecnologia em Governanca Corporativa',
  },
  {
    slug: 'evolutto',
    name: 'Evolutto',
    logo: '/logos/evolutto-logo.jpeg',
    description: 'Plataforma para Escalar Consultorias',
  },
  {
    slug: 'orbit',
    name: 'Orbit Gestao',
    logo: '/logos/orbit-logo.jpeg',
    description: 'Plataforma de IA para Gestao Empresarial',
  },
]

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SELECT_BRAND':
      return { ...state, brand: action.brand, phase: 'briefing' }
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.message] }
    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading }
    case 'SET_HTML':
      return {
        ...state,
        currentHtml: action.html,
        lpVersion: state.lpVersion + 1,
        phase: 'reviewing',
      }
    case 'SET_PHASE':
      return { ...state, phase: action.phase }
    case 'SET_DEPLOY':
      return {
        ...state,
        deployUrl: action.url,
        deploymentId: action.deploymentId,
        phase: 'deployed',
      }
    case 'RESET':
      return createInitialState()
    default:
      return state
  }
}

function createInitialState(): AppState {
  return {
    brand: null,
    messages: [],
    isLoading: false,
    currentHtml: null,
    lpVersion: 0,
    phase: 'select_brand',
    deployUrl: null,
    deploymentId: null,
    sessionId: generateSessionId(),
  }
}

async function resizeImage(file: File, maxWidth = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas context not available'))
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Map org name to brand slug
function orgNameToBrand(orgName: string): Brand | null {
  const lower = orgName.toLowerCase()
  if (lower.includes('templum')) return 'templum'
  if (lower.includes('evolutto')) return 'evolutto'
  if (lower.includes('orbit')) return 'orbit'
  return null
}

export default function NewLandingPagePageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="text-muted-foreground">Carregando...</div></div>}>
      <NewLandingPagePage />
    </Suspense>
  )
}

function NewLandingPagePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentOrg } = useOrganizationContext()
  const { user } = useAuth()
  const { toast } = useToast()

  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState)
  const [input, setInput] = useState('')
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [theme, setTheme] = useState<'dark' | 'light' | null>(null)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [lpId, setLpId] = useState<string | null>(null)
  const [strategyLoaded, setStrategyLoaded] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageCounterRef = useRef(0)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.messages])

  // Auto-load strategy copy when coming from marketing strategy
  useEffect(() => {
    if (strategyLoaded) return
    if (searchParams.get('from') !== 'strategy') return
    if (!currentOrg) return

    const raw = localStorage.getItem('lp-builder-strategy-copy')
    if (!raw) return

    try {
      const data = JSON.parse(raw)
      // Verify it's for the same org and recent (< 1 hour)
      if (data.orgId !== currentOrg.id) return
      if (Date.now() - data.timestamp > 3600000) {
        localStorage.removeItem('lp-builder-strategy-copy')
        return
      }

      setStrategyLoaded(true)

      // Auto-select brand from org
      const brand = orgNameToBrand(currentOrg.name)
      if (brand) {
        dispatch({ type: 'SELECT_BRAND', brand })
      } else {
        // If we can't auto-detect brand, use the first available or skip
        dispatch({ type: 'SELECT_BRAND', brand: 'templum' })
      }

      // Build the copy briefing text from strategy data
      const cro = data.paginaCRO
      const briefing = data.briefing
      const lines: string[] = []

      lines.push('Crie uma landing page com base na copy da estrategia de marketing:')
      lines.push('')
      if (briefing?.segmento) lines.push(`Segmento: ${briefing.segmento}`)
      if (briefing?.produtoServico) lines.push(`Produto/Servico: ${briefing.produtoServico}`)
      if (briefing?.publicoB2B) lines.push(`Publico: ${briefing.publicoB2B}`)
      lines.push('')
      if (cro) {
        lines.push(`Headline: ${cro.headlinePrincipal}`)
        lines.push(`Subheadline: ${cro.subheadline}`)
        lines.push(`Urgencia: ${cro.urgencia}`)
        lines.push(`CTA: ${cro.ctaPrincipal}`)
        lines.push(`Microcopy: ${cro.microcopyProva}`)
        lines.push(`Por que importa: ${cro.porqueImportaAgora}`)
        lines.push(`Prova social: ${cro.provaSocial}`)
        if (cro.beneficiosDiretos?.length) {
          lines.push(`Beneficios: ${cro.beneficiosDiretos.join(' | ')}`)
        }
        if (cro.quebraObjecoes?.length) {
          lines.push(`FAQ/Objecoes: ${cro.quebraObjecoes.join(' | ')}`)
        }
        if (cro.comoFunciona?.length) {
          lines.push(`Como funciona: ${cro.comoFunciona.join(' | ')}`)
        }
      }

      // Brand identity colors
      const bi = data.brandIdentity
      if (bi?.primary_color || bi?.tone_of_voice) {
        lines.push('')
        if (bi.primary_color) lines.push(`Cor primaria: ${bi.primary_color}`)
        if (bi.secondary_color) lines.push(`Cor secundaria: ${bi.secondary_color}`)
        if (bi.accent_color) lines.push(`Cor destaque: ${bi.accent_color}`)
        if (bi.tone_of_voice) lines.push(`Tom de voz: ${bi.tone_of_voice}`)
      }

      // Set as input so user can review before sending
      setInput(lines.join('\n'))

      // Add welcome message
      const welcomeMsg: Message = {
        id: `sys-strategy-${Date.now()}`,
        role: 'assistant',
        content: `Copy da estrategia de marketing carregada para ${currentOrg.name}! Selecione o tema visual e revise o briefing antes de enviar.`,
        timestamp: Date.now(),
      }
      dispatch({ type: 'ADD_MESSAGE', message: welcomeMsg })

      // Clean up localStorage
      localStorage.removeItem('lp-builder-strategy-copy')
    } catch (err) {
      console.error('Erro ao carregar copy da estrategia:', err)
    }
  }, [searchParams, currentOrg, strategyLoaded])

  const handleSelectBrand = useCallback(
    (brand: Brand) => {
      dispatch({ type: 'SELECT_BRAND', brand })
    },
    []
  )

  const handleSelectTheme = useCallback(
    async (selectedTheme: 'dark' | 'light') => {
      setTheme(selectedTheme)
      const themeLabel = selectedTheme === 'dark' ? 'Escuro' : 'Claro'
      const systemMsg: Message = {
        id: `sys-theme-${Date.now()}`,
        role: 'assistant',
        content: `Tema ${themeLabel} selecionado. Agora descreva o que voce deseja na landing page: objetivo, publico-alvo, conteudo principal, call-to-action, etc.`,
        timestamp: Date.now(),
      }
      dispatch({ type: 'ADD_MESSAGE', message: systemMsg })

      // Create LP record in Supabase
      if (currentOrg && user && state.brand) {
        try {
          const supabase = createClient()
          const { data, error } = await supabase
            .from('landing_pages')
            .insert({
              org_id: currentOrg.id,
              name: `LP ${state.brand} - ${new Date().toLocaleDateString('pt-BR')}`,
              brand: state.brand,
              theme: selectedTheme,
              status: 'draft',
              session_id: state.sessionId,
              created_by: user.id,
            })
            .select()
            .single()

          if (error) throw error
          setLpId(data.id)
        } catch (err) {
          console.error('Erro ao criar LP:', err)
        }
      }
    },
    [currentOrg, user, state.brand, state.sessionId]
  )

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files?.length) return

      for (const file of Array.from(files)) {
        try {
          const dataUri = await resizeImage(file)
          imageCounterRef.current++
          const newImage: UploadedImage = {
            id: `IMAGE_${imageCounterRef.current}`,
            data: dataUri,
            mediaType: 'image/jpeg',
            name: file.name,
          }
          setUploadedImages((prev) => [...prev, newImage])
          toast({
            title: 'Imagem carregada',
            description: `${file.name} adicionada como ${newImage.id}`,
          })
        } catch (err) {
          console.error('Erro ao processar imagem:', err)
          toast({
            title: 'Erro',
            description: 'Falha ao processar imagem.',
            variant: 'destructive',
          })
        }
      }

      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [toast]
  )

  const handleSend = useCallback(async () => {
    if (!input.trim() || state.isLoading || !state.brand) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
      images: uploadedImages.length > 0 ? [...uploadedImages] : undefined,
    }

    dispatch({ type: 'ADD_MESSAGE', message: userMsg })
    dispatch({ type: 'SET_LOADING', isLoading: true })
    setInput('')
    setUploadedImages([])

    try {
      // Build messages for API — ensure alternating roles (OpenRouter/Anthropic requirement)
      const rawMessages = state.messages
        .concat([userMsg])
        .map((m) => ({ role: m.role, content: m.content }))

      // Merge consecutive same-role messages to avoid API rejection
      const apiMessages: { role: string; content: string }[] = []
      for (const msg of rawMessages) {
        const last = apiMessages[apiMessages.length - 1]
        if (last && last.role === msg.role) {
          last.content += '\n\n' + msg.content
        } else {
          apiMessages.push({ ...msg })
        }
      }

      // Prepend theme preference to first user message if set
      if (theme && apiMessages.length > 0) {
        const firstUser = apiMessages.find(m => m.role === 'user')
        if (firstUser && !firstUser.content.includes('Tema visual:')) {
          firstUser.content = `[Tema visual: ${theme === 'dark' ? 'ESCURO' : 'CLARO'}]\n\n${firstUser.content}`
        }
      }

      const res = await fetch('/api/lp-builder/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: state.brand,
          messages: apiMessages,
          session_id: state.sessionId,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error || `Erro na API (${res.status})`)
      }

      const data = await res.json()

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        timestamp: Date.now(),
      }

      dispatch({ type: 'ADD_MESSAGE', message: assistantMsg })

      if (data.html) {
        dispatch({ type: 'SET_HTML', html: data.html })
      }
    } catch (err) {
      console.error('Erro no chat:', err)
      const errMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('Detalhe do erro:', errMessage)
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Desculpe, ocorreu um erro: ${errMessage}. Tente novamente.`,
        timestamp: Date.now(),
      }
      dispatch({ type: 'ADD_MESSAGE', message: errorMsg })
    } finally {
      dispatch({ type: 'SET_LOADING', isLoading: false })
    }
  }, [input, state, uploadedImages])

  const handleApproveAndPublish = useCallback(async () => {
    if (!state.currentHtml || !state.brand) return

    dispatch({ type: 'SET_PHASE', phase: 'deploying' })
    dispatch({ type: 'SET_LOADING', isLoading: true })

    try {
      const res = await fetch('/api/lp-builder/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa: state.brand,
          html: state.currentHtml,
          titulo: `LP ${state.brand}`,
          session_id: state.sessionId,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error || `Erro no deploy (${res.status})`)
      }

      const data = await res.json()

      dispatch({
        type: 'SET_DEPLOY',
        url: data.url || data.vercelUrl,
        deploymentId: data.deploymentId || data.deployment_id,
      })

      // Update LP in Supabase
      const deployUrl = data.url || data.vercelUrl
      const deployId = data.deploymentId || data.deployment_id
      if (lpId) {
        const supabase = createClient()
        await supabase
          .from('landing_pages')
          .update({
            status: 'published',
            html_content: state.currentHtml,
            deploy_url: deployUrl,
            vercel_deployment_id: deployId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', lpId)
      }

      toast({
        title: 'Publicado!',
        description: 'Sua landing page foi publicada com sucesso.',
      })
    } catch (err) {
      console.error('Erro no deploy:', err)
      dispatch({ type: 'SET_PHASE', phase: 'reviewing' })
      toast({
        title: 'Erro no deploy',
        description: 'Nao foi possivel publicar. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      dispatch({ type: 'SET_LOADING', isLoading: false })
    }
  }, [state.currentHtml, state.brand, state.sessionId, lpId, toast])

  const handleRequestAdjust = useCallback(() => {
    dispatch({ type: 'SET_PHASE', phase: 'briefing' })
    const msg: Message = {
      id: `sys-adjust-${Date.now()}`,
      role: 'assistant',
      content: 'Sem problemas! Descreva as alteracoes que deseja fazer na landing page.',
      timestamp: Date.now(),
    }
    dispatch({ type: 'ADD_MESSAGE', message: msg })
  }, [])

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b px-4 py-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/landing-pages')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">Nova Landing Page</h2>
          {state.brand && (
            <Badge variant="outline" className="capitalize">
              {state.brand}
            </Badge>
          )}
          {state.phase !== 'select_brand' && (
            <Badge variant="secondary">
              {state.phase === 'briefing'
                ? 'Briefing'
                : state.phase === 'generating'
                  ? 'Gerando...'
                  : state.phase === 'reviewing'
                    ? 'Revisao'
                    : state.phase === 'deploying'
                      ? 'Publicando...'
                      : state.phase === 'deployed'
                        ? 'Publicada'
                        : state.phase}
            </Badge>
          )}
        </div>
      </div>

      {/* Main content: Split layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat Panel (60%) */}
        <div className="w-3/5 flex flex-col border-r">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Brand Selection */}
            {state.phase === 'select_brand' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Selecione a marca para a landing page:
                </p>
                <div className="grid gap-3">
                  {BRAND_OPTIONS.map((brand) => (
                    <Card
                      key={brand.slug}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleSelectBrand(brand.slug)}
                    >
                      <CardContent className="flex items-center gap-4 p-4">
                        <img
                          src={brand.logo}
                          alt={brand.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div>
                          <p className="font-medium">{brand.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {brand.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Theme Selection */}
            {state.phase === 'briefing' && !theme && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Selecione o tema visual:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Card
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleSelectTheme('dark')}
                  >
                    <CardContent className="flex flex-col items-center gap-2 p-6">
                      <Moon className="h-8 w-8" />
                      <span className="font-medium">Escuro</span>
                    </CardContent>
                  </Card>
                  <Card
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleSelectTheme('light')}
                  >
                    <CardContent className="flex flex-col items-center gap-2 p-6">
                      <Sun className="h-8 w-8" />
                      <span className="font-medium">Claro</span>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Messages */}
            {state.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {msg.images && msg.images.length > 0 && (
                    <div className="flex gap-2 mb-2">
                      {msg.images.map((img) => (
                        <div key={img.id} className="relative">
                          <img
                            src={img.data}
                            alt={img.name}
                            className="w-16 h-16 rounded object-cover"
                          />
                          <Badge
                            variant="secondary"
                            className="absolute -top-1 -right-1 text-[10px] px-1 py-0"
                          >
                            {img.id}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {/* Loading dots */}
            {state.isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-3 flex items-center gap-1">
                  <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
                  <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
                  <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          {state.phase !== 'select_brand' &&
            !(state.phase === 'briefing' && !theme) &&
            state.phase !== 'deployed' && (
              <div className="border-t p-3 flex-shrink-0">
                {/* Image previews */}
                {uploadedImages.length > 0 && (
                  <div className="flex gap-2 mb-2">
                    {uploadedImages.map((img) => (
                      <div key={img.id} className="relative">
                        <img
                          src={img.data}
                          alt={img.name}
                          className="w-10 h-10 rounded object-cover"
                        />
                        <Badge
                          variant="secondary"
                          className="absolute -top-1 -right-1 text-[9px] px-1 py-0"
                        >
                          {img.id}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={state.isLoading}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Textarea
                    placeholder="Descreva o que deseja..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="min-h-[40px] max-h-[120px] resize-none"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    className="flex-shrink-0"
                    onClick={handleSend}
                    disabled={!input.trim() || state.isLoading}
                  >
                    {state.isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

          {/* Deployed state */}
          {state.phase === 'deployed' && state.deployUrl && (
            <div className="border-t p-4 flex-shrink-0 bg-green-50">
              <div className="flex items-center gap-2 mb-2">
                <Check className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">Publicada com sucesso!</span>
              </div>
              <a
                href={state.deployUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline break-all"
              >
                {state.deployUrl}
              </a>
            </div>
          )}
        </div>

        {/* Right: Preview Panel (40%) */}
        <div className="w-2/5 flex flex-col bg-muted/30">
          {/* Preview toolbar */}
          <div className="flex items-center justify-between border-b px-4 py-2 flex-shrink-0">
            <span className="text-sm font-medium text-muted-foreground">Preview</span>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 border rounded-md p-0.5">
                <Button
                  variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPreviewMode('desktop')}
                >
                  <Monitor className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPreviewMode('mobile')}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Preview content */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            {state.currentHtml ? (
              <div
                className={`bg-white rounded-lg shadow-lg overflow-hidden transition-all ${
                  previewMode === 'mobile' ? 'w-[375px]' : 'w-full'
                } h-full`}
              >
                <iframe
                  srcDoc={state.currentHtml}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin"
                  title="Preview da Landing Page"
                />
              </div>
            ) : (
              <div className="text-center space-y-3">
                <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  O preview aparecera aqui apos a geracao da landing page.
                </p>
              </div>
            )}
          </div>

          {/* Action buttons when reviewing */}
          {state.phase === 'reviewing' && state.currentHtml && (
            <div className="border-t p-3 flex gap-2 flex-shrink-0">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleRequestAdjust}
                disabled={state.isLoading}
              >
                Pedir Ajuste
              </Button>
              <Button
                className="flex-1"
                onClick={handleApproveAndPublish}
                disabled={state.isLoading}
              >
                {state.isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Aprovar e Publicar
              </Button>
            </div>
          )}

          {/* Deploying state */}
          {state.phase === 'deploying' && (
            <div className="border-t p-3 flex items-center justify-center gap-2 flex-shrink-0">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Publicando...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
