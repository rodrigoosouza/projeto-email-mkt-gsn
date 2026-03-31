'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Target,
  Globe,
  ShoppingCart,
  Eye,
  ThumbsUp,
  RotateCcw,
  Users,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Upload,
  X,
  Plus,
  Image as ImageIcon,
  Video,
  Layers,
  Megaphone,
  Search,
  ExternalLink,
  KeyRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { createAdCampaign } from '@/lib/supabase/ad-campaigns'
import { createClient } from '@/lib/supabase/client'

// ─── Types ──────────────────────────────────────────────────────────────────

type Platform = 'meta_ads' | 'google_ads'

interface ObjectiveOption {
  value: string
  label: string
  description: string
  icon: React.ElementType
}

interface Interest {
  id: string
  name: string
  audience_size?: number
}

interface CustomAudience {
  id: string
  name: string
  approximate_count?: number
}

interface PixelInfo {
  id: string
  name: string
}

interface PageInfo {
  id: string
  name: string
}

interface CopyVariant {
  primary_text: string
  headline: string
  description: string
  cta: string
}

interface WizardState {
  // Step 1: Campaign
  campaignName: string
  objective: string
  cboEnabled: boolean
  cboBudgetDaily: number
  startDate: string
  endDate: string
  // Step 2: Ad Set (Meta) / Targeting (Google)
  adSetName: string
  ageMin: number
  ageMax: number
  gender: string
  locations: string[]
  interests: Interest[]
  customAudiences: string[]
  excludedAudiences: string[]
  placementMode: string
  manualPlacements: string[]
  adSetBudgetDaily: number
  pixelId: string
  conversionLocation: string
  // Step 2: Google Ads specific
  googleKeywords: string
  googleMatchType: 'BROAD' | 'PHRASE' | 'EXACT'
  googleLanguage: string
  googleCampaignType: 'SEARCH' | 'DISPLAY' | 'VIDEO'
  // Step 3: Creative (Meta) / Ad Copy (Google)
  creativeFormat: string
  mediaUrl: string
  mediaFile: File | null
  mediaPreviewUrl: string
  copyVariants: CopyVariant[]
  destinationUrl: string
  // Step 3: Google Ads specific
  googleHeadlines: string[]
  googleDescriptions: string[]
  googleFinalUrl: string
  googlePath1: string
  googlePath2: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const OBJECTIVES: ObjectiveOption[] = [
  { value: 'lead_generation', label: 'Geracao de Leads', description: 'Coletar contatos via formulario', icon: Target },
  { value: 'traffic', label: 'Trafego', description: 'Enviar pessoas pro site ou LP', icon: Globe },
  { value: 'conversion', label: 'Conversao', description: 'Otimizar para compras ou cadastros', icon: ShoppingCart },
  { value: 'awareness', label: 'Reconhecimento', description: 'Alcancar o maximo de pessoas', icon: Eye },
  { value: 'engagement', label: 'Engajamento', description: 'Curtidas, comentarios, compartilhamentos', icon: ThumbsUp },
  { value: 'retargeting', label: 'Remarketing', description: 'Reimpactar quem ja visitou', icon: RotateCcw },
]

const GOOGLE_OBJECTIVES: ObjectiveOption[] = [
  { value: 'traffic', label: 'Trafego', description: 'Enviar pessoas pro site via pesquisa', icon: Globe },
  { value: 'lead_generation', label: 'Geracao de Leads', description: 'Coletar contatos via formulario', icon: Target },
  { value: 'conversion', label: 'Conversao', description: 'Otimizar para compras ou cadastros', icon: ShoppingCart },
  { value: 'awareness', label: 'Reconhecimento', description: 'Alcancar o maximo de pessoas', icon: Eye },
]

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR',
  'SC', 'SP', 'SE', 'TO',
]

const CTA_OPTIONS = [
  { value: 'LEARN_MORE', label: 'Saiba Mais' },
  { value: 'SIGN_UP', label: 'Cadastre-se' },
  { value: 'SUBSCRIBE', label: 'Inscrever-se' },
  { value: 'SHOP_NOW', label: 'Comprar' },
  { value: 'DOWNLOAD', label: 'Baixar' },
  { value: 'CONTACT_US', label: 'Contato' },
  { value: 'BOOK_NOW', label: 'Agendar' },
]

const PLACEMENT_OPTIONS = [
  { value: 'facebook_feed', label: 'Facebook Feed' },
  { value: 'facebook_stories', label: 'Facebook Stories' },
  { value: 'facebook_reels', label: 'Facebook Reels' },
  { value: 'instagram_feed', label: 'Instagram Feed' },
  { value: 'instagram_stories', label: 'Instagram Stories' },
  { value: 'audience_network', label: 'Audience Network' },
]

const PLACEMENT_PRESETS: Record<string, string> = {
  automatic: 'automatic',
  feed_only: 'facebook_feed,instagram_feed',
  feed_stories: 'facebook_feed,facebook_stories,instagram_feed,instagram_stories',
  feed_stories_reels: 'facebook_feed,facebook_stories,facebook_reels,instagram_feed,instagram_stories',
  instagram_only: 'instagram_feed,instagram_stories',
  stories_reels: 'facebook_stories,facebook_reels,instagram_stories',
}

const STEPS = [
  { number: 1, label: 'Campanha' },
  { number: 2, label: 'Conjunto' },
  { number: 3, label: 'Criativo' },
  { number: 4, label: 'Revisao' },
]

const GOOGLE_STEPS = [
  { number: 1, label: 'Campanha' },
  { number: 2, label: 'Segmentacao' },
  { number: 3, label: 'Anuncio' },
  { number: 4, label: 'Revisao' },
]

function getDefaultState(): WizardState {
  return {
    campaignName: '',
    objective: '',
    cboEnabled: false,
    cboBudgetDaily: 20,
    startDate: '',
    endDate: '',
    adSetName: '',
    ageMin: 18,
    ageMax: 65,
    gender: 'all',
    locations: [],
    interests: [],
    customAudiences: [],
    excludedAudiences: [],
    placementMode: 'automatic',
    manualPlacements: [],
    adSetBudgetDaily: 20,
    pixelId: '',
    conversionLocation: 'WEBSITE',
    googleKeywords: '',
    googleMatchType: 'BROAD',
    googleLanguage: 'Portugues',
    googleCampaignType: 'SEARCH',
    creativeFormat: 'image',
    mediaUrl: '',
    mediaFile: null,
    mediaPreviewUrl: '',
    copyVariants: [{ primary_text: '', headline: '', description: '', cta: 'LEARN_MORE' }],
    destinationUrl: '',
    googleHeadlines: ['', '', ''],
    googleDescriptions: ['', ''],
    googleFinalUrl: '',
    googlePath1: '',
    googlePath2: '',
  }
}

