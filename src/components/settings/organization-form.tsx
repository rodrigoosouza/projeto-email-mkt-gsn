'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Upload, Trash2, Camera } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'

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
  const { user } = useAuth()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [logoUrl, setLogoUrl] = useState(currentOrg?.logo_url || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || '')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const handleUploadLogo = async (file: File) => {
    if (!currentOrg) return
    setUploadingLogo(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() || 'png'
      const path = `logos/${currentOrg.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('ad-creatives').upload(path, file, { contentType: file.type, upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('ad-creatives').getPublicUrl(path)
      setLogoUrl(urlData.publicUrl)
      await updateOrganization(currentOrg.id, { logo_url: urlData.publicUrl })
      await refetch()
      toast({ title: 'Logo atualizado' })
    } catch (err: any) {
      toast({ title: 'Erro ao enviar logo', description: err.message, variant: 'destructive' })
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleUploadAvatar = async (file: File) => {
    setUploadingAvatar(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() || 'png'
      const path = `avatars/${user?.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('ad-creatives').upload(path, file, { contentType: file.type, upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('ad-creatives').getPublicUrl(path)
      setAvatarUrl(urlData.publicUrl)
      await supabase.auth.updateUser({ data: { avatar_url: urlData.publicUrl } })
      toast({ title: 'Foto de perfil atualizada' })
    } catch (err: any) {
      toast({ title: 'Erro ao enviar foto', description: err.message, variant: 'destructive' })
    } finally {
      setUploadingAvatar(false)
    }
  }

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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Logo + Avatar uploads */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Logo da Org */}
            <div className="space-y-2">
              <Label>Logo da Organizacao</Label>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-16 w-16 rounded-lg object-contain bg-white border" />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                    {currentOrg?.name?.charAt(0) || 'O'}
                  </div>
                )}
                <div className="space-y-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingLogo}
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/*'
                      input.onchange = (e) => {
                        const f = (e.target as HTMLInputElement).files?.[0]
                        if (f) handleUploadLogo(f)
                      }
                      input.click()
                    }}
                  >
                    {uploadingLogo ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                    {logoUrl ? 'Trocar' : 'Enviar logo'}
                  </Button>
                  <p className="text-[10px] text-muted-foreground">PNG, SVG ou JPG. Aparece no sidebar.</p>
                </div>
              </div>
            </div>

            {/* Foto do Usuario */}
            <div className="space-y-2">
              <Label>Foto de Perfil</Label>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  {avatarUrl && <AvatarImage src={avatarUrl} />}
                  <AvatarFallback className="text-lg">{user?.email?.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingAvatar}
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/*'
                      input.onchange = (e) => {
                        const f = (e.target as HTMLInputElement).files?.[0]
                        if (f) handleUploadAvatar(f)
                      }
                      input.click()
                    }}
                  >
                    {uploadingAvatar ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Camera className="h-3 w-3 mr-1" />}
                    {avatarUrl ? 'Trocar foto' : 'Enviar foto'}
                  </Button>
                  <p className="text-[10px] text-muted-foreground">Aparece no header e sidebar.</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

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
