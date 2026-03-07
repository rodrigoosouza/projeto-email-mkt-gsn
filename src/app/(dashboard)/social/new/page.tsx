'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, Plus, X, Hash, Calendar, Send } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
import { SOCIAL_PLATFORM_LABELS } from '@/lib/constants'
import {
  getSocialAccounts,
  getSocialPost,
  createSocialPost,
  updateSocialPost,
} from '@/lib/supabase/social'
import type { SocialAccount } from '@/lib/types'

export default function NewSocialPostPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const { currentOrg } = useOrganizationContext()
  const { user } = useAuth()
  const { toast } = useToast()

  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [accountId, setAccountId] = useState('')
  const [content, setContent] = useState('')
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [hashtagsInput, setHashtagsInput] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  const maxChars = 2200 // Instagram limit as default

  useEffect(() => {
    const load = async () => {
      if (!currentOrg) return
      setLoading(true)
      try {
        const accountsData = await getSocialAccounts(currentOrg.id)
        setAccounts(accountsData.filter((a) => a.is_active))

        if (editId) {
          const post = await getSocialPost(editId)
          setAccountId(post.account_id)
          setContent(post.content)
          setMediaUrls(post.media_urls || [])
          setHashtags(post.hashtags || [])
          setHashtagsInput((post.hashtags || []).join(', '))
          if (post.scheduled_for) {
            setScheduleEnabled(true)
            const d = new Date(post.scheduled_for)
            setScheduledDate(format(d, 'yyyy-MM-dd'))
            setScheduledTime(format(d, 'HH:mm'))
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currentOrg?.id, editId])

  const handleHashtagsChange = (value: string) => {
    setHashtagsInput(value)
    const tags = value
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .map((t) => (t.startsWith('#') ? t : `#${t}`))
    setHashtags(tags)
  }

  const addMediaUrl = () => {
    setMediaUrls((prev) => [...prev, ''])
  }

  const updateMediaUrl = (index: number, value: string) => {
    setMediaUrls((prev) => prev.map((url, i) => (i === index ? value : url)))
  }

  const removeMediaUrl = (index: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async (status: 'draft' | 'scheduled' | 'published') => {
    if (!currentOrg || !user || !accountId) return

    if (status === 'scheduled' && (!scheduledDate || !scheduledTime)) {
      toast({
        title: 'Selecione data e hora para agendar',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const scheduledFor =
        status === 'scheduled' && scheduledDate && scheduledTime
          ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
          : null

      const filteredMediaUrls = mediaUrls.filter((url) => url.trim() !== '')

      if (editId) {
        await updateSocialPost(editId, {
          account_id: accountId,
          content,
          media_urls: filteredMediaUrls,
          hashtags,
          status,
          scheduled_for: scheduledFor,
          published_at: status === 'published' ? new Date().toISOString() : null,
        })
        toast({ title: 'Post atualizado com sucesso' })
      } else {
        await createSocialPost({
          org_id: currentOrg.id,
          account_id: accountId,
          content,
          media_urls: filteredMediaUrls,
          hashtags,
          status,
          scheduled_for: scheduledFor,
          created_by: user.id,
        })
        toast({
          title:
            status === 'draft'
              ? 'Rascunho salvo'
              : status === 'scheduled'
                ? 'Post agendado'
                : 'Post publicado',
        })
      }

      router.push('/social')
    } catch (error) {
      toast({ title: 'Erro ao salvar post', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const selectedAccount = accounts.find((a) => a.id === accountId)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {editId ? 'Editar Post' : 'Novo Post'}
          </h2>
          <p className="text-muted-foreground">
            {editId
              ? 'Edite o conteudo do post.'
              : 'Crie e agende uma publicacao nas redes sociais.'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conteudo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Account select */}
              <div className="space-y-2">
                <Label>Conta</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_name} (
                        {SOCIAL_PLATFORM_LABELS[account.platform]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {accounts.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma conta conectada. Adicione uma na aba Contas.
                  </p>
                )}
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label>Texto</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escreva o conteudo do seu post..."
                  rows={6}
                  maxLength={maxChars}
                />
                <div className="flex justify-end">
                  <span
                    className={`text-xs ${
                      content.length > maxChars * 0.9
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {content.length}/{maxChars}
                  </span>
                </div>
              </div>

              {/* Media URLs */}
              <div className="space-y-2">
                <Label>URLs de Midia</Label>
                {mediaUrls.map((url, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={url}
                      onChange={(e) => updateMediaUrl(index, e.target.value)}
                      placeholder="https://exemplo.com/imagem.jpg"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMediaUrl(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addMediaUrl}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar URL
                </Button>
              </div>

              {/* Hashtags */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Hash className="h-4 w-4" />
                  Hashtags
                </Label>
                <Input
                  value={hashtagsInput}
                  onChange={(e) => handleHashtagsChange(e.target.value)}
                  placeholder="marketing, socialmedia, dicas"
                />
                {hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {hashtags.map((tag, i) => (
                      <Badge key={i} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Agendamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Switch
                  checked={scheduleEnabled}
                  onCheckedChange={setScheduleEnabled}
                />
                <Label>Agendar publicacao</Label>
              </div>
              {scheduleEnabled && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora</Label>
                    <Input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => handleSave('draft')}
              disabled={saving || !accountId || !content}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Rascunho
            </Button>
            {scheduleEnabled ? (
              <Button
                onClick={() => handleSave('scheduled')}
                disabled={
                  saving ||
                  !accountId ||
                  !content ||
                  !scheduledDate ||
                  !scheduledTime
                }
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Calendar className="mr-2 h-4 w-4" />
                Agendar
              </Button>
            ) : (
              <Button
                onClick={() => handleSave('published')}
                disabled={saving || !accountId || !content}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" />
                Publicar Agora
              </Button>
            )}
          </div>
        </div>

        {/* Preview */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Pre-visualizacao</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 space-y-3">
                {/* Account info */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-bold">
                      {selectedAccount?.account_name?.charAt(0)?.toUpperCase() ||
                        '?'}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">
                      {selectedAccount?.account_name || 'Selecione uma conta'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedAccount
                        ? SOCIAL_PLATFORM_LABELS[selectedAccount.platform]
                        : ''}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <p className="text-sm whitespace-pre-wrap">
                  {content || 'Seu conteudo aparecera aqui...'}
                </p>

                {/* Hashtags */}
                {hashtags.length > 0 && (
                  <p className="text-sm text-blue-600">
                    {hashtags.join(' ')}
                  </p>
                )}

                {/* Media */}
                {mediaUrls.filter((u) => u.trim()).length > 0 && (
                  <div className="grid gap-2 grid-cols-2">
                    {mediaUrls
                      .filter((u) => u.trim())
                      .map((url, i) => (
                        <div
                          key={i}
                          className="bg-muted rounded-lg h-32 flex items-center justify-center text-xs text-muted-foreground overflow-hidden"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Media ${i + 1}`}
                            className="object-cover w-full h-full"
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).style.display =
                                'none'
                            }}
                          />
                        </div>
                      ))}
                  </div>
                )}

                {/* Schedule info */}
                {scheduleEnabled && scheduledDate && scheduledTime && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-2">
                    <Calendar className="h-3 w-3" />
                    Agendado para{' '}
                    {format(
                      new Date(`${scheduledDate}T${scheduledTime}`),
                      "dd/MM/yyyy 'as' HH:mm",
                      { locale: ptBR }
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
