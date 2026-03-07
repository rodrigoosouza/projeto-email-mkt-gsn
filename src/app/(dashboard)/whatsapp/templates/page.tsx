'use client'

import { useEffect, useState } from 'react'
import { Plus, FileText, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useOrganizationContext } from '@/contexts/organization-context'
import { useToast } from '@/components/ui/use-toast'
import {
  getWhatsAppTemplates,
  createWhatsAppTemplate,
  deleteWhatsAppTemplate,
} from '@/lib/supabase/whatsapp'
import type { WhatsAppTemplate } from '@/lib/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

const CATEGORY_LABELS: Record<string, string> = {
  marketing: 'Marketing',
  utility: 'Utilidade',
  authentication: 'Autenticacao',
}

export default function WhatsAppTemplatesPage() {
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '',
    category: 'marketing' as WhatsAppTemplate['category'],
    language: 'pt_BR',
    bodyText: '',
  })

  useEffect(() => {
    if (currentOrg) loadTemplates()
  }, [currentOrg])

  const loadTemplates = async () => {
    if (!currentOrg) return
    try {
      const data = await getWhatsAppTemplates(currentOrg.id)
      setTemplates(data)
    } catch (error) {
      console.error('Erro ao carregar templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!currentOrg || !form.name.trim()) return
    setCreating(true)
    try {
      const components = form.bodyText.trim()
        ? [{ type: 'BODY', text: form.bodyText }]
        : []

      const template = await createWhatsAppTemplate(currentOrg.id, {
        name: form.name.trim().toLowerCase().replace(/\s+/g, '_'),
        category: form.category,
        language: form.language,
        components,
      })

      setTemplates((prev) => [template, ...prev])
      setShowCreateDialog(false)
      setForm({ name: '', category: 'marketing', language: 'pt_BR', bodyText: '' })
      toast({ title: 'Template criado', description: 'Template de WhatsApp criado com sucesso.' })
    } catch (error: any) {
      console.error('Erro ao criar template:', error)
      toast({
        title: 'Erro',
        description: error.message?.includes('unique')
          ? 'Ja existe um template com esse nome.'
          : 'Nao foi possivel criar o template.',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (templateId: string) => {
    try {
      await deleteWhatsAppTemplate(templateId)
      setTemplates((prev) => prev.filter((t) => t.id !== templateId))
      toast({ title: 'Template excluido' })
    } catch (error) {
      console.error('Erro ao excluir template:', error)
      toast({ title: 'Erro', description: 'Nao foi possivel excluir o template.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Templates WhatsApp</h2>
          <p className="text-muted-foreground">
            Gerencie os templates de mensagem do WhatsApp Business.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>
            Templates devem ser aprovados pela Meta antes de serem usados em envios em massa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Carregando...
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                Nenhum template criado
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Crie templates para enviar mensagens padronizadas via WhatsApp.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar Template
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Idioma</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>{CATEGORY_LABELS[template.category] || template.category}</TableCell>
                    <TableCell>{template.language}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[template.status] || ''} variant="secondary">
                        {STATUS_LABELS[template.status] || template.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(template.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Template Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Template WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Template</Label>
              <Input
                placeholder="ex: boas_vindas_cliente"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Apenas letras minusculas, numeros e underscores.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v as WhatsAppTemplate['category'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="utility">Utilidade</SelectItem>
                    <SelectItem value="authentication">Autenticacao</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Idioma</Label>
                <Select
                  value={form.language}
                  onValueChange={(v) => setForm((f) => ({ ...f, language: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt_BR">Portugues (BR)</SelectItem>
                    <SelectItem value="en_US">Ingles (US)</SelectItem>
                    <SelectItem value="es">Espanhol</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Corpo da Mensagem</Label>
              <Textarea
                placeholder="Ola {{1}}! Bem-vindo a {{2}}."
                rows={4}
                value={form.bodyText}
                onChange={(e) => setForm((f) => ({ ...f, bodyText: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                {"Use {{1}}, {{2}}, etc. para variaveis dinamicas."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!form.name.trim() || creating}>
              {creating ? 'Criando...' : 'Criar Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
