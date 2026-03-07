'use client'

import { useState, useEffect } from 'react'
import { Save, Palette, Sparkles, Loader2, Crown } from 'lucide-react'
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
  tone_of_voice: '',
  brand_values: [],
  visual_style: '',
  target_audience_summary: '',
  brand_archetype: '',
  brand_archetype_description: '',
  brand_personality: [],
  brand_promise: '',
  tagline_suggestions: [],
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

  useEffect(() => {
    if (profile?.brand_identity && Object.keys(profile.brand_identity).length > 0) {
      setBrand({ ...defaultBrand, ...profile.brand_identity })
      setValuesText(profile.brand_identity.brand_values?.join(', ') || '')
      setPersonalityText(profile.brand_identity.brand_personality?.join(', ') || '')
      setTaglinesText(profile.brand_identity.tagline_suggestions?.join('\n') || '')
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

  const selectedArchetype = ARCHETYPES.find((a) => a.value === brand.brand_archetype)

  return (
    <div className="space-y-4">
      {/* AI Generation */}
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

      {/* Colors */}
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
            {/* Preview */}
            <div className="flex gap-2 mt-3">
              <div className="h-12 flex-1 rounded-md" style={{ backgroundColor: brand.primary_color || '#3b82f6' }} />
              <div className="h-12 flex-1 rounded-md" style={{ backgroundColor: brand.secondary_color || '#1e40af' }} />
              <div className="h-12 flex-1 rounded-md" style={{ backgroundColor: brand.accent_color || '#f59e0b' }} />
            </div>
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
