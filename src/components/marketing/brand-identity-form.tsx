'use client'

import { useState, useEffect, useRef } from 'react'
import { Save, Palette, Sparkles, Loader2, Crown, Upload, FileText, Image, X, Check, Type, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { saveBrandIdentity } from '@/lib/marketing/profiles'
import type { MarketingProfile, BrandIdentity } from '@/lib/marketing/types'

interface BrandIdentityFormProps {
  profile: MarketingProfile | null
  onRefresh: () => void
}

const ARCHETYPES = [
  { value: 'heroi', label: 'Heroi', desc: 'Coragem, determinacao, superacao' },
  { value: 'sabio', label: 'Sabio', desc: 'Conhecimento, verdade, inteligencia' },
  { value: 'explorador', label: 'Explorador', desc: 'Liberdade, aventura, descoberta' },
  { value: 'criador', label: 'Criador', desc: 'Inovacao, criatividade, visao' },
  { value: 'governante', label: 'Governante', desc: 'Controle, lideranca, estabilidade' },
  { value: 'mago', label: 'Mago', desc: 'Transformacao, visao, poder' },
  { value: 'amante', label: 'Amante', desc: 'Paixao, intimidade, sensualidade' },
  { value: 'bobo', label: 'Bobo da Corte', desc: 'Diversao, alegria, espontaneidade' },
  { value: 'cuidador', label: 'Cuidador', desc: 'Protecao, generosidade, compaixao' },
  { value: 'inocente', label: 'Inocente', desc: 'Otimismo, simplicidade, pureza' },
  { value: 'rebelde', label: 'Rebelde', desc: 'Revolucao, ruptura, liberdade' },
  { value: 'cara_comum', label: 'Cara Comum', desc: 'Pertencimento, autenticidade, igualdade' },
]

const defaultBrand: BrandIdentity = {
  primary_color: '#3b82f6',
  secondary_color: '#1e40af',
  accent_color: '#f59e0b',
  additional_colors: [],
  tone_of_voice: '',
  brand_values: [],
  visual_style: '',
  target_audience_summary: '',
  brand_archetype: '',
  brand_archetype_description: '',
  brand_personality: [],
  brand_promise: '',
  tagline_suggestions: [],
  fonts: [],
  logo_url: '',
  logo_description: '',
  style_guide_url: '',
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function BrandIdentityForm({ profile, onRefresh }: BrandIdentityFormProps) {
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()
  const [brand, setBrand] = useState<BrandIdentity>(defaultBrand)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [valuesText, setValuesText] = useState('')
  const [personalityText, setPersonalityText] = useState('')
  const [taglinesText, setTaglinesText] = useState('')
  const [fontsText, setFontsText] = useState('')

  // Style guide upload state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(false)

  useEffect(() => {
    if (profile?.brand_identity && Object.keys(profile.brand_identity).length > 0) {
      setBrand({ ...defaultBrand, ...profile.brand_identity })
      setValuesText(profile.brand_identity.brand_values?.join(', ') || '')
      setPersonalityText(profile.brand_identity.brand_personality?.join(', ') || '')
      setTaglinesText(profile.brand_identity.tagline_suggestions?.join('\n') || '')
      setFontsText(profile.brand_identity.fonts?.join(', ') || '')
    }
  }, [profile?.brand_identity])

  const handleSave = async () => {
    if (!currentOrg?.id) return
    setSaving(true)
    try {
      await saveBrandIdentity(currentOrg.id, {
        ...brand,
        brand_values: valuesText.split(',').map((v) => v.trim()).filter(Boolean),
        brand_personality: personalityText.split(',').map((v) => v.trim()).filter(Boolean),
        tagline_suggestions: taglinesText.split('\n').map((v) => v.trim()).filter(Boolean),
        fonts: fontsText.split(',').map((v) => v.trim()).filter(Boolean),
      })
      toast({ title: 'Identidade salva' })
      onRefresh()
    } catch (error) {
      console.error('Erro:', error)
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleGenerateBrand = async () => {
    if (!currentOrg?.id || !profile?.briefing) return
    setGenerating(true)
    try {
      const res = await fetch('/api/marketing/generate-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: currentOrg.id,
          briefing: profile.briefing,
          persona: profile.persona,
          icp: profile.icp,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao gerar identidade')
      }
      const data = await res.json()
      setBrand((prev) => ({ ...prev, ...data.brand }))
      setValuesText(data.brand.brand_values?.join(', ') || '')
      setPersonalityText(data.brand.brand_personality?.join(', ') || '')
      setTaglinesText(data.brand.tagline_suggestions?.join('\n') || '')
      setFontsText(data.brand.fonts?.join(', ') || fontsText)

      // Auto-save
      await saveBrandIdentity(currentOrg.id, data.brand)
      toast({ title: 'Identidade da marca gerada com IA!' })
      onRefresh()
    } catch (error) {
      console.error('Erro:', error)
      toast({ title: 'Erro', description: error instanceof Error ? error.message : 'Erro', variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      toast({ title: 'Tipo nao suportado', description: 'Envie PDF ou imagem (PNG, JPG, WebP).', variant: 'destructive' })
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Maximo 10MB.', variant: 'destructive' })
      return
    }

    setSelectedFile(file)
    setAnalysisComplete(false)

    if (file.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(file))
    } else {
      setFilePreview(null)
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
    setAnalysisComplete(false)
  }

  const handleAnalyzeStyleGuide = async () => {
    if (!currentOrg?.id || !selectedFile) return
    setAnalyzing(true)
    setAnalysisComplete(false)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('orgId', currentOrg.id)

      const res = await fetch('/api/marketing/analyze-brand', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro na analise')
      }

      const data = await res.json()
      const extractedBrand = data.brand as BrandIdentity

      // Merge extracted data into current brand state
      setBrand((prev) => ({
        ...prev,
        ...extractedBrand,
        // Keep existing values if extracted ones are empty
        primary_color: extractedBrand.primary_color || prev.primary_color,
        secondary_color: extractedBrand.secondary_color || prev.secondary_color,
        accent_color: extractedBrand.accent_color || prev.accent_color,
      }))

      // Update text fields
      if (extractedBrand.brand_values?.length) {
        setValuesText(extractedBrand.brand_values.join(', '))
      }
      if (extractedBrand.brand_personality?.length) {
        setPersonalityText(extractedBrand.brand_personality.join(', '))
      }
      if (extractedBrand.fonts?.length) {
        setFontsText(extractedBrand.fonts.join(', '))
      }

      // Auto-save
      await saveBrandIdentity(currentOrg.id, {
        ...brand,
        ...extractedBrand,
        brand_values: extractedBrand.brand_values || brand.brand_values,
        brand_personality: extractedBrand.brand_personality || brand.brand_personality,
        fonts: extractedBrand.fonts || brand.fonts,
        tagline_suggestions: extractedBrand.tagline_suggestions || brand.tagline_suggestions,
      })

      setAnalysisComplete(true)
      toast({ title: 'Style Guide analisado!', description: 'Dados de identidade visual extraidos e preenchidos automaticamente.' })
      onRefresh()
    } catch (error) {
      console.error('Erro:', error)
      toast({
        title: 'Erro na analise',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setAnalyzing(false)
    }
  }

  const selectedArchetype = ARCHETYPES.find((a) => a.value === brand.brand_archetype)

  return (
    <div className="space-y-4">
      {/* Style Guide Upload */}
      <Card className="border-violet-200 bg-violet-50/50 dark:border-violet-800 dark:bg-violet-950/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4 text-violet-600" />
            Upload de Style Guide / Brand Guidelines
          </CardTitle>
          <CardDescription>
            Envie o manual de identidade visual da marca (PDF ou imagem) e a IA vai extrair automaticamente
            cores, tipografia, tom de voz e estilo visual.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing style guide link */}
          {brand.style_guide_url && !selectedFile && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
              <Check className="h-4 w-4 text-green-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">Style Guide enviado</p>
                <a
                  href={brand.style_guide_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-600 hover:underline truncate block"
                >
                  {brand.style_guide_url}
                </a>
              </div>
            </div>
          )}

          {/* Drop zone */}
          {!selectedFile && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-violet-300 dark:border-violet-700 rounded-lg p-8 text-center cursor-pointer hover:border-violet-500 hover:bg-violet-100/50 dark:hover:bg-violet-900/20 transition-colors"
            >
              <Upload className="h-8 w-8 mx-auto text-violet-400 mb-2" />
              <p className="text-sm font-medium">Clique para enviar o Style Guide</p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF ou imagem (PNG, JPG, WebP). Max 10MB.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.gif"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Selected file */}
          {selectedFile && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-md bg-background">
                <div className="flex items-center gap-3 min-w-0">
                  {selectedFile.type.startsWith('image/') ? (
                    <Image className="h-5 w-5 text-violet-500 shrink-0" />
                  ) : (
                    <FileText className="h-5 w-5 text-violet-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  {analysisComplete && (
                    <Badge variant="default" className="bg-green-600 shrink-0">
                      <Check className="h-3 w-3 mr-1" />
                      Analisado
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleRemoveFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Image preview */}
              {filePreview && (
                <div className="rounded-md border overflow-hidden bg-muted/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={filePreview}
                    alt="Preview do Style Guide"
                    className="max-h-48 w-full object-contain"
                  />
                </div>
              )}

              {/* Analyze button */}
              <Button
                onClick={handleAnalyzeStyleGuide}
                disabled={analyzing}
                className="w-full bg-violet-600 hover:bg-violet-700"
                size="lg"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analisando Style Guide com IA...
                  </>
                ) : analysisComplete ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analisar Novamente
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analisar e Extrair Dados
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Generation from Briefing */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Gerar Identidade com IA
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Gera arquetipo, cores, tom de voz, personalidade e taglines baseado no briefing.
              </p>
            </div>
            <Button onClick={handleGenerateBrand} disabled={generating || !profile?.briefing}>
              {generating ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Gerando...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-1" />Gerar com IA</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Archetype */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Arquetipo da Marca
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Arquetipo</Label>
              <Select
                value={brand.brand_archetype || ''}
                onValueChange={(v) => {
                  const arch = ARCHETYPES.find((a) => a.value === v)
                  setBrand((prev) => ({
                    ...prev,
                    brand_archetype: v,
                    brand_archetype_description: arch?.desc || prev.brand_archetype_description || '',
                  }))
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione o arquetipo" /></SelectTrigger>
                <SelectContent>
                  {ARCHETYPES.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label} — {a.desc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descricao do Arquetipo</Label>
              <Textarea
                value={brand.brand_archetype_description || ''}
                onChange={(e) => setBrand((prev) => ({ ...prev, brand_archetype_description: e.target.value }))}
                placeholder="Por que esse arquetipo representa sua marca..."
                rows={3}
              />
            </div>
          </div>
          {selectedArchetype && (
            <div className="p-3 bg-muted rounded-md">
              <Badge className="mb-1">{selectedArchetype.label}</Badge>
              <p className="text-sm text-muted-foreground">{selectedArchetype.desc}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Colors & Visual Identity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Identidade Visual
            </CardTitle>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
          <CardDescription>
            Cores, tom de voz e valores. Usado como contexto para gerar LPs, emails e conteudos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Color pickers */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Paleta de Cores</Label>
            <div className="grid grid-cols-3 gap-4">
              {([
                { key: 'primary_color', label: 'Primaria', def: '#3b82f6' },
                { key: 'secondary_color', label: 'Secundaria', def: '#1e40af' },
                { key: 'accent_color', label: 'Destaque', def: '#f59e0b' },
              ] as const).map(({ key, label, def }) => (
                <div key={key} className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={brand[key] || def}
                      onChange={(e) => setBrand((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={brand[key] || ''}
                      onChange={(e) => setBrand((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
            {/* Main Color Preview */}
            <div className="flex gap-2 mt-3">
              <div className="h-12 flex-1 rounded-md" style={{ backgroundColor: brand.primary_color || '#3b82f6' }} />
              <div className="h-12 flex-1 rounded-md" style={{ backgroundColor: brand.secondary_color || '#1e40af' }} />
              <div className="h-12 flex-1 rounded-md" style={{ backgroundColor: brand.accent_color || '#f59e0b' }} />
            </div>
          </div>

          {/* Additional Colors (extracted from style guide) */}
          {brand.additional_colors && brand.additional_colors.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-3 block">Cores Adicionais da Paleta</Label>
              <div className="flex flex-wrap gap-3">
                {brand.additional_colors.map((color, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className="w-12 h-12 rounded-md border shadow-sm cursor-pointer"
                      style={{ backgroundColor: color }}
                      title={color}
                      onClick={() => {
                        navigator.clipboard.writeText(color)
                        toast({ title: `Cor ${color} copiada!` })
                      }}
                    />
                    <span className="text-xs font-mono text-muted-foreground">{color}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Clique em uma cor para copiar o codigo hexadecimal.
              </p>
            </div>
          )}

          {/* Fonts */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Tipografia / Fontes (separadas por virgula)
            </Label>
            <Input
              value={fontsText}
              onChange={(e) => setFontsText(e.target.value)}
              placeholder="Ex: Montserrat, Open Sans, Roboto"
            />
            {fontsText && (
              <div className="flex flex-wrap gap-2 mt-1">
                {fontsText.split(',').map((f) => f.trim()).filter(Boolean).map((font, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {font}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Logo da Marca</Label>
            {brand.logo_url ? (
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 rounded-lg border bg-white flex items-center justify-center overflow-hidden">
                  <img src={brand.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground truncate max-w-[250px]">{brand.logo_url.split('/').pop()}</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.accept = 'image/*'
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0]
                          if (!file || !currentOrg) return
                          try {
                            const { createClient } = await import('@/lib/supabase/client')
                            const supabase = createClient()
                            const ext = file.name.split('.').pop() || 'png'
                            const path = `logos/${currentOrg.id}/${Date.now()}.${ext}`
                            const { error } = await supabase.storage.from('ad-creatives').upload(path, file, { contentType: file.type, upsert: true })
                            if (error) throw error
                            const { data: urlData } = supabase.storage.from('ad-creatives').getPublicUrl(path)
                            setBrand((prev) => ({ ...prev, logo_url: urlData.publicUrl }))
                            // Also update org logo_url
                            await supabase.from('organizations').update({ logo_url: urlData.publicUrl }).eq('id', currentOrg.id)
                            toast({ title: 'Logo atualizado' })
                          } catch (err: any) {
                            toast({ title: 'Erro ao enviar logo', description: err.message, variant: 'destructive' })
                          }
                        }
                        input.click()
                      }}
                    >
                      <Upload className="mr-2 h-3 w-3" />
                      Trocar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setBrand((prev) => ({ ...prev, logo_url: '' }))}
                    >
                      <Trash2 className="mr-2 h-3 w-3" />
                      Remover
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'image/*'
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0]
                    if (!file || !currentOrg) return
                    try {
                      const { createClient } = await import('@/lib/supabase/client')
                      const supabase = createClient()
                      const ext = file.name.split('.').pop() || 'png'
                      const path = `logos/${currentOrg.id}/${Date.now()}.${ext}`
                      const { error } = await supabase.storage.from('ad-creatives').upload(path, file, { contentType: file.type, upsert: true })
                      if (error) throw error
                      const { data: urlData } = supabase.storage.from('ad-creatives').getPublicUrl(path)
                      setBrand((prev) => ({ ...prev, logo_url: urlData.publicUrl }))
                      await supabase.from('organizations').update({ logo_url: urlData.publicUrl }).eq('id', currentOrg.id)
                      toast({ title: 'Logo enviado com sucesso' })
                    } catch (err: any) {
                      toast({ title: 'Erro ao enviar logo', description: err.message, variant: 'destructive' })
                    }
                  }
                  input.click()
                }}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Clique para enviar o logo</p>
                <p className="text-xs text-muted-foreground">PNG, SVG, JPG (recomendado: fundo transparente)</p>
              </div>
            )}
          </div>

          {/* Logo Description */}
          <div className="space-y-2">
            <Label>Descricao do Logo</Label>
            <Textarea
              value={brand.logo_description || ''}
              onChange={(e) => setBrand((prev) => ({ ...prev, logo_description: e.target.value }))}
              placeholder="Descreva o logo da marca: formato, cores, elementos graficos, tipografia usada..."
              rows={3}
            />
          </div>

          {/* Tone, style, promise */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tom de Voz</Label>
              <Textarea
                value={brand.tone_of_voice || ''}
                onChange={(e) => setBrand((prev) => ({ ...prev, tone_of_voice: e.target.value }))}
                placeholder="Ex: Profissional mas acessivel, tecnico sem ser intimidante..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Estilo Visual</Label>
              <Textarea
                value={brand.visual_style || ''}
                onChange={(e) => setBrand((prev) => ({ ...prev, visual_style: e.target.value }))}
                placeholder="Ex: Moderno, clean, corporativo com toques de cor..."
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Promessa da Marca</Label>
            <Input
              value={brand.brand_promise || ''}
              onChange={(e) => setBrand((prev) => ({ ...prev, brand_promise: e.target.value }))}
              placeholder="Ex: Transformamos dados em decisoes que geram resultado"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valores (separados por virgula)</Label>
              <Input
                value={valuesText}
                onChange={(e) => setValuesText(e.target.value)}
                placeholder="Ex: Inovacao, Confianca, Resultado"
              />
            </div>
            <div className="space-y-2">
              <Label>Personalidade (separados por virgula)</Label>
              <Input
                value={personalityText}
                onChange={(e) => setPersonalityText(e.target.value)}
                placeholder="Ex: Confiavel, Moderno, Proximo"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sugestoes de Tagline (uma por linha)</Label>
            <Textarea
              value={taglinesText}
              onChange={(e) => setTaglinesText(e.target.value)}
              placeholder="Ex: Sua estrategia começa aqui&#10;Resultados que transformam&#10;Marketing que gera receita"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Resumo do Publico-alvo</Label>
            <Textarea
              value={brand.target_audience_summary || ''}
              onChange={(e) => setBrand((prev) => ({ ...prev, target_audience_summary: e.target.value }))}
              placeholder="Descreva brevemente quem e o seu publico ideal..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
