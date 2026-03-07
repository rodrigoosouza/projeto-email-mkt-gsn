'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { createLead } from '@/lib/supabase/leads'
import { getCustomFieldDefinitions } from '@/lib/supabase/custom-fields'
import type { CustomFieldDefinition } from '@/lib/types'

const leadFormSchema = z.object({
  email: z.string().email('Email invalido').min(1, 'Email e obrigatorio'),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  position: z.string().optional(),
  score: z.coerce.number().min(0, 'Minimo 0').max(100, 'Maximo 100').optional(),
})

type LeadFormValues = z.infer<typeof leadFormSchema>

interface LeadFormProps {
  mode?: 'create' | 'edit'
  defaultValues?: Partial<LeadFormValues>
  onSubmit?: (values: LeadFormValues) => Promise<void>
}

export function LeadForm({ mode = 'create', defaultValues, onSubmit }: LeadFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { currentOrg } = useOrganizationContext()
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDefinition[]>([])
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({})

  useEffect(() => {
    if (currentOrg) {
      getCustomFieldDefinitions(currentOrg.id)
        .then(setCustomFieldDefs)
        .catch((err) => console.error('Erro ao carregar campos personalizados:', err))
    }
  }, [currentOrg])

  const updateCustomField = (name: string, value: any) => {
    setCustomFieldValues((prev) => ({ ...prev, [name]: value }))
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      email: '',
      first_name: '',
      last_name: '',
      phone: '',
      company: '',
      position: '',
      score: 0,
      ...defaultValues,
    },
  })

  const handleFormSubmit = async (values: LeadFormValues) => {
    if (onSubmit) {
      await onSubmit(values)
      return
    }

    if (!currentOrg) {
      toast({
        title: 'Erro',
        description: 'Nenhuma organizacao selecionada.',
        variant: 'destructive',
      })
      return
    }

    try {
      // Filter out empty custom field values
      const filteredCustomFields: Record<string, any> = {}
      for (const [key, val] of Object.entries(customFieldValues)) {
        if (val !== '' && val !== undefined && val !== null) {
          filteredCustomFields[key] = val
        }
      }

      await createLead(currentOrg.id, {
        email: values.email,
        first_name: values.first_name || undefined,
        last_name: values.last_name || undefined,
        phone: values.phone || undefined,
        company: values.company || undefined,
        position: values.position || undefined,
        score: values.score || 0,
        source: 'manual',
        custom_fields: Object.keys(filteredCustomFields).length > 0 ? filteredCustomFields : undefined,
      })
      toast({ title: 'Lead criado', description: 'O lead foi criado com sucesso.' })
      router.push('/leads')
    } catch (error) {
      console.error('Erro ao criar lead:', error)
      toast({
        title: 'Erro',
        description: 'Nao foi possivel criar o lead. Verifique se o email ja esta cadastrado.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {mode === 'create' ? 'Novo Lead' : 'Editar Lead'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="first_name">Nome</Label>
              <Input id="first_name" placeholder="Nome" {...register('first_name')} />
              {errors.first_name && (
                <p className="text-sm text-destructive">{errors.first_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Sobrenome</Label>
              <Input id="last_name" placeholder="Sobrenome" {...register('last_name')} />
              {errors.last_name && (
                <p className="text-sm text-destructive">{errors.last_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" placeholder="(11) 99999-9999" {...register('phone')} />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Empresa</Label>
              <Input id="company" placeholder="Nome da empresa" {...register('company')} />
              {errors.company && (
                <p className="text-sm text-destructive">{errors.company.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Cargo</Label>
              <Input id="position" placeholder="Cargo" {...register('position')} />
              {errors.position && (
                <p className="text-sm text-destructive">{errors.position.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="score">Score (0-100)</Label>
              <Input
                id="score"
                type="number"
                min={0}
                max={100}
                placeholder="0"
                {...register('score')}
              />
              {errors.score && (
                <p className="text-sm text-destructive">{errors.score.message}</p>
              )}
            </div>

            {/* Custom Fields */}
            {customFieldDefs.length > 0 && (
              <>
                <div className="col-span-1 md:col-span-2 pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground">Campos Personalizados</p>
                </div>
                {customFieldDefs.map((def) => {
                  const value = customFieldValues[def.name] ?? ''
                  return (
                    <div key={def.id} className="space-y-2">
                      {def.field_type !== 'boolean' && (
                        <Label htmlFor={`cf_${def.name}`}>
                          {def.label}
                          {def.required && <span className="text-destructive"> *</span>}
                        </Label>
                      )}
                      {def.field_type === 'select' ? (
                        <Select
                          value={value || ''}
                          onValueChange={(v) => updateCustomField(def.name, v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(def.options || []).map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : def.field_type === 'boolean' ? (
                        <div className="flex items-center gap-2 pt-2">
                          <Checkbox
                            id={`cf_${def.name}`}
                            checked={!!value}
                            onCheckedChange={(checked) => updateCustomField(def.name, !!checked)}
                          />
                          <Label htmlFor={`cf_${def.name}`} className="text-sm font-normal">
                            {def.label}
                            {def.required && <span className="text-destructive"> *</span>}
                          </Label>
                        </div>
                      ) : (
                        <Input
                          id={`cf_${def.name}`}
                          type={
                            def.field_type === 'number'
                              ? 'number'
                              : def.field_type === 'date'
                                ? 'date'
                                : def.field_type === 'email'
                                  ? 'email'
                                  : def.field_type === 'url'
                                    ? 'url'
                                    : 'text'
                          }
                          value={value}
                          onChange={(e) =>
                            updateCustomField(
                              def.name,
                              def.field_type === 'number' && e.target.value
                                ? Number(e.target.value)
                                : e.target.value
                            )
                          }
                          placeholder={def.label}
                        />
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Salvando...'
                : mode === 'create'
                  ? 'Criar Lead'
                  : 'Salvar Alteracoes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
