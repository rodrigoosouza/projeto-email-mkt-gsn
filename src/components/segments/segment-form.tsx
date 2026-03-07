'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { createSegment, updateSegment, evaluateSegmentRules } from '@/lib/supabase/segments'
import { RuleBuilder, type RuleInput } from '@/components/segments/rule-builder'
import type { Segment } from '@/lib/types'

const segmentSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio'),
  description: z.string().optional(),
  type: z.enum(['static', 'dynamic']),
  rules: z
    .array(
      z.object({
        field: z.string(),
        operator: z.string(),
        value: z.string().optional(),
      })
    )
    .optional(),
})

type SegmentFormValues = z.infer<typeof segmentSchema>

interface SegmentFormProps {
  segment?: Segment
}

export function SegmentForm({ segment }: SegmentFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { currentOrg } = useOrganizationContext()
  const isEdit = !!segment

  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [calculating, setCalculating] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SegmentFormValues>({
    resolver: zodResolver(segmentSchema),
    defaultValues: {
      name: segment?.name || '',
      description: segment?.description || '',
      type: segment?.type || 'static',
      rules: segment?.rules?.map((r) => ({
        field: r.field,
        operator: r.operator,
        value: r.value ?? '',
      })) || [{ field: 'email', operator: 'contains', value: '' }],
    },
  })

  const selectedType = watch('type')
  const currentRules = watch('rules')

  const handleCalculateLeads = async () => {
    if (!currentOrg || !currentRules || currentRules.length === 0) return

    setCalculating(true)
    try {
      const count = await evaluateSegmentRules(currentOrg.id, currentRules)
      setPreviewCount(count)
    } catch (error) {
      console.error('Erro ao calcular leads:', error)
      toast({
        title: 'Erro',
        description: 'Nao foi possivel calcular os leads.',
        variant: 'destructive',
      })
    } finally {
      setCalculating(false)
    }
  }

  const onSubmit = async (values: SegmentFormValues) => {
    if (!currentOrg) {
      toast({
        title: 'Erro',
        description: 'Nenhuma organizacao selecionada.',
        variant: 'destructive',
      })
      return
    }

    try {
      const payload = {
        name: values.name,
        description: values.description || undefined,
        type: values.type as 'static' | 'dynamic',
        rules: values.type === 'dynamic' ? values.rules : undefined,
      }

      if (isEdit && segment) {
        await updateSegment(segment.id, {
          name: payload.name,
          description: payload.description || null,
          type: payload.type as Segment['type'],
          rules: (payload.rules as Segment['rules']) || null,
        })
        toast({ title: 'Segmento atualizado', description: 'O segmento foi atualizado com sucesso.' })
        router.push(`/segments/${segment.id}`)
      } else {
        const created = await createSegment(currentOrg.id, payload)
        toast({ title: 'Segmento criado', description: 'O segmento foi criado com sucesso.' })
        router.push(`/segments/${created.id}`)
      }
    } catch (error) {
      console.error('Erro ao salvar segmento:', error)
      toast({
        title: 'Erro',
        description: 'Nao foi possivel salvar o segmento.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {isEdit ? 'Editar Segmento' : 'Novo Segmento'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Nome do segmento"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descricao</Label>
            <Textarea
              id="description"
              placeholder="Descricao opcional do segmento"
              rows={3}
              {...register('description')}
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => field.onChange('static')}
                    className={`flex-1 rounded-lg border-2 p-4 text-left transition-colors ${
                      field.value === 'static'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/25'
                    }`}
                  >
                    <div className="font-medium">Estatico</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Adicione leads manualmente ao segmento.
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange('dynamic')}
                    className={`flex-1 rounded-lg border-2 p-4 text-left transition-colors ${
                      field.value === 'dynamic'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/25'
                    }`}
                  >
                    <div className="font-medium">Dinamico</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Leads sao filtrados automaticamente por regras.
                    </div>
                  </button>
                </div>
              )}
            />
          </div>

          {selectedType === 'dynamic' && (
            <div className="space-y-3">
              <Label>Regras</Label>
              <Controller
                control={control}
                name="rules"
                render={({ field }) => (
                  <RuleBuilder
                    rules={(field.value as RuleInput[]) || []}
                    onChange={(newRules) => field.onChange(newRules)}
                  />
                )}
              />

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCalculateLeads}
                  disabled={calculating}
                >
                  <Users className="mr-2 h-4 w-4" />
                  {calculating ? 'Calculando...' : 'Calcular leads'}
                </Button>
                {previewCount !== null && (
                  <span className="text-sm text-muted-foreground">
                    {previewCount} {previewCount === 1 ? 'lead encontrado' : 'leads encontrados'}
                  </span>
                )}
              </div>
            </div>
          )}

          {selectedType === 'static' && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                Apos criar o segmento, voce podera adicionar leads manualmente.
              </p>
            </div>
          )}

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
                : isEdit
                  ? 'Salvar Alteracoes'
                  : 'Criar Segmento'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