// ─── Platform Toggle ────────────────────────────────────────────────────────

function PlatformToggle({
  platform,
  onChange,
}: {
  platform: Platform
  onChange: (p: Platform) => void
}) {
  return (
    <div className="flex items-center gap-2 p-1 rounded-lg bg-muted w-fit mb-6">
      <button
        type="button"
        onClick={() => onChange('meta_ads')}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
          platform === 'meta_ads'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
        Meta Ads
      </button>
      <button
        type="button"
        onClick={() => onChange('google_ads')}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
          platform === 'google_ads'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Google Ads
      </button>
    </div>
  )
}

// ─── Step Indicator ─────────────────────────────────────────────────────────

function StepIndicator({ currentStep, platform }: { currentStep: number; platform: Platform }) {
  const steps = platform === 'google_ads' ? GOOGLE_STEPS : STEPS
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8">
      {steps.map((step, i) => (
        <div key={step.number} className="flex items-center">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div
              className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                currentStep === step.number
                  ? 'bg-primary text-primary-foreground'
                  : currentStep > step.number
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {currentStep > step.number ? <Check className="h-4 w-4" /> : step.number}
            </div>
            <span
              className={`hidden sm:block text-sm font-medium ${
                currentStep === step.number ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`mx-2 sm:mx-4 h-px w-6 sm:w-12 ${currentStep > step.number ? 'bg-primary' : 'bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Step 1: Campaign ───────────────────────────────────────────────────────

function StepCampaign({
  state,
  onChange,
  platform,
}: {
  state: WizardState
  onChange: (updates: Partial<WizardState>) => void
  platform: Platform
}) {
  const { currentOrg } = useOrganizationContext()
  const orgPrefix = currentOrg?.name?.split(' ')[0] || 'Org'
  const objectives = platform === 'google_ads' ? GOOGLE_OBJECTIVES : OBJECTIVES

  const handleObjectiveSelect = (value: string) => {
    onChange({ objective: value })
    if (!state.campaignName) {
      const obj = objectives.find(o => o.value === value)
      const platformLabel = platform === 'google_ads' ? 'GAds' : 'Meta'
      onChange({
        objective: value,
        campaignName: `[${orgPrefix}] [${platformLabel}] ${obj?.label || ''} - `,
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Objetivo da Campanha</CardTitle>
          <CardDescription>Escolha o que voce deseja alcancar com esta campanha</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {objectives.map((obj) => {
              const Icon = obj.icon
              const selected = state.objective === obj.value
              return (
                <button
                  key={obj.value}
                  type="button"
                  onClick={() => handleObjectiveSelect(obj.value)}
                  className={`flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-all hover:border-primary/50 ${
                    selected ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className={`rounded-md p-2 ${selected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{obj.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{obj.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalhes da Campanha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="campaign-name">Nome da Campanha</Label>
            <Input
              id="campaign-name"
              placeholder={`[${orgPrefix}] Objetivo - Descricao`}
              value={state.campaignName}
              onChange={(e) => onChange({ campaignName: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Formato sugerido: [Empresa] Objetivo - Descricao
            </p>
          </div>

          {platform === 'google_ads' && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Tipo de Campanha Google</Label>
                <Select
                  value={state.googleCampaignType}
                  onValueChange={(v) => onChange({ googleCampaignType: v as 'SEARCH' | 'DISPLAY' | 'VIDEO' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEARCH">Pesquisa (Search)</SelectItem>
                    <SelectItem value="DISPLAY">Display</SelectItem>
                    <SelectItem value="VIDEO">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {platform === 'meta_ads' && (
            <>
              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Orcamento no Nivel da Campanha (CBO)</Label>
                  <p className="text-xs text-muted-foreground">
                    O Meta distribui o orcamento automaticamente entre os conjuntos
                  </p>
                </div>
                <Switch
                  checked={state.cboEnabled}
                  onCheckedChange={(checked) => onChange({ cboEnabled: checked })}
                />
              </div>

              {state.cboEnabled && (
                <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                  <Label htmlFor="cbo-budget">Orcamento Diario (R$)</Label>
                  <Input
                    id="cbo-budget"
                    type="number"
                    min={5}
                    step={1}
                    value={state.cboBudgetDaily}
                    onChange={(e) => onChange({ cboBudgetDaily: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Minimo: R$ 5,00/dia</p>
                </div>
              )}
            </>
          )}

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Data de Inicio</Label>
              <Input
                id="start-date"
                type="date"
                value={state.startDate}
                onChange={(e) => onChange({ startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">Data de Fim (opcional)</Label>
              <Input
                id="end-date"
                type="date"
                value={state.endDate}
                onChange={(e) => onChange({ endDate: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Step 2: Ad Set (Meta) ──────────────────────────────────────────────────

function StepAdSet({
  state,
  onChange,
  audiences,
  pixels,
}: {
  state: WizardState
  onChange: (updates: Partial<WizardState>) => void
  audiences: CustomAudience[]
  pixels: PixelInfo[]
}) {
  const { currentOrg } = useOrganizationContext()
  const orgId = currentOrg?.id || ''
  const [interestQuery, setInterestQuery] = useState('')
  const [interestResults, setInterestResults] = useState<Interest[]>([])
  const [searchingInterests, setSearchingInterests] = useState(false)
  const [locationInput, setLocationInput] = useState('')
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  const searchInterests = useCallback(async (query: string) => {
    if (!query || query.length < 2 || !orgId) return
    setSearchingInterests(true)
    try {
      const res = await fetch(`/api/meta-ads/interests?q=${encodeURIComponent(query)}&orgId=${orgId}`)
      if (res.ok) {
        const data = await res.json()
        setInterestResults(data.interests || [])
      }
    } catch {
      // silent
    } finally {
      setSearchingInterests(false)
    }
  }, [orgId])

  const handleInterestSearch = (value: string) => {
    setInterestQuery(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => searchInterests(value), 400)
  }

  const addInterest = (interest: Interest) => {
    if (!state.interests.find(i => i.id === interest.id)) {
      onChange({ interests: [...state.interests, interest] })
    }
    setInterestQuery('')
    setInterestResults([])
  }

  const removeInterest = (id: string) => {
    onChange({ interests: state.interests.filter(i => i.id !== id) })
  }

  const addLocation = () => {
    const loc = locationInput.trim().toUpperCase()
    if (loc && BRAZILIAN_STATES.includes(loc) && !state.locations.includes(loc)) {
      onChange({ locations: [...state.locations, loc] })
    }
    setLocationInput('')
  }

  const removeLocation = (loc: string) => {
    onChange({ locations: state.locations.filter(l => l !== loc) })
  }

  const toggleAudience = (id: string, type: 'include' | 'exclude') => {
    const key = type === 'include' ? 'customAudiences' : 'excludedAudiences'
    const current = state[key]
    if (current.includes(id)) {
      onChange({ [key]: current.filter(a => a !== id) })
    } else {
      onChange({ [key]: [...current, id] })
    }
  }

  const togglePlacement = (value: string) => {
    const current = state.manualPlacements
    if (current.includes(value)) {
      onChange({ manualPlacements: current.filter(p => p !== value) })
    } else {
      onChange({ manualPlacements: [...current, value] })
    }
  }

  return (
    <div className="space-y-6">
      {/* Ad Set Name */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nome do Conjunto</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Ex: Publico - Empresarios 25-45 SP"
            value={state.adSetName}
            onChange={(e) => onChange({ adSetName: e.target.value })}
          />
        </CardContent>
      </Card>

      {/* Audience */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Publico-alvo</CardTitle>
          <CardDescription>Defina quem vera seus anuncios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Age + Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Idade Minima</Label>
              <Input
                type="number"
                min={18}
                max={65}
                value={state.ageMin}
                onChange={(e) => onChange({ ageMin: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Idade Maxima</Label>
              <Input
                type="number"
                min={18}
                max={65}
                value={state.ageMax}
                onChange={(e) => onChange({ ageMax: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Genero</Label>
              <Select value={state.gender} onValueChange={(v) => onChange({ gender: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="female">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Locations */}
          <div className="space-y-2">
            <Label>Localizacao (Estados)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Digite a sigla do estado (ex: SP)"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLocation() } }}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addLocation}>
                Adicionar
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {state.locations.map(loc => (
                <Badge key={loc} variant="secondary" className="gap-1">
                  {loc}
                  <button type="button" onClick={() => removeLocation(loc)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {state.locations.length === 0 && (
                <span className="text-xs text-muted-foreground">Brasil inteiro (nenhum estado selecionado)</span>
              )}
            </div>
          </div>

          <Separator />

          {/* Interests */}
          <div className="space-y-2">
            <Label>Interesses</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar interesses no Meta (ex: marketing digital)"
                value={interestQuery}
                onChange={(e) => handleInterestSearch(e.target.value)}
                className="pl-9"
              />
              {searchingInterests && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {interestResults.length > 0 && (
              <div className="border rounded-md max-h-48 overflow-auto bg-popover shadow-md">
                {interestResults.map(interest => (
                  <button
                    key={interest.id}
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent transition-colors"
                    onClick={() => addInterest(interest)}
                  >
                    <span>{interest.name}</span>
                    {interest.audience_size && (
                      <span className="text-xs text-muted-foreground">
                        {(interest.audience_size / 1_000_000).toFixed(1)}M
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {state.interests.map(interest => (
                <Badge key={interest.id} variant="secondary" className="gap-1">
                  {interest.name}
                  <button type="button" onClick={() => removeInterest(interest.id)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Custom Audiences */}
          {audiences.length > 0 && (
            <div className="space-y-3">
              <Label>Publicos Personalizados (Incluir)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {audiences.map(aud => (
                  <label key={aud.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={state.customAudiences.includes(aud.id)}
                      onCheckedChange={() => toggleAudience(aud.id, 'include')}
                    />
                    <span className="truncate">{aud.name}</span>
                    {aud.approximate_count && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        {aud.approximate_count.toLocaleString('pt-BR')}
                      </span>
                    )}
                  </label>
                ))}
              </div>

              <Label className="mt-4">Publicos Excluidos</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {audiences.map(aud => (
                  <label key={aud.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={state.excludedAudiences.includes(aud.id)}
                      onCheckedChange={() => toggleAudience(aud.id, 'exclude')}
                    />
                    <span className="truncate">{aud.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Placement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Posicionamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="placement"
                checked={state.placementMode === 'automatic'}
                onChange={() => onChange({ placementMode: 'automatic', manualPlacements: [] })}
                className="accent-primary"
              />
              <div>
                <span className="text-sm font-medium">Automatico</span>
                <span className="text-xs text-muted-foreground ml-1">(Recomendado)</span>
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="placement"
                checked={state.placementMode === 'manual'}
                onChange={() => onChange({ placementMode: 'manual' })}
                className="accent-primary"
              />
              <span className="text-sm font-medium">Manual</span>
            </label>
          </div>

          {state.placementMode === 'manual' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4 border-l-2 border-primary/20">
              {PLACEMENT_OPTIONS.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={state.manualPlacements.includes(opt.value)}
                    onCheckedChange={() => togglePlacement(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget (if not CBO) + Pixel + Conversion */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Orcamento e Conversao</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!state.cboEnabled && (
            <div className="space-y-2">
              <Label>Orcamento Diario do Conjunto (R$)</Label>
              <Input
                type="number"
                min={5}
                step={1}
                value={state.adSetBudgetDaily}
                onChange={(e) => onChange({ adSetBudgetDaily: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Minimo: R$ 5,00/dia</p>
            </div>
          )}

          {state.cboEnabled && (
            <p className="text-sm text-muted-foreground">
              Orcamento controlado no nivel da campanha (CBO ativado)
            </p>
          )}

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pixel</Label>
              <Select value={state.pixelId || 'none'} onValueChange={(v) => onChange({ pixelId: v === 'none' ? '' : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar pixel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {pixels.map(px => (
                    <SelectItem key={px.id} value={px.id}>{px.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Local de Conversao</Label>
              <Select value={state.conversionLocation} onValueChange={(v) => onChange({ conversionLocation: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEBSITE">Website</SelectItem>
                  <SelectItem value="APP">App</SelectItem>
                  <SelectItem value="MESSENGER">Messenger</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Step 2: Google Ads Targeting ────────────────────────────────────────────

function StepGoogleTargeting({
  state,
  onChange,
}: {
  state: WizardState
  onChange: (updates: Partial<WizardState>) => void
}) {
  const [locationInput, setLocationInput] = useState('')

  const addLocation = () => {
    const loc = locationInput.trim().toUpperCase()
    if (loc && BRAZILIAN_STATES.includes(loc) && !state.locations.includes(loc)) {
      onChange({ locations: [...state.locations, loc] })
    }
    setLocationInput('')
  }

  const removeLocation = (loc: string) => {
    onChange({ locations: state.locations.filter(l => l !== loc) })
  }

  return (
    <div className="space-y-6">
      {/* Keywords */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Palavras-chave
          </CardTitle>
          <CardDescription>
            Digite uma palavra-chave por linha. Essas palavras acionarao a exibicao dos seus anuncios na pesquisa do Google.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder={"consultoria empresarial\ngestao de qualidade\nISO 9001 certificacao\nconsultoria ISO\ngestao empresarial"}
              value={state.googleKeywords}
              onChange={(e) => onChange({ googleKeywords: e.target.value })}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {state.googleKeywords.split('\n').filter(k => k.trim()).length} palavra(s)-chave
            </p>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Correspondencia</Label>
            <Select
              value={state.googleMatchType}
              onValueChange={(v) => onChange({ googleMatchType: v as 'BROAD' | 'PHRASE' | 'EXACT' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BROAD">Ampla (Broad)</SelectItem>
                <SelectItem value="PHRASE">Frase (Phrase)</SelectItem>
                <SelectItem value="EXACT">Exata (Exact)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {state.googleMatchType === 'BROAD' && 'Exibe para buscas relacionadas e variacoes das palavras-chave'}
              {state.googleMatchType === 'PHRASE' && 'Exibe quando a busca contem a frase exata ou variacao proxima'}
              {state.googleMatchType === 'EXACT' && 'Exibe apenas para a busca exata ou variacao muito proxima'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Localizacao</CardTitle>
          <CardDescription>Defina onde seus anuncios serao exibidos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Digite a sigla do estado (ex: SP)"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLocation() } }}
              className="flex-1"
            />
            <Button type="button" variant="outline" size="sm" onClick={addLocation}>
              Adicionar
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {state.locations.map(loc => (
              <Badge key={loc} variant="secondary" className="gap-1">
                {loc}
                <button type="button" onClick={() => removeLocation(loc)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {state.locations.length === 0 && (
              <span className="text-xs text-muted-foreground">Brasil inteiro (nenhum estado selecionado)</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Language + Budget */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Idioma e Orcamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Idioma</Label>
              <Select
                value={state.googleLanguage}
                onValueChange={(v) => onChange({ googleLanguage: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Portugues">Portugues</SelectItem>
                  <SelectItem value="Ingles">Ingles</SelectItem>
                  <SelectItem value="Espanhol">Espanhol</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Orcamento Diario (R$)</Label>
              <Input
                type="number"
                min={5}
                step={1}
                value={state.adSetBudgetDaily}
                onChange={(e) => onChange({ adSetBudgetDaily: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Minimo: R$ 5,00/dia</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Step 3: Creative (Meta) ────────────────────────────────────────────────

function StepCreative({
  state,
  onChange,
}: {
  state: WizardState
  onChange: (updates: Partial<WizardState>) => void
}) {
  const { currentOrg } = useOrganizationContext()
  const orgId = currentOrg?.id || ''
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formats = [
    { value: 'image', label: 'Imagem Unica', icon: ImageIcon },
    { value: 'video', label: 'Video', icon: Video },
    { value: 'carousel', label: 'Carrossel', icon: Layers },
  ]

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !orgId) return

    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `ads/${orgId}/${Date.now()}.${ext}`

      const { error } = await supabase.storage
        .from('ad-creatives')
        .upload(path, file, { upsert: true })

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('ad-creatives')
        .getPublicUrl(path)

      onChange({
        mediaFile: file,
        mediaUrl: urlData.publicUrl,
        mediaPreviewUrl: URL.createObjectURL(file),
      })
    } catch (err: any) {
      console.error('Upload error:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleMediaUrlChange = (url: string) => {
    onChange({ mediaUrl: url, mediaPreviewUrl: url, mediaFile: null })
  }

  const updateVariant = (index: number, field: keyof CopyVariant, value: string) => {
    const updated = [...state.copyVariants]
    updated[index] = { ...updated[index], [field]: value }
    onChange({ copyVariants: updated })
  }

  const addVariant = () => {
    onChange({
      copyVariants: [...state.copyVariants, { primary_text: '', headline: '', description: '', cta: 'LEARN_MORE' }],
    })
  }

  const removeVariant = (index: number) => {
    if (state.copyVariants.length <= 1) return
    onChange({ copyVariants: state.copyVariants.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-6">
      {/* Format */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Formato do Anuncio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {formats.map(fmt => {
              const Icon = fmt.icon
              const selected = state.creativeFormat === fmt.value
              return (
                <button
                  key={fmt.value}
                  type="button"
                  onClick={() => onChange({ creativeFormat: fmt.value })}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:border-primary/50 ${
                    selected ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <Icon className={`h-6 w-6 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="text-sm font-medium">{fmt.label}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Media */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Midia</CardTitle>
          <CardDescription>Faca upload ou cole a URL da imagem/video</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {uploading ? 'Enviando...' : 'Upload'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Input
              placeholder="Ou cole a URL da midia"
              value={state.mediaFile ? '' : state.mediaUrl}
              onChange={(e) => handleMediaUrlChange(e.target.value)}
              className="flex-1"
              disabled={!!state.mediaFile}
            />
          </div>

          {state.mediaPreviewUrl && (
            <div className="relative">
              <button
                type="button"
                className="absolute top-2 right-2 z-10 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                onClick={() => onChange({ mediaUrl: '', mediaFile: null, mediaPreviewUrl: '' })}
              >
                <X className="h-4 w-4" />
              </button>
              {state.creativeFormat === 'video' ? (
                <video
                  src={state.mediaPreviewUrl}
                  controls
                  className="w-full max-h-64 rounded-lg object-contain bg-black"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={state.mediaPreviewUrl}
                  alt="Preview"
                  className="w-full max-h-64 rounded-lg object-contain bg-muted"
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Copy Variants */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Textos do Anuncio</CardTitle>
              <CardDescription>Adicione variantes de texto para testes</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addVariant}>
              <Plus className="h-4 w-4 mr-1" /> Variante
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {state.copyVariants.map((variant, idx) => (
            <div key={idx} className="space-y-3 relative">
              {idx > 0 && <Separator className="mb-4" />}
              {state.copyVariants.length > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Variante {idx + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeVariant(idx)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="space-y-2">
                <Label>Texto Principal</Label>
                <Textarea
                  placeholder="O texto que aparece acima da imagem (max 125 caracteres)"
                  value={variant.primary_text}
                  onChange={(e) => updateVariant(idx, 'primary_text', e.target.value)}
                  maxLength={125}
                  rows={2}
                />
                <p className="text-xs text-muted-foreground text-right">{variant.primary_text.length}/125</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Titulo</Label>
                  <Input
                    placeholder="Titulo do anuncio (max 40)"
                    value={variant.headline}
                    onChange={(e) => updateVariant(idx, 'headline', e.target.value)}
                    maxLength={40}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descricao (opcional)</Label>
                  <Input
                    placeholder="Descricao curta"
                    value={variant.description}
                    onChange={(e) => updateVariant(idx, 'description', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Chamada para Acao (CTA)</Label>
                <Select value={variant.cta} onValueChange={(v) => updateVariant(idx, 'cta', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CTA_OPTIONS.map(cta => (
                      <SelectItem key={cta.value} value={cta.value}>{cta.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Destination URL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Link de Destino</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="https://seusite.com.br/pagina"
            value={state.destinationUrl}
            onChange={(e) => onChange({ destinationUrl: e.target.value })}
          />
        </CardContent>
      </Card>

      {/* Ad Preview */}
      {(state.mediaPreviewUrl || state.copyVariants[0]?.primary_text) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview do Anuncio (Feed)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-sm mx-auto border rounded-lg overflow-hidden bg-background">
              {/* Header */}
              <div className="flex items-center gap-2 p-3">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">Sua Empresa</p>
                  <p className="text-xs text-muted-foreground">Patrocinado</p>
                </div>
              </div>
              {/* Primary Text */}
              {state.copyVariants[0]?.primary_text && (
                <p className="px-3 pb-2 text-sm">{state.copyVariants[0].primary_text}</p>
              )}
              {/* Media */}
              {state.mediaPreviewUrl && (
                state.creativeFormat === 'video' ? (
                  <video src={state.mediaPreviewUrl} className="w-full aspect-square object-cover bg-black" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={state.mediaPreviewUrl} alt="Ad" className="w-full aspect-square object-cover bg-muted" />
                )
              )}
              {/* Bottom */}
              <div className="p-3 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    {state.destinationUrl && (
                      <p className="text-xs text-muted-foreground truncate uppercase">
                        {state.destinationUrl.replace(/https?:\/\//, '').split('/')[0]}
                      </p>
                    )}
                    {state.copyVariants[0]?.headline && (
                      <p className="text-sm font-semibold truncate">{state.copyVariants[0].headline}</p>
                    )}
                    {state.copyVariants[0]?.description && (
                      <p className="text-xs text-muted-foreground truncate">{state.copyVariants[0].description}</p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="ml-2 shrink-0 text-xs">
                    {CTA_OPTIONS.find(c => c.value === state.copyVariants[0]?.cta)?.label || 'Saiba Mais'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Step 3: Google Ads Ad Copy ─────────────────────────────────────────────

function StepGoogleAdCopy({
  state,
  onChange,
}: {
  state: WizardState
  onChange: (updates: Partial<WizardState>) => void
}) {
  const updateHeadline = (index: number, value: string) => {
    const updated = [...state.googleHeadlines]
    updated[index] = value
    onChange({ googleHeadlines: updated })
  }

  const addHeadline = () => {
    if (state.googleHeadlines.length < 15) {
      onChange({ googleHeadlines: [...state.googleHeadlines, ''] })
    }
  }

  const removeHeadline = (index: number) => {
    if (state.googleHeadlines.length <= 3) return
    onChange({ googleHeadlines: state.googleHeadlines.filter((_, i) => i !== index) })
  }

  const updateDescription = (index: number, value: string) => {
    const updated = [...state.googleDescriptions]
    updated[index] = value
    onChange({ googleDescriptions: updated })
  }

  const addDescription = () => {
    if (state.googleDescriptions.length < 4) {
      onChange({ googleDescriptions: [...state.googleDescriptions, ''] })
    }
  }

  const removeDescription = (index: number) => {
    if (state.googleDescriptions.length <= 2) return
    onChange({ googleDescriptions: state.googleDescriptions.filter((_, i) => i !== index) })
  }

  // Preview: pick first 3 non-empty headlines and first 2 non-empty descriptions
  const previewHeadlines = state.googleHeadlines.filter(h => h.trim()).slice(0, 3)
  const previewDescriptions = state.googleDescriptions.filter(d => d.trim()).slice(0, 2)
  const previewUrl = state.googleFinalUrl || 'www.seusite.com.br'
  const displayUrl = previewUrl.replace(/https?:\/\//, '').split('/')[0]
  const displayPath = [state.googlePath1, state.googlePath2].filter(Boolean).join('/')

  return (
    <div className="space-y-6">
      {/* Headlines */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Titulos (Headlines)</CardTitle>
              <CardDescription>
                Minimo 3, maximo 15. Cada titulo com ate 30 caracteres.
              </CardDescription>
            </div>
            {state.googleHeadlines.length < 15 && (
              <Button type="button" variant="outline" size="sm" onClick={addHeadline}>
                <Plus className="h-4 w-4 mr-1" /> Titulo
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {state.googleHeadlines.map((headline, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
                  <Input
                    placeholder={`Titulo ${idx + 1} (max 30 caracteres)`}
                    value={headline}
                    onChange={(e) => updateHeadline(idx, e.target.value)}
                    maxLength={30}
                    className="flex-1"
                  />
                  <span className={`text-xs w-10 text-right shrink-0 ${headline.length > 27 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                    {headline.length}/30
                  </span>
                  {state.googleHeadlines.length > 3 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeHeadline(idx)}
                      className="text-destructive hover:text-destructive h-8 w-8 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Descriptions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Descricoes</CardTitle>
              <CardDescription>
                Minimo 2, maximo 4. Cada descricao com ate 90 caracteres.
              </CardDescription>
            </div>
            {state.googleDescriptions.length < 4 && (
              <Button type="button" variant="outline" size="sm" onClick={addDescription}>
                <Plus className="h-4 w-4 mr-1" /> Descricao
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {state.googleDescriptions.map((desc, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-xs text-muted-foreground w-5 shrink-0 mt-2.5">{idx + 1}.</span>
              <div className="flex-1">
                <Textarea
                  placeholder={`Descricao ${idx + 1} (max 90 caracteres)`}
                  value={desc}
                  onChange={(e) => updateDescription(idx, e.target.value)}
                  maxLength={90}
                  rows={2}
                  className="resize-none"
                />
                <p className={`text-xs text-right mt-1 ${desc.length > 80 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                  {desc.length}/90
                </p>
              </div>
              {state.googleDescriptions.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeDescription(idx)}
                  className="text-destructive hover:text-destructive h-8 w-8 p-0 mt-1"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* URL + Display Path */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">URL de Destino</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL Final</Label>
            <Input
              placeholder="https://seusite.com.br/pagina"
              value={state.googleFinalUrl}
              onChange={(e) => onChange({ googleFinalUrl: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Caminho de Exibicao 1 (opcional)</Label>
              <Input
                placeholder="consultorias"
                value={state.googlePath1}
                onChange={(e) => onChange({ googlePath1: e.target.value })}
                maxLength={15}
              />
              <p className="text-xs text-muted-foreground">{state.googlePath1.length}/15</p>
            </div>
            <div className="space-y-2">
              <Label>Caminho de Exibicao 2 (opcional)</Label>
              <Input
                placeholder="iso-9001"
                value={state.googlePath2}
                onChange={(e) => onChange({ googlePath2: e.target.value })}
                maxLength={15}
              />
              <p className="text-xs text-muted-foreground">{state.googlePath2.length}/15</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Ad Preview */}
      {(previewHeadlines.length > 0 || previewDescriptions.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview do Anuncio (Pesquisa Google)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-lg mx-auto border rounded-lg p-4 bg-background space-y-1">
              <p className="text-xs text-muted-foreground">Patrocinado</p>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                {displayUrl}{displayPath ? `/${displayPath}` : ''}
              </p>
              <p className="text-lg text-blue-800 dark:text-blue-300 font-medium leading-tight">
                {previewHeadlines.join(' | ') || 'Titulo do Anuncio'}
              </p>
              <p className="text-sm text-muted-foreground leading-snug">
                {previewDescriptions.join(' ') || 'Descricao do anuncio aparecera aqui.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Step 4: Review (Meta) ──────────────────────────────────────────────────

function StepReview({ state }: { state: WizardState }) {
  const objectiveLabel = OBJECTIVES.find(o => o.value === state.objective)?.label || state.objective
  const genderLabel = state.gender === 'all' ? 'Todos' : state.gender === 'male' ? 'Masculino' : 'Feminino'
  const ctaLabel = (cta: string) => CTA_OPTIONS.find(c => c.value === cta)?.label || cta

  const budget = state.cboEnabled ? state.cboBudgetDaily : state.adSetBudgetDaily
  const budgetLevel = state.cboEnabled ? 'Campanha (CBO)' : 'Conjunto'

  const placementLabel = state.placementMode === 'automatic'
    ? 'Automatico'
    : state.manualPlacements.map(p => PLACEMENT_OPTIONS.find(o => o.value === p)?.label || p).join(', ') || 'Nenhum selecionado'

  return (
    <div className="space-y-6">
      {/* Campaign */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Campanha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Nome</dt>
              <dd className="font-medium">{state.campaignName || '(sem nome)'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Objetivo</dt>
              <dd className="font-medium">{objectiveLabel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Orcamento Diario</dt>
              <dd className="font-medium">R$ {budget.toFixed(2)} ({budgetLevel})</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Periodo</dt>
              <dd className="font-medium">
                {state.startDate || 'Sem data'} {state.endDate ? `ate ${state.endDate}` : '(sem fim)'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Ad Set */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Conjunto de Anuncio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Nome</dt>
              <dd className="font-medium">{state.adSetName || '(sem nome)'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Idade</dt>
              <dd className="font-medium">{state.ageMin} - {state.ageMax} anos</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Genero</dt>
              <dd className="font-medium">{genderLabel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Localizacao</dt>
              <dd className="font-medium">
                {state.locations.length > 0 ? state.locations.join(', ') : 'Brasil inteiro'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Posicionamento</dt>
              <dd className="font-medium">{placementLabel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Conversao</dt>
              <dd className="font-medium">{state.conversionLocation}</dd>
            </div>
          </dl>

          {state.interests.length > 0 && (
            <div className="mt-3">
              <dt className="text-sm text-muted-foreground mb-1">Interesses</dt>
              <div className="flex flex-wrap gap-1">
                {state.interests.map(i => (
                  <Badge key={i.id} variant="secondary" className="text-xs">{i.name}</Badge>
                ))}
              </div>
            </div>
          )}

          {state.customAudiences.length > 0 && (
            <div className="mt-3">
              <dt className="text-sm text-muted-foreground mb-1">
                Publicos personalizados: {state.customAudiences.length} selecionado(s)
              </dt>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Creative */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Criativo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Formato</dt>
              <dd className="font-medium capitalize">{state.creativeFormat === 'image' ? 'Imagem Unica' : state.creativeFormat === 'video' ? 'Video' : 'Carrossel'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Link de Destino</dt>
              <dd className="font-medium truncate">
                {state.destinationUrl ? (
                  <a href={state.destinationUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                    {state.destinationUrl} <ExternalLink className="h-3 w-3" />
                  </a>
                ) : '(nenhum)'}
              </dd>
            </div>
          </dl>

          {state.mediaPreviewUrl && (
            <div className="mt-2">
              {state.creativeFormat === 'video' ? (
                <video src={state.mediaPreviewUrl} controls className="w-full max-h-48 rounded-lg object-contain bg-black" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={state.mediaPreviewUrl} alt="Preview" className="w-full max-h-48 rounded-lg object-contain bg-muted" />
              )}
            </div>
          )}

          {state.copyVariants.map((variant, idx) => (
            <div key={idx} className="text-sm space-y-1 p-3 rounded-md bg-muted/50">
              {state.copyVariants.length > 1 && (
                <span className="text-xs font-medium text-muted-foreground">Variante {idx + 1}</span>
              )}
              {variant.primary_text && <p><span className="text-muted-foreground">Texto:</span> {variant.primary_text}</p>}
              {variant.headline && <p><span className="text-muted-foreground">Titulo:</span> {variant.headline}</p>}
              {variant.description && <p><span className="text-muted-foreground">Descricao:</span> {variant.description}</p>}
              <p><span className="text-muted-foreground">CTA:</span> {ctaLabel(variant.cta)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Step 4: Review (Google Ads) ────────────────────────────────────────────

function StepGoogleReview({ state }: { state: WizardState }) {
  const objectiveLabel = GOOGLE_OBJECTIVES.find(o => o.value === state.objective)?.label || state.objective
  const keywords = state.googleKeywords.split('\n').filter(k => k.trim())
  const matchTypeLabel = state.googleMatchType === 'BROAD' ? 'Ampla' : state.googleMatchType === 'PHRASE' ? 'Frase' : 'Exata'
  const campaignTypeLabel = state.googleCampaignType === 'SEARCH' ? 'Pesquisa' : state.googleCampaignType === 'DISPLAY' ? 'Display' : 'Video'

  const previewHeadlines = state.googleHeadlines.filter(h => h.trim()).slice(0, 3)
  const previewDescriptions = state.googleDescriptions.filter(d => d.trim()).slice(0, 2)
  const displayUrl = (state.googleFinalUrl || 'www.seusite.com.br').replace(/https?:\/\//, '').split('/')[0]
  const displayPath = [state.googlePath1, state.googlePath2].filter(Boolean).join('/')

  return (
    <div className="space-y-6">
      {/* Campaign */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Campanha Google Ads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Nome</dt>
              <dd className="font-medium">{state.campaignName || '(sem nome)'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Objetivo</dt>
              <dd className="font-medium">{objectiveLabel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tipo</dt>
              <dd className="font-medium">{campaignTypeLabel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Orcamento Diario</dt>
              <dd className="font-medium">R$ {state.adSetBudgetDaily.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Periodo</dt>
              <dd className="font-medium">
                {state.startDate || 'Sem data'} {state.endDate ? `ate ${state.endDate}` : '(sem fim)'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Targeting */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Segmentacao
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Correspondencia</dt>
              <dd className="font-medium">{matchTypeLabel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Localizacao</dt>
              <dd className="font-medium">
                {state.locations.length > 0 ? state.locations.join(', ') : 'Brasil inteiro'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Idioma</dt>
              <dd className="font-medium">{state.googleLanguage}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Palavras-chave</dt>
              <dd className="font-medium">{keywords.length} palavra(s)-chave</dd>
            </div>
          </dl>

          {keywords.length > 0 && (
            <div className="mt-2">
              <div className="flex flex-wrap gap-1">
                {keywords.map((kw, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ad Copy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Anuncio Responsivo de Pesquisa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <dt className="text-sm text-muted-foreground">Titulos ({state.googleHeadlines.filter(h => h.trim()).length})</dt>
            <div className="flex flex-wrap gap-1">
              {state.googleHeadlines.filter(h => h.trim()).map((h, i) => (
                <Badge key={i} variant="outline" className="text-xs">{h}</Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <dt className="text-sm text-muted-foreground">Descricoes ({state.googleDescriptions.filter(d => d.trim()).length})</dt>
            {state.googleDescriptions.filter(d => d.trim()).map((d, i) => (
              <p key={i} className="text-sm p-2 rounded bg-muted/50">{d}</p>
            ))}
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">URL Final</dt>
              <dd className="font-medium truncate">
                {state.googleFinalUrl ? (
                  <a href={state.googleFinalUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                    {state.googleFinalUrl} <ExternalLink className="h-3 w-3" />
                  </a>
                ) : '(nenhum)'}
              </dd>
            </div>
            {(state.googlePath1 || state.googlePath2) && (
              <div>
                <dt className="text-muted-foreground">Caminho de Exibicao</dt>
                <dd className="font-medium">/{state.googlePath1}{state.googlePath2 ? `/${state.googlePath2}` : ''}</dd>
              </div>
            )}
          </dl>

          {/* Preview */}
          <Separator />
          <p className="text-sm font-medium text-muted-foreground">Preview na Pesquisa</p>
          <div className="max-w-lg border rounded-lg p-4 bg-background space-y-1">
            <p className="text-xs text-muted-foreground">Patrocinado</p>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              {displayUrl}{displayPath ? `/${displayPath}` : ''}
            </p>
            <p className="text-lg text-blue-800 dark:text-blue-300 font-medium leading-tight">
              {previewHeadlines.join(' | ') || 'Titulo do Anuncio'}
            </p>
            <p className="text-sm text-muted-foreground leading-snug">
              {previewDescriptions.join(' ') || 'Descricao do anuncio aparecera aqui.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main Wizard ────────────────────────────────────────────────────────────

export default function AdsCreatePage() {
  const router = useRouter()
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()
  const orgId = currentOrg?.id || ''

  const [platform, setPlatform] = useState<Platform>('meta_ads')
  const [step, setStep] = useState(1)
  const [state, setState] = useState<WizardState>(getDefaultState)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  // Account info (Meta)
  const [audiences, setAudiences] = useState<CustomAudience[]>([])
  const [pixels, setPixels] = useState<PixelInfo[]>([])
  const [pages, setPages] = useState<PageInfo[]>([])
  const [accountLoading, setAccountLoading] = useState(false)

  useEffect(() => {
    if (!orgId || platform !== 'meta_ads') return
    setAccountLoading(true)
    fetch(`/api/meta-ads/account-info?orgId=${orgId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setAudiences(data.audiences || [])
          setPixels(data.pixels || [])
          setPages(data.pages || [])
        }
      })
      .catch(() => {})
      .finally(() => setAccountLoading(false))
  }, [orgId, platform])

  const onChange = useCallback((updates: Partial<WizardState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const handlePlatformChange = (p: Platform) => {
    setPlatform(p)
    setStep(1)
    setState(getDefaultState())
  }

  const canProceed = () => {
    if (platform === 'google_ads') {
      switch (step) {
        case 1: return !!state.objective && !!state.campaignName
        case 2: return state.googleKeywords.split('\n').filter(k => k.trim()).length > 0
        case 3: return state.googleHeadlines.filter(h => h.trim()).length >= 3
          && state.googleDescriptions.filter(d => d.trim()).length >= 2
          && !!state.googleFinalUrl
        case 4: return true
        default: return false
      }
    }
    switch (step) {
      case 1: return !!state.objective && !!state.campaignName
      case 2: return true
      case 3: return state.copyVariants.some(v => v.primary_text || v.headline)
      case 4: return true
      default: return false
    }
  }

  const buildMetaPayload = () => {
    const budget = state.cboEnabled ? state.cboBudgetDaily : state.adSetBudgetDaily

    const placementPreset = state.placementMode === 'automatic'
      ? 'automatic'
      : state.manualPlacements.length > 0
        ? state.manualPlacements.join(',')
        : 'automatic'

    return {
      name: state.campaignName,
      platform: 'meta_ads' as const,
      campaign_type: state.objective as any,
      objective: state.objective,
      budget_daily: budget,
      start_date: state.startDate || null,
      end_date: state.endDate || null,
      target_audience: {
        age_min: state.ageMin,
        age_max: state.ageMax,
        gender: state.gender,
        locations: state.locations,
        interests: state.interests,
        custom_audiences: state.customAudiences,
        excluded_audiences: state.excludedAudiences,
        placement_mode: state.placementMode,
        manual_placements: state.manualPlacements,
        placement_preset: placementPreset,
        pixel_id: state.pixelId,
        conversion_location: state.conversionLocation,
        cbo_enabled: state.cboEnabled,
        ad_set_name: state.adSetName,
      },
      ad_creatives: state.copyVariants.map(v => ({
        headline: v.headline,
        description: v.description,
        image_prompt: '',
        image_url: state.mediaUrl,
        cta: v.cta,
      })),
      copy_variants: state.copyVariants,
      landing_page_url: state.destinationUrl || null,
    }
  }

  const buildGooglePayload = () => {
    const keywords = state.googleKeywords.split('\n').filter(k => k.trim())
    return {
      name: state.campaignName,
      platform: 'google_ads' as const,
      campaign_type: state.objective as any,
      objective: state.objective,
      budget_daily: state.adSetBudgetDaily,
      start_date: state.startDate || null,
      end_date: state.endDate || null,
      target_audience: {
        keywords,
        match_type: state.googleMatchType,
        locations: state.locations,
        language: state.googleLanguage,
        campaign_type: state.googleCampaignType,
      },
      ad_creatives: state.googleHeadlines.filter(h => h.trim()).map((h, i) => ({
        headline: h,
        description: state.googleDescriptions[i] || '',
        image_prompt: '',
        cta: 'Saiba Mais',
      })),
      copy_variants: [],
      landing_page_url: state.googleFinalUrl || null,
    }
  }

  const handleSaveDraft = async () => {
    if (!orgId) return
    setSaving(true)
    try {
      const payload = platform === 'google_ads' ? buildGooglePayload() : buildMetaPayload()
      await createAdCampaign(orgId, { ...payload, status: 'draft' })
      toast({ title: 'Rascunho salvo', description: 'Campanha salva como rascunho com sucesso.' })
      router.push('/ads')
    } catch (err: any) {
      console.error(err)
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!orgId) return
    setPublishing(true)
    try {
      if (platform === 'google_ads') {
        // Google Ads: save draft then publish via API
        const payload = buildGooglePayload()
        const keywords = state.googleKeywords.split('\n').filter(k => k.trim())

        const res = await fetch('/api/google-ads/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orgId,
            name: state.campaignName,
            campaignType: state.googleCampaignType,
            budgetDaily: state.adSetBudgetDaily,
            keywords,
            matchType: state.googleMatchType,
            headlines: state.googleHeadlines.filter(h => h.trim()),
            descriptions: state.googleDescriptions.filter(d => d.trim()),
            finalUrl: state.googleFinalUrl,
            path1: state.googlePath1 || undefined,
            path2: state.googlePath2 || undefined,
            startDate: state.startDate || undefined,
            endDate: state.endDate || undefined,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Erro ao publicar no Google Ads')
        }

        toast({ title: 'Campanha publicada', description: 'Campanha enviada ao Google Ads com sucesso (PAUSADA)!' })
        router.push('/ads')
      } else {
        // Meta Ads: existing flow
        const payload = buildMetaPayload()
        const campaign = await createAdCampaign(orgId, { ...payload, status: 'ready' })

        const res = await fetch('/api/meta-ads/campaigns/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: campaign.id,
            linkUrl: state.destinationUrl,
            pixelId: state.pixelId,
            placementPreset: state.placementMode === 'automatic' ? 'automatic' : state.manualPlacements.join(','),
            conversionLocation: state.conversionLocation,
            customAudiences: state.customAudiences,
            nameCampaign: state.campaignName,
            nameAdSet: state.adSetName || state.campaignName,
            nameAd: `${state.campaignName} - Ad`,
            imageUrl: state.mediaUrl,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Erro ao publicar no Meta')
        }

        toast({ title: 'Campanha publicada', description: 'Campanha enviada ao Meta Ads com sucesso!' })
        router.push('/ads')
      }
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao publicar',
        description: err.message?.includes('1885183')
          ? 'App Meta em modo dev. Campanha salva como rascunho — publique manualmente no Meta Ads Manager.'
          : err.message,
        variant: 'destructive',
      })
    } finally {
      setPublishing(false)
    }
  }

  const platformLabel = platform === 'google_ads' ? 'Google Ads' : 'Meta Ads'
  const publishLabel = platform === 'google_ads' ? 'Publicar no Google' : 'Publicar no Meta'

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push('/ads')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Criar Campanha</h1>
          <p className="text-sm text-muted-foreground">{platformLabel}</p>
        </div>
      </div>

      {/* Platform Toggle */}
      <PlatformToggle platform={platform} onChange={handlePlatformChange} />

      {/* Step Indicator */}
      <StepIndicator currentStep={step} platform={platform} />

      {/* Step Content */}
      {platform === 'meta_ads' ? (
        <>
          {step === 1 && <StepCampaign state={state} onChange={onChange} platform={platform} />}
          {step === 2 && <StepAdSet state={state} onChange={onChange} audiences={audiences} pixels={pixels} />}
          {step === 3 && <StepCreative state={state} onChange={onChange} />}
          {step === 4 && <StepReview state={state} />}
        </>
      ) : (
        <>
          {step === 1 && <StepCampaign state={state} onChange={onChange} platform={platform} />}
          {step === 2 && <StepGoogleTargeting state={state} onChange={onChange} />}
          {step === 3 && <StepGoogleAdCopy state={state} onChange={onChange} />}
          {step === 4 && <StepGoogleReview state={state} />}
        </>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => setStep(s => s - 1)}
          disabled={step === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="flex items-center gap-3">
          {step === 4 ? (
            <>
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={saving || publishing}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar como Rascunho
              </Button>
              <Button
                onClick={handlePublish}
                disabled={saving || publishing}
              >
                {publishing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {publishLabel}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
            >
              Proximo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
