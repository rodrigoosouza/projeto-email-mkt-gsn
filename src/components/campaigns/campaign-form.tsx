'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { createCampaign } from '@/lib/supabase/campaigns'
import { queryTemplates } from '@/lib/supabase/templates'
import { querySegments } from '@/lib/supabase/segments'
import type { EmailTemplate, Segment } from '@/lib/types'

const campaignSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio'),
  template_id: z.string().min(1, 'Selecione um template'),
  segment_id: z.string().min(1, 'Selecione um segmento'),
  scheduled_for: z.string().optional(),
})

type CampaignFormValues = z.infer<typeof campaignSchema>

export function CampaignForm() {
  const router = useRouter()
  const { toast } = useToast()
  const { currentOrg } = useOrganizationContext()
  const { user } = useAuth()

  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      template_id: '',
      segment_id: '',
      scheduled_for: '',
    },
  })

  useEffect(() => {
    if (!currentOrg) return
    setLoadingData(true)
    Promise.all([
      queryTemplates(currentOrg.id, {}),
      querySegments(currentOrg.id, {}),
    ])
      .then(([templateRes, segmentRes]) => {
        setTemplates(templateRes.templates)
        setSegments(segmentRes.segments)
      })
      .catch((error) => {
        console.error('Erro ao carregar dados:', error)
        toast({
          title: 'Erro',
          description: 'Nao foi possivel carregar templates e segmentos.',
          variant: 'destructive',
        })
      })
      .finally(() => setLoadingData(false))
  }, [currentOrg, toast])

  const handleFormSubmit = async (values: CampaignFormValues) => {
    if (!currentOrg) {
      toast({
        title: 'Erro',
        description: 'Nenhuma organizacao selecionada.',
        variant: 'destructive',
      })
      return
    }

    if (!user) {
      toast({
        title: 'Erro',
        description: 'Usuario nao autenticado.',
        variant: 'destructive',
      })
      return
    }

    try {
      const campaign = await createCampaign(currentOrg.id, user.id, {
        name: values.name,
        template_id: values.template_id,
        segment_id: values.segment_id,
        scheduled_for: values.scheduled_for || undefined,
      })
      toast({
        title: 'Campanha criada',
        description: 'A campanha foi criada com sucesso.',
      })
      router.push(`/campaigns/${campaign.id}`)
    } catch (error) {
      console.error('Erro ao criar campanha:', error)
      toast({
        title: 'Erro',
        description: 'Nao foi possivel criar a campanha.',
        variant: 'destructive',
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informacoes da Campanha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Ex: Campanha de boas-vindas"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="template_id">
              Template <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="template_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={loadingData}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingData
                          ? 'Carregando templates...'
                          : 'Selecione um template'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.template_id && (
              <p className="text-sm text-destructive">
                {errors.template_id.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="segment_id">
              Segmento <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="segment_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={loadingData}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingData
                          ? 'Carregando segmentos...'
                          : 'Selecione um segmento'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {segments.map((segment) => (
                      <SelectItem key={segment.id} value={segment.id}>
                        {segment.name} ({segment.lead_count} leads)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.segment_id && (
              <p className="text-sm text-destructive">
                {errors.segment_id.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduled_for">Agendamento (opcional)</Label>
            <input
              id="scheduled_for"
              type="datetime-local"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              {...register('scheduled_for')}
            />
            <p className="text-xs text-muted-foreground">
              Se definido, a campanha sera agendada para envio na data e hora
              especificadas.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || loadingData}>
          {isSubmitting ? 'Criando...' : 'Criar Campanha'}
        </Button>
      </div>
    </form>
  )
}
