'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Copy,
  Edit,
  Trash2,
  FileInput,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
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
import { useToast } from '@/components/ui/use-toast'
import { getForm, getFormSubmissions, deleteForm, toggleFormActive } from '@/lib/supabase/forms'
import type { LeadForm, FormSubmission } from '@/lib/types'
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

export default function FormDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()

  const [form, setForm] = useState<LeadForm | null>(null)
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [totalSubmissions, setTotalSubmissions] = useState(0)

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    setLoading(true)
    try {
      const [formData, subsData] = await Promise.all([
        getForm(id),
        getFormSubmissions(id),
      ])
      setForm(formData)
      setSubmissions(subsData.submissions)
      setTotalSubmissions(subsData.total)
    } catch (error) {
      console.error('Erro ao carregar formulario:', error)
      toast({
        title: 'Erro',
        description: 'Formulario nao encontrado.',
        variant: 'destructive',
      })
      router.push('/forms')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!form) return
    try {
      await deleteForm(form.id)
      toast({ title: 'Formulario excluido', description: `"${form.name}" foi excluido.` })
      router.push('/forms')
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Nao foi possivel excluir o formulario.',
        variant: 'destructive',
      })
    }
  }

  async function handleToggleActive() {
    if (!form) return
    try {
      const updated = await toggleFormActive(form.id, !form.is_active)
      setForm(updated)
      toast({
        title: form.is_active ? 'Formulario desativado' : 'Formulario ativado',
      })
    } catch (error) {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  function getEmbedCode() {
    if (!form) return { script: '', inline: '' }
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return {
      script: `<script src="${baseUrl}/api/forms/${form.id}/embed.js" async></script>`,
      inline: `<div id="plataforma-form-${form.id}"></div>\n<script src="${baseUrl}/api/forms/${form.id}/embed.js" async></script>`,
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copiado!', description: 'Codigo copiado para a area de transferencia.' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  if (!form) return null

  const embedCode = getEmbedCode()
  const isInline = form.form_type === 'inline'

  // Get all unique field names from submissions
  const submissionFields = new Set<string>()
  submissions.forEach((sub) => {
    Object.keys(sub.data).forEach((key) => submissionFields.add(key))
  })
  const fieldColumns = Array.from(submissionFields)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/forms">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">{form.name}</h2>
              <Badge className={FORM_TYPE_COLORS[form.form_type]}>
                {FORM_TYPE_LABELS[form.form_type]}
              </Badge>
            </div>
            {form.description && (
              <p className="text-muted-foreground mt-0.5">{form.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleToggleActive}>
            {form.is_active ? (
              <>
                <ToggleRight className="mr-2 h-4 w-4 text-green-600" />
                Ativo
              </>
            ) : (
              <>
                <ToggleLeft className="mr-2 h-4 w-4" />
                Inativo
              </>
            )}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir formulario?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acao nao pode ser desfeita. Todas as submissoes associadas tambem serao excluidas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Form Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Preview do Formulario</CardTitle>
              <CardDescription>
                Visualizacao de como o formulario aparece para os visitantes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-6 bg-white dark:bg-zinc-950 max-w-md mx-auto space-y-4">
                {form.fields.map((field, i) => (
                  <div key={i} className="space-y-1.5">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        placeholder={field.placeholder || ''}
                        disabled
                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-500 min-h-[80px]"
                      />
                    ) : field.type === 'select' && field.options?.length ? (
                      <select
                        disabled
                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-500"
                      >
                        <option>Selecione...</option>
                        {field.options.map((opt, j) => (
                          <option key={j}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type === 'phone' ? 'tel' : field.type}
                        placeholder={field.placeholder || ''}
                        disabled
                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-500"
                      />
                    )}
                  </div>
                ))}
                <button
                  disabled
                  className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white opacity-90"
                >
                  Enviar
                </button>
                {form.settings?.include_tracking && (
                  <p className="text-xs text-zinc-400 text-center mt-2">
                    + 26 campos ocultos de tracking (UTMs, click IDs, cookies, sessao)
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Embed Code */}
          <Card>
            <CardHeader>
              <CardTitle>Codigo de Embed</CardTitle>
              <CardDescription>
                {isInline
                  ? 'Cole este codigo onde deseja exibir o formulario na sua pagina.'
                  : 'Cole este script antes do </body> do seu site.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto whitespace-pre-wrap break-all">
                  {isInline ? embedCode.inline : embedCode.script}
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(isInline ? embedCode.inline : embedCode.script)}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Submissions */}
          <Card>
            <CardHeader>
              <CardTitle>Submissoes ({totalSubmissions})</CardTitle>
              <CardDescription>
                Dados enviados pelos visitantes atraves deste formulario.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileInput className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold">Nenhuma submissao ainda</h3>
                  <p className="text-muted-foreground mt-1">
                    As submissoes aparecerao aqui quando visitantes preencherem o formulario.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {fieldColumns.map((col) => (
                          <TableHead key={col}>{col}</TableHead>
                        ))}
                        <TableHead>Origem</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissions.map((sub) => (
                        <TableRow key={sub.id}>
                          {fieldColumns.map((col) => (
                            <TableCell key={col} className="max-w-xs truncate">
                              {sub.data[col] || '-'}
                            </TableCell>
                          ))}
                          <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                            {sub.source_url || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {format(new Date(sub.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informacoes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={form.is_active ? 'text-green-600 font-medium' : 'text-gray-400'}>
                  {form.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo</span>
                <span>{FORM_TYPE_LABELS[form.form_type]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Campos</span>
                <span>{form.fields.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Submissoes</span>
                <span className="font-medium">{form.submission_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criado em</span>
                <span>{format(new Date(form.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Atualizado em</span>
                <span>{format(new Date(form.updated_at), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {form.fields.map((field, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>{field.label}</span>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {field.type}
                      </Badge>
                      {field.required && (
                        <span className="text-red-500 text-xs">*</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mensagem de Sucesso</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{form.success_message}</p>
              {form.redirect_url && (
                <p className="text-xs text-muted-foreground mt-2">
                  Redireciona para: {form.redirect_url}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
