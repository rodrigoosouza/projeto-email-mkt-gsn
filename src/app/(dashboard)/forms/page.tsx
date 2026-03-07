'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, FileInput, Copy, ExternalLink, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { getForms, toggleFormActive } from '@/lib/supabase/forms'
import type { LeadForm } from '@/lib/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const FORM_TYPE_LABELS: Record<string, string> = {
  inline: 'Inline',
  popup: 'Pop-up',
  slide_in: 'Slide-in',
  floating_button: 'Botao Flutuante',
}

const FORM_TYPE_COLORS: Record<string, string> = {
  inline: 'bg-blue-100 text-blue-800',
  popup: 'bg-purple-100 text-purple-800',
  slide_in: 'bg-orange-100 text-orange-800',
  floating_button: 'bg-green-100 text-green-800',
}

export default function FormsPage() {
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()
  const orgId = currentOrg?.id

  const [forms, setForms] = useState<LeadForm[]>([])
  const [loading, setLoading] = useState(true)
  const [embedFormId, setEmbedFormId] = useState<string | null>(null)

  useEffect(() => {
    if (!orgId) return
    loadForms()
  }, [orgId])

  async function loadForms() {
    if (!orgId) return
    setLoading(true)
    try {
      const result = await getForms(orgId)
      setForms(result.forms)
    } catch (error) {
      console.error('Erro ao carregar formularios:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleActive(form: LeadForm) {
    try {
      await toggleFormActive(form.id, !form.is_active)
      setForms((prev) =>
        prev.map((f) => (f.id === form.id ? { ...f, is_active: !f.is_active } : f))
      )
      toast({
        title: form.is_active ? 'Formulario desativado' : 'Formulario ativado',
        description: `"${form.name}" foi ${form.is_active ? 'desativado' : 'ativado'}.`,
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Nao foi possivel alterar o status do formulario.',
        variant: 'destructive',
      })
    }
  }

  function getEmbedCode(formId: string) {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return {
      script: `<script src="${baseUrl}/api/forms/${formId}/embed.js" async></script>`,
      inline: `<div id="plataforma-form-${formId}"></div>\n<script src="${baseUrl}/api/forms/${formId}/embed.js" async></script>`,
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copiado!', description: 'Codigo copiado para a area de transferencia.' })
  }

  const embedForm = forms.find((f) => f.id === embedFormId)
  const embedCode = embedFormId ? getEmbedCode(embedFormId) : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Formularios</h2>
          <p className="text-muted-foreground">
            Crie formularios embarcaveis para captura de leads.
          </p>
        </div>
        <Button asChild>
          <Link href="/forms/new">
            <Plus className="mr-2 h-4 w-4" />
            Novo Formulario
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seus Formularios</CardTitle>
          <CardDescription>
            Formularios de captura de leads para embed em sites externos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Carregando...</div>
            </div>
          ) : forms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileInput className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">Nenhum formulario ainda</h3>
              <p className="text-muted-foreground mt-1 mb-4">
                Crie seu primeiro formulario para comecar a capturar leads.
              </p>
              <Button asChild>
                <Link href="/forms/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Formulario
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Envios</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell>
                      <Link
                        href={`/forms/${form.id}`}
                        className="font-medium hover:underline"
                      >
                        {form.name}
                      </Link>
                      {form.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
                          {form.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={FORM_TYPE_COLORS[form.form_type]}>
                        {FORM_TYPE_LABELS[form.form_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>{form.submission_count}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggleActive(form)}
                        className="flex items-center gap-1.5 text-sm"
                      >
                        {form.is_active ? (
                          <>
                            <ToggleRight className="h-5 w-5 text-green-600" />
                            <span className="text-green-600">Ativo</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-5 w-5 text-gray-400" />
                            <span className="text-gray-400">Inativo</span>
                          </>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(form.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEmbedFormId(form.id)}
                          title="Codigo de embed"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" asChild title="Ver detalhes">
                          <Link href={`/forms/${form.id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Embed Code Dialog */}
      <Dialog open={!!embedFormId} onOpenChange={() => setEmbedFormId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Codigo de Embed - {embedForm?.name}</DialogTitle>
          </DialogHeader>
          {embedCode && (
            <div className="space-y-4 py-2">
              {embedForm?.form_type === 'inline' ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Cole este codigo onde deseja exibir o formulario:
                  </p>
                  <div className="relative">
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap break-all">
                      {embedCode.inline}
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-1 right-1"
                      onClick={() => copyToClipboard(embedCode.inline)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Cole este script antes do {'</body>'} do seu site:
                  </p>
                  <div className="relative">
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap break-all">
                      {embedCode.script}
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-1 right-1"
                      onClick={() => copyToClipboard(embedCode.script)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                O formulario sera carregado automaticamente na pagina.
                {embedForm?.form_type === 'popup' && ' Aparecera como pop-up apos um tempo.'}
                {embedForm?.form_type === 'slide_in' && ' Aparecera como painel deslizante no canto.'}
                {embedForm?.form_type === 'floating_button' && ' Aparecera como botao flutuante no canto inferior direito.'}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
