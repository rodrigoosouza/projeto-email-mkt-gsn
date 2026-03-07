'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import {
  getCustomFieldDefinitions,
  createCustomFieldDefinition,
  deleteCustomFieldDefinition,
} from '@/lib/supabase/custom-fields'
import type { CustomFieldDefinition } from '@/lib/types'

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Texto',
  number: 'Numero',
  date: 'Data',
  select: 'Selecao',
  boolean: 'Sim/Nao',
  url: 'URL',
  email: 'Email',
  phone: 'Telefone',
}

export function CustomFieldsManager() {
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()
  const [fields, setFields] = useState<CustomFieldDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newField, setNewField] = useState({
    name: '',
    label: '',
    field_type: 'text',
    options: '',
    required: false,
  })

  useEffect(() => {
    if (currentOrg) loadFields()
  }, [currentOrg])

  const loadFields = async () => {
    if (!currentOrg) return
    try {
      const data = await getCustomFieldDefinitions(currentOrg.id)
      setFields(data)
    } catch (error) {
      console.error('Erro ao carregar campos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!currentOrg || !newField.name.trim() || !newField.label.trim()) return

    setCreating(true)
    try {
      const options = newField.field_type === 'select' && newField.options.trim()
        ? newField.options.split(',').map((o) => o.trim()).filter(Boolean)
        : undefined

      await createCustomFieldDefinition(currentOrg.id, {
        name: newField.name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        label: newField.label.trim(),
        field_type: newField.field_type,
        options,
        required: newField.required,
      })

      await loadFields()
      setShowDialog(false)
      setNewField({ name: '', label: '', field_type: 'text', options: '', required: false })
      toast({ title: 'Campo criado', description: 'O campo personalizado foi criado com sucesso.' })
    } catch (error: any) {
      console.error('Erro ao criar campo:', error)
      const msg = error?.message?.includes('unique')
        ? 'Ja existe um campo com esse nome.'
        : 'Nao foi possivel criar o campo.'
      toast({ title: 'Erro', description: msg, variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (fieldId: string) => {
    try {
      await deleteCustomFieldDefinition(fieldId)
      setFields((prev) => prev.filter((f) => f.id !== fieldId))
      toast({ title: 'Campo removido', description: 'O campo personalizado foi removido.' })
    } catch (error) {
      console.error('Erro ao remover campo:', error)
      toast({ title: 'Erro', description: 'Nao foi possivel remover o campo.', variant: 'destructive' })
    }
  }

  // Auto-generate name from label
  const handleLabelChange = (label: string) => {
    const name = label.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)/g, '')
    setNewField((prev) => ({ ...prev, label, name }))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Campos Personalizados</CardTitle>
            <CardDescription>
              Defina campos extras para os leads da sua organizacao
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Campo
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        ) : fields.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            Nenhum campo personalizado definido. Clique em &quot;Novo Campo&quot; para comecar.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Nome (chave)</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Obrigatorio</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field) => (
                <TableRow key={field.id}>
                  <TableCell className="font-medium">{field.label}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {field.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {FIELD_TYPE_LABELS[field.field_type] || field.field_type}
                    </Badge>
                    {field.field_type === 'select' && field.options && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({(field.options as string[]).length} opcoes)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{field.required ? 'Sim' : 'Nao'}</TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover campo?</AlertDialogTitle>
                          <AlertDialogDescription>
                            O campo &quot;{field.label}&quot; sera removido. Os dados ja salvos nos leads nao serao apagados, mas o campo nao aparecera mais nos formularios.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(field.id)}>
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create Field Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Campo Personalizado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Label (nome visivel)</Label>
              <Input
                placeholder="Ex: Nivel do Cargo"
                value={newField.label}
                onChange={(e) => handleLabelChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome (chave interna)</Label>
              <Input
                value={newField.name}
                onChange={(e) => setNewField((prev) => ({ ...prev, name: e.target.value }))}
                className="font-mono text-sm"
                placeholder="nivel_cargo"
              />
              <p className="text-xs text-muted-foreground">
                Usado internamente e nas APIs. Sem espacos ou acentos.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Tipo do Campo</Label>
              <Select
                value={newField.field_type}
                onValueChange={(value) => setNewField((prev) => ({ ...prev, field_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newField.field_type === 'select' && (
              <div className="space-y-2">
                <Label>Opcoes (separadas por virgula)</Label>
                <Input
                  placeholder="Opcao 1, Opcao 2, Opcao 3"
                  value={newField.options}
                  onChange={(e) => setNewField((prev) => ({ ...prev, options: e.target.value }))}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Checkbox
                id="required"
                checked={newField.required}
                onCheckedChange={(checked) =>
                  setNewField((prev) => ({ ...prev, required: !!checked }))
                }
              />
              <Label htmlFor="required" className="text-sm font-normal">
                Campo obrigatorio
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newField.name.trim() || !newField.label.trim() || creating}
            >
              {creating ? 'Criando...' : 'Criar Campo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
