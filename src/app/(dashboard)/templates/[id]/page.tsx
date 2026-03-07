'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2, Copy, Send, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { useAuth } from '@/hooks/use-auth'
import {
  getTemplate,
  deleteTemplate,
  duplicateTemplate,
} from '@/lib/supabase/templates'
import {
  TEMPLATE_CATEGORY_LABELS,
  TEMPLATE_CATEGORY_COLORS,
} from '@/lib/constants'
import { TemplateForm } from '@/components/templates/template-form'
import type { EmailTemplate } from '@/lib/types'

export default function TemplateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { currentOrg } = useOrganizationContext()
  const { user } = useAuth()
  const templateId = params.id as string

  const [template, setTemplate] = useState<EmailTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [testEmailOpen, setTestEmailOpen] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)

  const previewIframeRef = useRef<HTMLIFrameElement>(null)

  const fetchTemplate = useCallback(async () => {
    try {
      const data = await getTemplate(templateId)
      setTemplate(data)
    } catch (error) {
      console.error('Erro ao buscar template:', error)
      toast({
        title: 'Erro',
        description: 'Template nao encontrado.',
        variant: 'destructive',
      })
      router.push('/templates')
    }
  }, [templateId, router, toast])

  useEffect(() => {
    async function load() {
      setLoading(true)
      await fetchTemplate()
      setLoading(false)
    }
    load()
  }, [fetchTemplate])

  useEffect(() => {
    if (template && previewIframeRef.current) {
      const doc = previewIframeRef.current.contentDocument
      if (doc) {
        doc.open()
        doc.write(template.html_content || '')
        doc.close()
      }
    }
  }, [template, editMode])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteTemplate(templateId)
      toast({
        title: 'Template excluido',
        description: 'O template foi excluido com sucesso.',
      })
      router.push('/templates')
    } catch (error) {
      console.error('Erro ao excluir template:', error)
      toast({
        title: 'Erro',
        description: 'Nao foi possivel excluir o template.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleDuplicate = async () => {
    if (!currentOrg || !user) return
    setDuplicating(true)
    try {
      const newTemplate = await duplicateTemplate(
        templateId,
        currentOrg.id,
        user.id
      )
      toast({
        title: 'Template duplicado',
        description: 'O template foi duplicado com sucesso.',
      })
      router.push(`/templates/${newTemplate.id}`)
    } catch (error) {
      console.error('Erro ao duplicar template:', error)
      toast({
        title: 'Erro',
        description: 'Nao foi possivel duplicar o template.',
        variant: 'destructive',
      })
    } finally {
      setDuplicating(false)
    }
  }

  const handleSendTest = async () => {
    if (!testEmail) return
    setSendingTest(true)
    try {
      const response = await fetch('/api/templates/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          subject: template?.subject,
          html_content: template?.html_content,
        }),
      })
      if (!response.ok) throw new Error('Erro ao enviar')
      const result = await response.json()
      if (result.dev) {
        toast({ title: 'MailerSend nao configurado', description: 'Adicione MAILERSEND_API_KEY no .env.local para enviar emails reais.', variant: 'destructive' })
      } else {
        toast({ title: 'Email de teste enviado', description: `Enviado para ${testEmail}` })
      }
      setTestEmailOpen(false)
      setTestEmail('')
    } catch (error) {
      toast({ title: 'Erro', description: 'Nao foi possivel enviar o email de teste.', variant: 'destructive' })
    } finally {
      setSendingTest(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-[400px] w-full rounded-lg" />
          </div>
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (!template) return null

  if (editMode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditMode(false)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">
            Editar Template
          </h2>
        </div>
        <TemplateForm template={template} />
      </div>
    )
  }

  const categoryLabel =
    TEMPLATE_CATEGORY_LABELS[template.category] || template.category
  const categoryColor =
    TEMPLATE_CATEGORY_COLORS[template.category] || 'bg-gray-100 text-gray-800'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" onClick={() => router.push('/templates')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Templates
          </Button>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">
              {template.name}
            </h2>
            <Badge className={categoryColor}>{categoryLabel}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={testEmailOpen} onOpenChange={setTestEmailOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Send className="mr-2 h-4 w-4" />
                Enviar Teste
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enviar Email de Teste</DialogTitle>
                <DialogDescription>
                  Envie este template para um email de teste para verificar como ficou.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTestEmailOpen(false)}>Cancelar</Button>
                <Button onClick={handleSendTest} disabled={sendingTest || !testEmail}>
                  {sendingTest ? 'Enviando...' : 'Enviar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDuplicate}
            disabled={duplicating}
          >
            <Copy className="mr-2 h-4 w-4" />
            {duplicating ? 'Duplicando...' : 'Duplicar'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditMode(true)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir template</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o template{' '}
                  <strong>{template.name}</strong>? Esta acao nao pode ser
                  desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>Criado em: {formatDate(template.created_at)}</span>
        <span>Atualizado em: {formatDate(template.updated_at)}</span>
        {template.is_ai_generated && (
          <Badge variant="secondary">Gerado por IA</Badge>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Informacoes</TabsTrigger>
          <TabsTrigger value="content">Conteudo</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalhes do Template</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Nome
                  </p>
                  <p className="text-sm">{template.name}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Categoria
                  </p>
                  <Badge className={categoryColor}>{categoryLabel}</Badge>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Descricao
                  </p>
                  <p className="text-sm">
                    {template.description || 'Sem descricao'}
                  </p>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Assunto
                  </p>
                  <p className="text-sm">{template.subject}</p>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Texto de Preview
                  </p>
                  <p className="text-sm">
                    {template.preview_text || 'Sem texto de preview'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Preview do Email</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditMode(true)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden bg-white">
                <iframe
                  ref={previewIframeRef}
                  title="Preview do email"
                  className="w-full min-h-[500px] border-0"
                  sandbox="allow-same-origin"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
