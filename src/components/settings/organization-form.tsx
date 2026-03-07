'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { updateOrganization } from '@/lib/supabase/organizations'

const organizationSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio'),
  sender_email: z
    .string()
    .email('Email invalido')
    .or(z.literal(''))
    .transform((val) => val || null),
  sender_name: z
    .string()
    .transform((val) => val || null),
  website: z
    .string()
    .url('URL invalida')
    .or(z.literal(''))
    .transform((val) => val || null),
})

type OrganizationFormData = z.infer<typeof organizationSchema>

export function OrganizationForm() {
  const { currentOrg, refetch } = useOrganizationContext()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: currentOrg?.name || '',
      sender_email: currentOrg?.sender_email || '',
      sender_name: currentOrg?.sender_name || '',
      website: currentOrg?.website || '',
    },
  })

  async function onSubmit(data: OrganizationFormData) {
    if (!currentOrg) return

    setSaving(true)
    try {
      await updateOrganization(currentOrg.id, {
        name: data.name,
        sender_email: data.sender_email,
        sender_name: data.sender_name,
        website: data.website,
      })
      await refetch()
      toast({
        title: 'Organizacao atualizada',
        description: 'As alteracoes foram salvas com sucesso.',
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Ocorreu um erro ao salvar as alteracoes.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (!currentOrg) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados da Organizacao</CardTitle>
        <CardDescription>
          Informacoes basicas da sua empresa.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="Nome da empresa"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={currentOrg.slug}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O slug nao pode ser alterado.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                placeholder="https://exemplo.com"
                {...register('website')}
              />
              {errors.website && (
                <p className="text-sm text-destructive">{errors.website.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sender_email">Email de Envio</Label>
              <Input
                id="sender_email"
                placeholder="marketing@exemplo.com"
                {...register('sender_email')}
              />
              {errors.sender_email && (
                <p className="text-sm text-destructive">
                  {errors.sender_email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sender_name">Nome do Remetente</Label>
              <Input
                id="sender_name"
                placeholder="Equipe Marketing"
                {...register('sender_name')}
              />
              {errors.sender_name && (
                <p className="text-sm text-destructive">
                  {errors.sender_name.message}
                </p>
              )}
            </div>
          </div>

          <Separator />

          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alteracoes
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
