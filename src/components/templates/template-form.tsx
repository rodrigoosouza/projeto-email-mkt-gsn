'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Eye,
  Code,
  MousePointerClick,
  Smartphone,
  Monitor,
  ChevronDown,
  ChevronUp,
  Save,
  Loader2,
  ArrowLeft,
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
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { useAuth } from '@/hooks/use-auth'
import { createTemplate, updateTemplate } from '@/lib/supabase/templates'
import { TEMPLATE_CATEGORY_LABELS } from '@/lib/constants'
import { UnlayerEditor } from '@/components/templates/unlayer-editor'
import type { EmailTemplate } from '@/lib/types'

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px;">
    <h1 style="color: #333;">Ola, {{first_name}}!</h1>
    <p style="color: #666; line-height: 1.6;">Seu conteudo aqui...</p>
    <a href="https://seusite.com" style="display: inline-block; background-color: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">Saiba Mais</a>
  </div>
</body>
</html>`

const templateSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio'),
  description: z.string().optional(),
  category: z.string().min(1, 'Categoria e obrigatoria'),
  subject: z.string().min(1, 'Assunto e obrigatorio'),
  preview_text: z.string().optional(),
  html_content: z.string().min(1, 'Conteudo HTML e obrigatorio'),
})

type TemplateFormValues = z.infer<typeof templateSchema>

interface TemplateFormProps {
  template?: EmailTemplate
}

export function TemplateForm({ template }: TemplateFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { currentOrg } = useOrganizationContext()
  const { user } = useAuth()
  const [step, setStep] = useState<'info' | 'builder'>(template ? 'builder' : 'info')
  const [editorMode, setEditorMode] = useState<'visual' | 'html'>('visual')
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code')
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [unlayerJson, setUnlayerJson] = useState<any>(template?.unlayer_json || null)
  const [savingUnlayer, setSavingUnlayer] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const isEditMode = !!template

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: template?.name || '',
      description: template?.description || '',
      category: template?.category || '',
      subject: template?.subject || '',
      preview_text: template?.preview_text || '',
      html_content: template?.html_content || DEFAULT_HTML,
    },
  })

  const htmlContent = watch('html_content')

  const handleGoToBuilder = async () => {
    const valid = await trigger(['name', 'category', 'subject'])
    if (valid) {
      setStep('builder')
    }
  }

  const handleUnlayerSave = useCallback(
    async (html: string, json: any) => {
      if (!currentOrg || !user) {
        toast({
          title: 'Erro',
          description: !currentOrg ? 'Nenhuma organizacao selecionada.' : 'Usuario nao autenticado.',
          variant: 'destructive',
        })
        return
      }

      const values = watch()
      if (!values.name || !values.category || !values.subject) {
        toast({
          title: 'Erro',
          description: 'Preencha os campos obrigatorios (Nome, Categoria, Assunto).',
          variant: 'destructive',
        })
        setStep('info')
        return
      }

      setSavingUnlayer(true)
      try {
        if (isEditMode) {
          await updateTemplate(template.id, {
            name: values.name,
            description: values.description || null,
            category: values.category,
            subject: values.subject,
            preview_text: values.preview_text || null,
            html_content: html,
            unlayer_json: json,
          })
          toast({ title: 'Template atualizado', description: 'O template foi atualizado com sucesso.' })
        } else {
          await createTemplate(currentOrg.id, user.id, {
            name: values.name,
            description: values.description || undefined,
            category: values.category,
            subject: values.subject,
            preview_text: values.preview_text || undefined,
            html_content: html,
            unlayer_json: json,
          })
          toast({ title: 'Template criado', description: 'O template foi criado com sucesso.' })
        }
        setUnlayerJson(json)
        router.push('/templates')
      } catch (error: any) {
        console.error('Erro ao salvar template:', error)
        const message = error?.message || ''
        let description = 'Nao foi possivel salvar o template.'
        if (message.includes('unique') || message.includes('duplicate') || message.includes('email_templates_org_id_name_key')) {
          description = 'Ja existe um template com esse nome. Escolha outro nome.'
        }
        toast({ title: 'Erro', description, variant: 'destructive' })
      } finally {
        setSavingUnlayer(false)
      }
    },
    [currentOrg, user, watch, isEditMode, template, toast, router]
  )

  useEffect(() => {
    if (activeTab === 'preview' && iframeRef.current) {
      const doc = iframeRef.current.contentDocument
      if (doc) {
        doc.open()
        doc.write(htmlContent || '')
        doc.close()
      }
    }
  }, [htmlContent, activeTab])

  const handleFormSubmit = async (values: TemplateFormValues) => {
    if (!currentOrg || !user) {
      toast({
        title: 'Erro',
        description: !currentOrg ? 'Nenhuma organizacao selecionada.' : 'Usuario nao autenticado.',
        variant: 'destructive',
      })
      return
    }

    try {
      if (isEditMode) {
        await updateTemplate(template.id, {
          name: values.name,
          description: values.description || null,
          category: values.category,
          subject: values.subject,
          preview_text: values.preview_text || null,
          html_content: values.html_content,
        })
        toast({ title: 'Template atualizado', description: 'O template foi atualizado com sucesso.' })
      } else {
        await createTemplate(currentOrg.id, user.id, {
          name: values.name,
          description: values.description || undefined,
          category: values.category,
          subject: values.subject,
          preview_text: values.preview_text || undefined,
          html_content: values.html_content,
        })
        toast({ title: 'Template criado', description: 'O template foi criado com sucesso.' })
      }
      router.push('/templates')
    } catch (error: any) {
      console.error('Erro ao salvar template:', error)
      const message = error?.message || ''
      let description = 'Nao foi possivel salvar o template.'
      if (message.includes('unique') || message.includes('duplicate') || message.includes('email_templates_org_id_name_key')) {
        description = 'Ja existe um template com esse nome. Escolha outro nome.'
      }
      toast({ title: 'Erro', description, variant: 'destructive' })
    }
  }

  // ===== STEP 1: METADATA =====
  if (step === 'info') {
    return (
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                1
              </div>
              <CardTitle className="text-lg">Informacoes do Email</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nome <span className="text-destructive">*</span>
                </Label>
                <Input id="name" placeholder="Ex: Email de boas-vindas" {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">
                  Categoria <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
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
                  )}
                />
                {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">
                  Assunto <span className="text-destructive">*</span>
                </Label>
                <Input id="subject" placeholder="Ex: Bem-vindo a nossa plataforma!" {...register('subject')} />
                <p className="text-xs text-muted-foreground">
                  Use {'{{first_name}}'}, {'{{company}}'} para personalizar
                </p>
                {errors.subject && <p className="text-sm text-destructive">{errors.subject.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="preview_text">Texto de Preview</Label>
                <Input
                  id="preview_text"
                  placeholder="Texto que aparece na preview do email"
                  {...register('preview_text')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descricao</Label>
              <Textarea
                id="description"
                placeholder="Descricao opcional do template..."
                rows={2}
                {...register('description')}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleGoToBuilder}>
                Proximo: Montar Email
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    )
  }

  // ===== STEP 2: VISUAL BUILDER (full-screen mode) =====
  if (editorMode === 'visual') {
    return (
      <div className="-m-6 flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-background border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStep('info')}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Voltar
            </Button>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                2
              </div>
              <span className="text-sm font-medium">Montar Email</span>
              <span className="text-xs text-muted-foreground">
                — {watch('name') || 'Sem nome'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 border rounded-md p-0.5">
              <Button
                type="button"
                variant="default"
                size="sm"
                className="h-7 text-xs"
              >
                <MousePointerClick className="mr-1 h-3 w-3" />
                Visual
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setEditorMode('html')}
              >
                <Code className="mr-1 h-3 w-3" />
                HTML
              </Button>
            </div>
          </div>
        </div>

        {/* Unlayer editor — fills remaining space */}
        <div className="flex-1 min-h-0">
          <UnlayerEditor
            initialJson={unlayerJson}
            onSave={handleUnlayerSave}
            saving={savingUnlayer}
          />
        </div>
      </div>
    )
  }

  // ===== STEP 2: HTML EDITOR =====
  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Collapsed metadata summary */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setStep('info')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                1
              </div>
              <div>
                <CardTitle className="text-lg">Informacoes do Email</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {watch('name') || 'Sem nome'} — {watch('subject') || 'Sem assunto'}
                </p>
              </div>
            </div>
            <Button type="button" variant="ghost" size="sm">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* HTML Editor */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                2
              </div>
              <CardTitle className="text-lg">Montar Email</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 border rounded-md p-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setEditorMode('visual')}
                >
                  <MousePointerClick className="mr-1 h-3 w-3" />
                  Visual
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="h-7 text-xs"
                >
                  <Code className="mr-1 h-3 w-3" />
                  HTML
                </Button>
              </div>
              <div className="w-px h-6 bg-border" />
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Save className="mr-1 h-3 w-3" />
                )}
                {isSubmitting ? 'Salvando...' : isEditMode ? 'Salvar' : 'Criar Template'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* HTML code/preview tabs */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 border rounded-md p-0.5">
              <Button
                type="button"
                variant={activeTab === 'code' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setActiveTab('code')}
              >
                <Code className="mr-1 h-3 w-3" />
                Codigo
              </Button>
              <Button
                type="button"
                variant={activeTab === 'preview' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setActiveTab('preview')}
              >
                <Eye className="mr-1 h-3 w-3" />
                Preview
              </Button>
            </div>

            {activeTab === 'preview' && (
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
            )}
          </div>

          {activeTab === 'code' ? (
            <div className="space-y-2">
              <Textarea
                className="font-mono text-xs min-h-[600px] resize-y bg-zinc-950 text-green-400 p-4 leading-relaxed rounded-md"
                placeholder="Cole ou escreva seu HTML aqui..."
                spellCheck={false}
                {...register('html_content')}
              />
              <p className="text-xs text-muted-foreground">
                Variaveis: {'{{first_name}}'}, {'{{last_name}}'}, {'{{email}}'}, {'{{company}}'}, {'{{position}}'}
              </p>
              {errors.html_content && (
                <p className="text-sm text-destructive">{errors.html_content.message}</p>
              )}
            </div>
          ) : (
            <div
              className={`border rounded-md overflow-hidden bg-white mx-auto transition-all ${
                previewDevice === 'mobile' ? 'max-w-[375px]' : ''
              }`}
            >
              <iframe
                ref={iframeRef}
                title="Preview do email"
                className="w-full min-h-[600px] border-0"
                sandbox="allow-same-origin"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </form>
  )
}
