'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Save,
  Loader2,
  ArrowLeft,
  Monitor,
  Smartphone,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { useAuth } from '@/hooks/use-auth'
import { createTemplate, updateTemplate } from '@/lib/supabase/templates'
import { createClient } from '@/lib/supabase/client'
import { TEMPLATE_CATEGORY_LABELS } from '@/lib/constants'
import {
  buildEmailHtml,
  getDefaultContent,
  type EmailContent,
  type OrgBranding,
  type TemplateType,
} from '@/lib/email/template-builder'
import type { EmailTemplate } from '@/lib/types'

// ============= Types =============

const TEMPLATE_TYPE_OPTIONS: { value: TemplateType; label: string }[] = [
  { value: 'padrao', label: 'Padrao' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'promocional', label: 'Promocional' },
  { value: 'boas_vindas', label: 'Boas-vindas' },
]

interface TemplateFormProps {
  template?: EmailTemplate
}

// ============= Component =============

export function TemplateForm({ template }: TemplateFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { currentOrg } = useOrganizationContext()
  const { user } = useAuth()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const isEditMode = !!template

  // ---------- Org branding ----------
  const [orgBranding, setOrgBranding] = useState<OrgBranding>({
    name: '',
    logo_url: null,
    website: null,
    sender_email: null,
    sender_name: null,
    email_settings: { primary_color: '#1a2332', accent_color: '#e74c3c' },
  })

  useEffect(() => {
    if (!currentOrg) return
    const supabase = createClient()

    // Fetch org data + brand identity in parallel
    Promise.all([
      supabase.from('organizations').select('name, logo_url, website, sender_email, sender_name, settings, email_settings').eq('id', currentOrg.id).single(),
      supabase.from('org_marketing_profiles').select('brand_identity').eq('org_id', currentOrg.id).single(),
    ]).then(([orgRes, brandRes]) => {
      const data = orgRes.data
      const brand = (brandRes.data?.brand_identity as any) || {}
      const emailSettings = (data?.email_settings as any) || (data?.settings as any)?.email_settings || {}

      if (data) {
        setOrgBranding({
          name: data.name || '',
          logo_url: data.logo_url || brand.logo_url || null,
          website: data.website || null,
          sender_email: data.sender_email || null,
          sender_name: data.sender_name || null,
          email_settings: {
            primary_color: emailSettings.primary_color || brand.primary_color || '#1a2332',
            secondary_color: emailSettings.secondary_color || brand.secondary_color || '#333333',
            accent_color: emailSettings.accent_color || brand.accent_color || '#e74c3c',
            header_bg: emailSettings.header_bg || brand.primary_color || undefined,
            phone: emailSettings.phone,
            address: emailSettings.address,
            footer_text: emailSettings.footer_text,
            social_links: emailSettings.social_links,
          },
        })
      }
    })
  }, [currentOrg])

  // ---------- Form state ----------
  const [name, setName] = useState(template?.name || '')
  const [category, setCategory] = useState(template?.category || '')
  const [templateType, setTemplateType] = useState<TemplateType>('padrao')
  const [subject, setSubject] = useState(template?.subject || '')
  const [previewText, setPreviewText] = useState(template?.preview_text || '')

  // Content state
  const savedContent = template?.unlayer_json as EmailContent | null
  const [greeting, setGreeting] = useState(savedContent?.greeting || 'Ola, {{first_name}}!')
  const [bodyText, setBodyText] = useState(savedContent?.body_text || 'Escreva seu conteudo aqui.')
  const [bannerImageUrl, setBannerImageUrl] = useState(savedContent?.banner_image_url || '')

  // Highlight box
  const [highlightEnabled, setHighlightEnabled] = useState(!!savedContent?.highlight_box)
  const [highlightLabel, setHighlightLabel] = useState(savedContent?.highlight_box?.label || '')
  const [highlightTitle, setHighlightTitle] = useState(savedContent?.highlight_box?.title || '')
  const [highlightDetails, setHighlightDetails] = useState<{ label: string; value: string }[]>(
    savedContent?.highlight_box?.details || [{ label: '', value: '' }]
  )

  // Steps
  const [stepsEnabled, setStepsEnabled] = useState(!!savedContent?.steps)
  const [stepsTitle, setStepsTitle] = useState(savedContent?.steps?.title || '')
  const [stepsItems, setStepsItems] = useState<
    { label: string; description: string; done: boolean }[]
  >(
    savedContent?.steps?.items?.map((item) => ({
      label: item.label || '',
      description: item.description || '',
      done: item.done || false,
    })) || [{ label: '', description: '', done: false }]
  )

  // CTA
  const [ctaEnabled, setCtaEnabled] = useState(!!savedContent?.cta)
  const [ctaText, setCtaText] = useState(savedContent?.cta?.text || '')
  const [ctaUrl, setCtaUrl] = useState(savedContent?.cta?.url || '')

  // Footer note
  const [footerNote, setFooterNote] = useState(savedContent?.footer_note || '')

  // UI state
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [saving, setSaving] = useState(false)
  const [highlightOpen, setHighlightOpen] = useState(!!savedContent?.highlight_box)
  const [stepsOpen, setStepsOpen] = useState(!!savedContent?.steps)
  const [ctaOpen, setCtaOpen] = useState(!!savedContent?.cta)

  // ---------- Template type change fills defaults ----------
  const handleTemplateTypeChange = (type: TemplateType) => {
    setTemplateType(type)
    const defaults = getDefaultContent(type)
    if (defaults.greeting) setGreeting(defaults.greeting)
    if (defaults.body_text) setBodyText(defaults.body_text)
    if (defaults.banner_image_url !== undefined) setBannerImageUrl(defaults.banner_image_url || '')
    if (defaults.footer_note !== undefined) setFooterNote(defaults.footer_note || '')

    // Highlight
    if (defaults.highlight_box) {
      setHighlightEnabled(true)
      setHighlightOpen(true)
      setHighlightLabel(defaults.highlight_box.label || '')
      setHighlightTitle(defaults.highlight_box.title || '')
      setHighlightDetails(defaults.highlight_box.details || [{ label: '', value: '' }])
    } else {
      setHighlightEnabled(false)
    }

    // Steps
    if (defaults.steps) {
      setStepsEnabled(true)
      setStepsOpen(true)
      setStepsTitle(defaults.steps.title || '')
      setStepsItems(
        defaults.steps.items?.map((item) => ({
          label: item.label || '',
          description: item.description || '',
          done: item.done || false,
        })) || [{ label: '', description: '', done: false }]
      )
    } else {
      setStepsEnabled(false)
    }

    // CTA
    if (defaults.cta) {
      setCtaEnabled(true)
      setCtaOpen(true)
      setCtaText(defaults.cta.text || '')
      setCtaUrl(defaults.cta.url || '')
    } else {
      setCtaEnabled(false)
    }
  }

  // ---------- Build content object ----------
  const emailContent = useMemo<EmailContent>(() => {
    const content: EmailContent = {
      subject,
      greeting,
      body_text: bodyText,
    }
    if (bannerImageUrl) content.banner_image_url = bannerImageUrl
    if (highlightEnabled && highlightTitle) {
      content.highlight_box = {
        label: highlightLabel || undefined,
        title: highlightTitle,
        details: highlightDetails.filter((d) => d.label || d.value),
      }
    }
    if (stepsEnabled && stepsItems.some((s) => s.label)) {
      content.steps = {
        title: stepsTitle || undefined,
        items: stepsItems.filter((s) => s.label).map((s) => ({
          label: s.label,
          description: s.description || undefined,
          done: s.done,
        })),
      }
    }
    if (ctaEnabled && ctaText) {
      content.cta = { text: ctaText, url: ctaUrl || '#' }
    }
    if (footerNote) content.footer_note = footerNote
    return content
  }, [
    subject, greeting, bodyText, bannerImageUrl,
    highlightEnabled, highlightLabel, highlightTitle, highlightDetails,
    stepsEnabled, stepsTitle, stepsItems,
    ctaEnabled, ctaText, ctaUrl,
    footerNote,
  ])

  // ---------- Build HTML for preview ----------
  const previewHtml = useMemo(() => {
    return buildEmailHtml(orgBranding, emailContent)
  }, [orgBranding, emailContent])

  // Preview HTML is passed via srcDoc (no need for useEffect)

  // ---------- Save ----------
  const handleSave = async () => {
    if (!currentOrg || !user) {
      toast({
        title: 'Erro',
        description: !currentOrg ? 'Nenhuma organizacao selecionada.' : 'Usuario nao autenticado.',
        variant: 'destructive',
      })
      return
    }
    if (!name.trim()) {
      toast({ title: 'Erro', description: 'Nome e obrigatorio.', variant: 'destructive' })
      return
    }
    if (!category) {
      toast({ title: 'Erro', description: 'Categoria e obrigatoria.', variant: 'destructive' })
      return
    }
    if (!subject.trim()) {
      toast({ title: 'Erro', description: 'Assunto e obrigatorio.', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const htmlContent = buildEmailHtml(orgBranding, emailContent)

      if (isEditMode) {
        await updateTemplate(template.id, {
          name: name.trim(),
          category,
          subject: subject.trim(),
          preview_text: previewText.trim() || null,
          html_content: htmlContent,
          unlayer_json: emailContent,
        })
        toast({ title: 'Template atualizado', description: 'O template foi atualizado com sucesso.' })
      } else {
        await createTemplate(currentOrg.id, user.id, {
          name: name.trim(),
          category,
          subject: subject.trim(),
          preview_text: previewText.trim() || undefined,
          html_content: htmlContent,
          unlayer_json: emailContent,
        })
        toast({ title: 'Template criado', description: 'O template foi criado com sucesso.' })
      }
      router.push('/templates')
    } catch (error: any) {
      console.error('Erro ao salvar template:', error)
      const message = error?.message || ''
      let description = 'Nao foi possivel salvar o template.'
      if (
        message.includes('unique') ||
        message.includes('duplicate') ||
        message.includes('email_templates_org_id_name_key')
      ) {
        description = 'Ja existe um template com esse nome. Escolha outro nome.'
      }
      toast({ title: 'Erro', description, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // ---------- Helpers for dynamic lists ----------
  const addHighlightDetail = () => {
    if (highlightDetails.length < 3) {
      setHighlightDetails([...highlightDetails, { label: '', value: '' }])
    }
  }
  const removeHighlightDetail = (index: number) => {
    setHighlightDetails(highlightDetails.filter((_, i) => i !== index))
  }
  const updateHighlightDetail = (index: number, field: 'label' | 'value', val: string) => {
    const updated = [...highlightDetails]
    updated[index] = { ...updated[index], [field]: val }
    setHighlightDetails(updated)
  }

  const addStep = () => {
    setStepsItems([...stepsItems, { label: '', description: '', done: false }])
  }
  const removeStep = (index: number) => {
    setStepsItems(stepsItems.filter((_, i) => i !== index))
  }
  const updateStep = (index: number, field: string, val: any) => {
    const updated = [...stepsItems]
    updated[index] = { ...updated[index], [field]: val }
    setStepsItems(updated)
  }

  // ============= Render =============
  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-120px)]">
      {/* ===== LEFT COLUMN — Editor (2/3) ===== */}
      <div className="flex-1 lg:w-2/3 space-y-6">
        {/* Back + Save header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            {saving ? 'Salvando...' : isEditMode ? 'Salvar' : 'Criar Template'}
          </Button>
        </div>

        {/* ----- Email Info ----- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Informacoes do Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nome <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Ex: Email de boas-vindas"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Categoria <span className="text-destructive">*</span>
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEMPLATE_CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Template</Label>
                <Select value={templateType} onValueChange={(v) => handleTemplateTypeChange(v as TemplateType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Ao trocar, preenche conteudo padrao automaticamente.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">
                  Assunto <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="subject"
                  placeholder="Ex: Bem-vindo a nossa plataforma!"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Use {'{{first_name}}'} para personalizar
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preview_text">Texto de Preview</Label>
              <Input
                id="preview_text"
                placeholder="Texto que aparece na preview do email no inbox"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* ----- Content Editor ----- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Conteudo do Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Greeting */}
            <div className="space-y-2">
              <Label htmlFor="greeting">Saudacao</Label>
              <Input
                id="greeting"
                placeholder='Ex: Ola, {{first_name}}!'
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
              />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <Label htmlFor="body_text">Corpo do email</Label>
              <Textarea
                id="body_text"
                placeholder="Escreva o texto do email. Quebre linha dupla para novo paragrafo."
                className="min-h-[180px] resize-y"
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Linha dupla = novo paragrafo. Linha simples = quebra de linha.
              </p>
            </div>

            {/* Banner Image */}
            <div className="space-y-2">
              <Label htmlFor="banner_image">Imagem banner (opcional)</Label>
              <Input
                id="banner_image"
                placeholder="https://exemplo.com/imagem.jpg"
                value={bannerImageUrl}
                onChange={(e) => setBannerImageUrl(e.target.value)}
              />
            </div>

            <Separator />

            {/* ===== Highlight Box ===== */}
            <div className="space-y-3">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => {
                  if (highlightEnabled) setHighlightOpen(!highlightOpen)
                }}
              >
                <div className="flex items-center gap-3">
                  {highlightEnabled && (
                    highlightOpen
                      ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Label className="cursor-pointer font-medium">Bloco de Destaque</Label>
                </div>
                <Switch
                  checked={highlightEnabled}
                  onCheckedChange={(checked) => {
                    setHighlightEnabled(checked)
                    if (checked) setHighlightOpen(true)
                  }}
                />
              </div>

              {highlightEnabled && highlightOpen && (
                <div className="pl-7 space-y-3 border-l-2 border-muted ml-2">
                  <div className="space-y-2">
                    <Label>Label (ex: LIVE)</Label>
                    <Input
                      placeholder="LIVE"
                      value={highlightLabel}
                      onChange={(e) => setHighlightLabel(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Titulo</Label>
                    <Input
                      placeholder="Titulo do destaque"
                      value={highlightTitle}
                      onChange={(e) => setHighlightTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Detalhes (max 3)</Label>
                    {highlightDetails.map((detail, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <Input
                          placeholder="Label (ex: QUANDO)"
                          className="flex-1"
                          value={detail.label}
                          onChange={(e) => updateHighlightDetail(i, 'label', e.target.value)}
                        />
                        <Input
                          placeholder="Valor (ex: 7 de abril)"
                          className="flex-1"
                          value={detail.value}
                          onChange={(e) => updateHighlightDetail(i, 'value', e.target.value)}
                        />
                        {highlightDetails.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => removeHighlightDetail(i)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {highlightDetails.length < 3 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addHighlightDetail}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Adicionar detalhe
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* ===== Steps / Checklist ===== */}
            <div className="space-y-3">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => {
                  if (stepsEnabled) setStepsOpen(!stepsOpen)
                }}
              >
                <div className="flex items-center gap-3">
                  {stepsEnabled && (
                    stepsOpen
                      ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Label className="cursor-pointer font-medium">Passos / Checklist</Label>
                </div>
                <Switch
                  checked={stepsEnabled}
                  onCheckedChange={(checked) => {
                    setStepsEnabled(checked)
                    if (checked) setStepsOpen(true)
                  }}
                />
              </div>

              {stepsEnabled && stepsOpen && (
                <div className="pl-7 space-y-3 border-l-2 border-muted ml-2">
                  <div className="space-y-2">
                    <Label>Titulo da secao</Label>
                    <Input
                      placeholder="Complete os proximos passos:"
                      value={stepsTitle}
                      onChange={(e) => setStepsTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>Passos</Label>
                    {stepsItems.map((step, i) => (
                      <div key={i} className="flex gap-2 items-start p-3 bg-muted/50 rounded-md">
                        <div className="flex flex-col items-center gap-1 pt-1">
                          <input
                            type="checkbox"
                            checked={step.done}
                            onChange={(e) => updateStep(i, 'done', e.target.checked)}
                            className="h-4 w-4 rounded"
                            title="Marcar como concluido"
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Titulo do passo"
                            value={step.label}
                            onChange={(e) => updateStep(i, 'label', e.target.value)}
                          />
                          <Input
                            placeholder="Descricao (opcional)"
                            value={step.description}
                            onChange={(e) => updateStep(i, 'description', e.target.value)}
                          />
                        </div>
                        {stepsItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => removeStep(i)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addStep}>
                      <Plus className="mr-1 h-3 w-3" />
                      Adicionar passo
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* ===== CTA Button ===== */}
            <div className="space-y-3">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => {
                  if (ctaEnabled) setCtaOpen(!ctaOpen)
                }}
              >
                <div className="flex items-center gap-3">
                  {ctaEnabled && (
                    ctaOpen
                      ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Label className="cursor-pointer font-medium">Botao CTA</Label>
                </div>
                <Switch
                  checked={ctaEnabled}
                  onCheckedChange={(checked) => {
                    setCtaEnabled(checked)
                    if (checked) setCtaOpen(true)
                  }}
                />
              </div>

              {ctaEnabled && ctaOpen && (
                <div className="pl-7 space-y-3 border-l-2 border-muted ml-2">
                  <div className="space-y-2">
                    <Label>Texto do botao</Label>
                    <Input
                      placeholder="Ex: Entrar no grupo do WhatsApp"
                      value={ctaText}
                      onChange={(e) => setCtaText(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL do botao</Label>
                    <Input
                      placeholder="https://..."
                      value={ctaUrl}
                      onChange={(e) => setCtaUrl(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Footer note */}
            <div className="space-y-2">
              <Label htmlFor="footer_note">Nota de rodape (opcional)</Label>
              <Input
                id="footer_note"
                placeholder="Ex: Evento 100% gratuito e online."
                value={footerNote}
                onChange={(e) => setFooterNote(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== RIGHT COLUMN — Live Preview (1/3) ===== */}
      <div className="lg:w-1/3 lg:sticky lg:top-4 lg:self-start space-y-3">
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Preview</CardTitle>
              <div className="flex items-center gap-2">
                {/* Device toggle */}
                <div className="flex gap-1 border rounded-md p-0.5">
                  <Button
                    type="button"
                    variant={previewDevice === 'desktop' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setPreviewDevice('desktop')}
                  >
                    <Monitor className="mr-1 h-3 w-3" />
                    Desktop
                  </Button>
                  <Button
                    type="button"
                    variant={previewDevice === 'mobile' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setPreviewDevice('mobile')}
                  >
                    <Smartphone className="mr-1 h-3 w-3" />
                    Mobile
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div
              className={`bg-gray-100 transition-all mx-auto ${
                previewDevice === 'mobile' ? 'max-w-[375px]' : ''
              }`}
            >
              <iframe
                title="Preview do email"
                className="w-full border-0"
                style={{ minHeight: '700px' }}
                srcDoc={previewHtml}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save button (also at bottom of preview for convenience) */}
        <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saving ? 'Salvando...' : isEditMode ? 'Salvar Template' : 'Criar Template'}
        </Button>
      </div>
    </div>
  )
}
