'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Plus,
  Pencil,
  Trash2,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Video,
  Loader2,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import {
  SOCIAL_PLATFORM_LABELS,
  SOCIAL_POST_STATUS_LABELS,
  SOCIAL_POST_STATUS_COLORS,
} from '@/lib/constants'
import {
  getSocialAccounts,
  getSocialPosts,
  createSocialAccount,
  updateSocialAccount,
  deleteSocialAccount,
  deleteSocialPost,
} from '@/lib/supabase/social'
import type { SocialAccount, SocialPost } from '@/lib/types'

const PLATFORM_ICONS: Record<string, any> = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  twitter: Twitter,
  tiktok: Video,
}

export default function SocialPage() {
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()

  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [addAccountOpen, setAddAccountOpen] = useState(false)
  const [newAccount, setNewAccount] = useState({
    platform: '',
    account_name: '',
    access_token: '',
  })
  const [savingAccount, setSavingAccount] = useState(false)

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const fetchData = async () => {
    if (!currentOrg) return
    setLoading(true)
    try {
      const [accountsData, postsData] = await Promise.all([
        getSocialAccounts(currentOrg.id),
        getSocialPosts(currentOrg.id),
      ])
      setAccounts(accountsData)
      setPosts(postsData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [currentOrg?.id])

  const handleAddAccount = async () => {
    if (!currentOrg || !newAccount.platform || !newAccount.account_name) return
    setSavingAccount(true)
    try {
      await createSocialAccount({
        org_id: currentOrg.id,
        platform: newAccount.platform,
        account_name: newAccount.account_name,
        access_token: newAccount.access_token || null,
        is_active: true,
      })
      toast({ title: 'Conta adicionada com sucesso' })
      setAddAccountOpen(false)
      setNewAccount({ platform: '', account_name: '', access_token: '' })
      fetchData()
    } catch (error) {
      toast({ title: 'Erro ao adicionar conta', variant: 'destructive' })
    } finally {
      setSavingAccount(false)
    }
  }

  const handleToggleAccount = async (account: SocialAccount) => {
    try {
      await updateSocialAccount(account.id, { is_active: !account.is_active })
      toast({
        title: account.is_active ? 'Conta desconectada' : 'Conta conectada',
      })
      fetchData()
    } catch (error) {
      toast({ title: 'Erro ao atualizar conta', variant: 'destructive' })
    }
  }

  const handleDeleteAccount = async (id: string) => {
    try {
      await deleteSocialAccount(id)
      toast({ title: 'Conta removida com sucesso' })
      fetchData()
    } catch (error) {
      toast({ title: 'Erro ao remover conta', variant: 'destructive' })
    }
  }

  const handleDeletePost = async (id: string) => {
    try {
      await deleteSocialPost(id)
      toast({ title: 'Post removido com sucesso' })
      fetchData()
    } catch (error) {
      toast({ title: 'Erro ao remover post', variant: 'destructive' })
    }
  }

  // Calendar helpers
  const calendarDays = useMemo(() => {
    const start = startOfMonth(calendarMonth)
    const end = endOfMonth(calendarMonth)
    return eachDayOfInterval({ start, end })
  }, [calendarMonth])

  const scheduledPostsByDate = useMemo(() => {
    const map: Record<string, SocialPost[]> = {}
    posts.forEach((post) => {
      if (post.scheduled_for) {
        const key = format(new Date(post.scheduled_for), 'yyyy-MM-dd')
        if (!map[key]) map[key] = []
        map[key].push(post)
      }
    })
    return map
  }, [posts])

  const selectedDatePosts = useMemo(() => {
    if (!selectedDate) return []
    const key = format(selectedDate, 'yyyy-MM-dd')
    return scheduledPostsByDate[key] || []
  }, [selectedDate, scheduledPostsByDate])

  const firstDayOffset = getDay(startOfMonth(calendarMonth))

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Redes Sociais</h2>
          <p className="text-muted-foreground">
            Gerencie suas contas e agende publicacoes.
          </p>
        </div>
        <Button asChild>
          <Link href="/social/new">
            <Plus className="mr-2 h-4 w-4" />
            Novo Post
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="accounts">Contas</TabsTrigger>
          <TabsTrigger value="calendar">Calendario</TabsTrigger>
        </TabsList>

        {/* POSTS TAB */}
        <TabsContent value="posts" className="space-y-4">
          {posts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">
                  Nenhum post criado ainda.
                </p>
                <Button asChild>
                  <Link href="/social/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Primeiro Post
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Conteudo</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Agendado Para</TableHead>
                    <TableHead>Publicado Em</TableHead>
                    <TableHead className="w-[100px]">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => {
                    const PlatformIcon =
                      PLATFORM_ICONS[post.account?.platform || ''] || Video
                    return (
                      <TableRow key={post.id}>
                        <TableCell className="max-w-[300px]">
                          <span className="truncate block">
                            {post.content.substring(0, 50)}
                            {post.content.length > 50 ? '...' : ''}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <PlatformIcon className="h-4 w-4" />
                            <span>{post.account?.account_name || '-'}</span>
                            <Badge variant="outline" className="text-xs">
                              {SOCIAL_PLATFORM_LABELS[
                                post.account?.platform || ''
                              ] || post.account?.platform}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              SOCIAL_POST_STATUS_COLORS[post.status] || ''
                            }
                            variant="secondary"
                          >
                            {SOCIAL_POST_STATUS_LABELS[post.status] ||
                              post.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {post.scheduled_for
                            ? format(
                                new Date(post.scheduled_for),
                                "dd/MM/yyyy 'as' HH:mm",
                                { locale: ptBR }
                              )
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {post.published_at
                            ? format(
                                new Date(post.published_at),
                                "dd/MM/yyyy 'as' HH:mm",
                                { locale: ptBR }
                              )
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/social/new?edit=${post.id}`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Remover post?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acao nao pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeletePost(post.id)}
                                  >
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ACCOUNTS TAB */}
        <TabsContent value="accounts" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={addAccountOpen} onOpenChange={setAddAccountOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Conta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Conta Social</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Plataforma</Label>
                    <Select
                      value={newAccount.platform}
                      onValueChange={(val) =>
                        setNewAccount((prev) => ({ ...prev, platform: val }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a plataforma" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SOCIAL_PLATFORM_LABELS).map(
                          ([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nome da Conta</Label>
                    <Input
                      value={newAccount.account_name}
                      onChange={(e) =>
                        setNewAccount((prev) => ({
                          ...prev,
                          account_name: e.target.value,
                        }))
                      }
                      placeholder="@minha_conta"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Token de Acesso (opcional)</Label>
                    <Input
                      value={newAccount.access_token}
                      onChange={(e) =>
                        setNewAccount((prev) => ({
                          ...prev,
                          access_token: e.target.value,
                        }))
                      }
                      placeholder="Token para publicacao automatica"
                      type="password"
                    />
                  </div>
                  <Button
                    onClick={handleAddAccount}
                    disabled={
                      savingAccount ||
                      !newAccount.platform ||
                      !newAccount.account_name
                    }
                    className="w-full"
                  >
                    {savingAccount && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Adicionar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {accounts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">
                  Nenhuma conta conectada ainda.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {accounts.map((account) => {
                const PlatformIcon =
                  PLATFORM_ICONS[account.platform] || Video
                return (
                  <Card key={account.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <PlatformIcon className="h-5 w-5" />
                        {SOCIAL_PLATFORM_LABELS[account.platform] ||
                          account.platform}
                      </CardTitle>
                      <Badge
                        variant={account.is_active ? 'default' : 'secondary'}
                      >
                        {account.is_active ? (
                          <span className="flex items-center gap-1">
                            <Wifi className="h-3 w-3" /> Conectada
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <WifiOff className="h-3 w-3" /> Desconectada
                          </span>
                        )}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold">
                        {account.account_name}
                      </p>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleAccount(account)}
                        >
                          {account.is_active ? 'Desconectar' : 'Conectar'}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Remover conta?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Todos os posts vinculados a esta conta serao
                                removidos.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleDeleteAccount(account.id)
                                }
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* CALENDAR TAB */}
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setCalendarMonth((m) => subMonths(m, 1))
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle>
                  {format(calendarMonth, 'MMMM yyyy', { locale: ptBR })}
                </CardTitle>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setCalendarMonth((m) => addMonths(m, 1))
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(
                  (day) => (
                    <div
                      key={day}
                      className="text-center text-sm font-medium text-muted-foreground py-2"
                    >
                      {day}
                    </div>
                  )
                )}
                {/* Empty cells for offset */}
                {Array.from({ length: firstDayOffset }).map((_, i) => (
                  <div key={`empty-${i}`} className="p-2" />
                ))}
                {calendarDays.map((day) => {
                  const key = format(day, 'yyyy-MM-dd')
                  const dayPosts = scheduledPostsByDate[key] || []
                  const isSelected =
                    selectedDate && isSameDay(day, selectedDate)
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDate(day)}
                      className={`p-2 text-center rounded-md hover:bg-accent transition-colors min-h-[60px] ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : ''
                      }`}
                    >
                      <span className="text-sm">{format(day, 'd')}</span>
                      {dayPosts.length > 0 && (
                        <div className="flex justify-center gap-0.5 mt-1 flex-wrap">
                          {dayPosts.slice(0, 3).map((p) => (
                            <span
                              key={p.id}
                              className={`w-2 h-2 rounded-full ${
                                p.status === 'published'
                                  ? 'bg-green-500'
                                  : p.status === 'scheduled'
                                    ? 'bg-blue-500'
                                    : 'bg-gray-400'
                              }`}
                            />
                          ))}
                          {dayPosts.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{dayPosts.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Posts for selected date */}
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Posts em {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDatePosts.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Nenhum post agendado para este dia.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedDatePosts.map((post) => (
                      <div
                        key={post.id}
                        className="flex items-center justify-between border rounded-lg p-3"
                      >
                        <div className="flex-1">
                          <p className="text-sm">
                            {post.content.substring(0, 80)}
                            {post.content.length > 80 ? '...' : ''}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {SOCIAL_PLATFORM_LABELS[
                                post.account?.platform || ''
                              ] || ''}
                            </Badge>
                            <Badge
                              className={
                                SOCIAL_POST_STATUS_COLORS[post.status] || ''
                              }
                              variant="secondary"
                            >
                              {SOCIAL_POST_STATUS_LABELS[post.status]}
                            </Badge>
                            {post.scheduled_for && (
                              <span className="text-xs text-muted-foreground">
                                {format(
                                  new Date(post.scheduled_for),
                                  'HH:mm'
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/social/new?edit=${post.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
