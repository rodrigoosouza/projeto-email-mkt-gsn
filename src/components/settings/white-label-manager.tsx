'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { createClient } from '@/lib/supabase/client'

interface WhiteLabelFormData {
  app_name: string
  logo_url: string
  favicon_url: string
  primary_color: string
  secondary_color: string
  accent_color: string
  custom_domain: string
  custom_css: string
  hide_branding: boolean
  email_footer_text: string
}

const defaultFormData: WhiteLabelFormData = {
  app_name: 'Plataforma Email',
  logo_url: '',
  favicon_url: '',
  primary_color: '#3B82F6',
  secondary_color: '#6366F1',
  accent_color: '#F59E0B',
  custom_domain: '',
  custom_css: '',
  hide_branding: false,
  email_footer_text: '',
}

export function WhiteLabelManager() {
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()
  const [formData, setFormData] = useState<WhiteLabelFormData>(defaultFormData)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (currentOrg?.id) {
      loadConfig()
    }
  }, [currentOrg?.id])

  async function loadConfig() {
    if (!currentOrg?.id) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('white_label_configs')
        .select('*')
        .eq('org_id', currentOrg.id)
        .single()

      if (data) {
        setFormData({
          app_name: data.app_name || defaultFormData.app_name,
          logo_url: data.logo_url || '',
          favicon_url: data.favicon_url || '',
          primary_color: data.primary_color || defaultFormData.primary_color,
          secondary_color: data.secondary_color || defaultFormData.secondary_color,
          accent_color: data.accent_color || defaultFormData.accent_color,
          custom_domain: data.custom_domain || '',
          custom_css: data.custom_css || '',
          hide_branding: data.hide_branding || false,
          email_footer_text: data.email_footer_text || '',
        })
      }
    } catch {
      // No config yet, use defaults
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!currentOrg?.id) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('white_label_configs')
        .upsert(
          {
            org_id: currentOrg.id,
            ...formData,
            logo_url: formData.logo_url || null,
            favicon_url: formData.favicon_url || null,
            custom_domain: formData.custom_domain || null,
            custom_css: formData.custom_css || null,
            email_footer_text: formData.email_footer_text || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'org_id' }
        )

      if (error) throw error

      toast({ title: 'Configuracao salva', description: 'As configuracoes de White Label foram atualizadas.' })
    } catch {
      toast({ title: 'Erro', description: 'Nao foi possivel salvar as configuracoes.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const updateField = <K extends keyof WhiteLabelFormData>(field: K, value: WhiteLabelFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>White Label</CardTitle>
          <CardDescription>
            Personalize a aparencia da plataforma para sua organizacao.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Identidade */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="app_name">Nome do App</Label>
              <Input
                id="app_name"
                value={formData.app_name}
                onChange={(e) => updateField('app_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom_domain">Dominio Personalizado</Label>
              <Input
                id="custom_domain"
                value={formData.custom_domain}
                onChange={(e) => updateField('custom_domain', e.target.value)}
                placeholder="app.suaempresa.com"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="logo_url">URL do Logo</Label>
              <Input
                id="logo_url"
                value={formData.logo_url}
                onChange={(e) => updateField('logo_url', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="favicon_url">URL do Favicon</Label>
              <Input
                id="favicon_url"
                value={formData.favicon_url}
                onChange={(e) => updateField('favicon_url', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Cores */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="primary_color">Cor Primaria</Label>
              <div className="flex gap-2">
                <Input
                  id="primary_color"
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => updateField('primary_color', e.target.value)}
                  className="h-10 w-14 cursor-pointer p-1"
                />
                <Input
                  value={formData.primary_color}
                  onChange={(e) => updateField('primary_color', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondary_color">Cor Secundaria</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary_color"
                  type="color"
                  value={formData.secondary_color}
                  onChange={(e) => updateField('secondary_color', e.target.value)}
                  className="h-10 w-14 cursor-pointer p-1"
                />
                <Input
                  value={formData.secondary_color}
                  onChange={(e) => updateField('secondary_color', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accent_color">Cor de Destaque</Label>
              <div className="flex gap-2">
                <Input
                  id="accent_color"
                  type="color"
                  value={formData.accent_color}
                  onChange={(e) => updateField('accent_color', e.target.value)}
                  className="h-10 w-14 cursor-pointer p-1"
                />
                <Input
                  value={formData.accent_color}
                  onChange={(e) => updateField('accent_color', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="h-8 w-8 rounded"
                  style={{ backgroundColor: formData.primary_color }}
                />
                <span className="font-semibold">{formData.app_name}</span>
              </div>
              <div className="flex gap-2">
                <div
                  className="rounded px-3 py-1 text-sm text-white"
                  style={{ backgroundColor: formData.primary_color }}
                >
                  Primaria
                </div>
                <div
                  className="rounded px-3 py-1 text-sm text-white"
                  style={{ backgroundColor: formData.secondary_color }}
                >
                  Secundaria
                </div>
                <div
                  className="rounded px-3 py-1 text-sm text-white"
                  style={{ backgroundColor: formData.accent_color }}
                >
                  Destaque
                </div>
              </div>
            </div>
          </div>

          {/* Branding */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Ocultar Branding</Label>
              <p className="text-sm text-muted-foreground">
                Remove a marca da plataforma dos emails e da interface.
              </p>
            </div>
            <Switch
              checked={formData.hide_branding}
              onCheckedChange={(checked) => updateField('hide_branding', checked)}
            />
          </div>

          {/* Email Footer */}
          <div className="space-y-2">
            <Label htmlFor="email_footer_text">Texto do Rodape dos Emails</Label>
            <Textarea
              id="email_footer_text"
              value={formData.email_footer_text}
              onChange={(e) => updateField('email_footer_text', e.target.value)}
              placeholder="Texto que aparecera no rodape de todos os emails enviados..."
              rows={3}
            />
          </div>

          {/* Custom CSS */}
          <div className="space-y-2">
            <Label htmlFor="custom_css">CSS Personalizado</Label>
            <Textarea
              id="custom_css"
              value={formData.custom_css}
              onChange={(e) => updateField('custom_css', e.target.value)}
              placeholder=":root { --primary: #3B82F6; }"
              rows={5}
              className="font-mono text-sm"
            />
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Configuracoes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
