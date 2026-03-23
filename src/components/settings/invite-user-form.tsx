'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, Eye, EyeOff, Loader2, Mail, RefreshCw, Send, Trash2, UserPlus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import {
  inviteUser,
  getInvitations,
  cancelInvitation,
} from '@/lib/supabase/invitations'
import { USER_ROLE_LABELS } from '@/lib/constants'
import type { Invitation } from '@/lib/types'

const ROLE_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  admin: 'default',
  editor: 'secondary',
  viewer: 'outline',
}

function generatePassword(length = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const digits = '0123456789'
  const symbols = '!@#$%&*'
  const allChars = uppercase + lowercase + digits + symbols

  // Ensure at least one of each type
  let password =
    uppercase[Math.floor(Math.random() * uppercase.length)] +
    lowercase[Math.floor(Math.random() * lowercase.length)] +
    digits[Math.floor(Math.random() * digits.length)] +
    symbols[Math.floor(Math.random() * symbols.length)]

  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  // Shuffle
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('')
}

export function InviteUserForm() {
  const { currentOrg, isAdmin } = useOrganizationContext()
  const { toast } = useToast()

  // Invite tab state
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('editor')
  const [sending, setSending] = useState(false)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loadingInvitations, setLoadingInvitations] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  // Create member tab state
  const [createEmail, setCreateEmail] = useState('')
  const [createFirstName, setCreateFirstName] = useState('')
  const [createLastName, setCreateLastName] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createRole, setCreateRole] = useState('editor')
  const [creating, setCreating] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string
    password: string
    name: string
  } | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const fetchInvitations = useCallback(async () => {
    if (!currentOrg) return

    try {
      const data = await getInvitations(currentOrg.id)
      setInvitations(data)
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar convites',
        description: error.message || 'Nao foi possivel carregar os convites.',
        variant: 'destructive',
      })
    } finally {
      setLoadingInvitations(false)
    }
  }, [currentOrg, toast])

  useEffect(() => {
    fetchInvitations()
  }, [fetchInvitations])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()

    if (!currentOrg || !email.trim()) return

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      toast({
        title: 'Email invalido',
        description: 'Por favor, insira um email valido.',
        variant: 'destructive',
      })
      return
    }

    setSending(true)
    try {
      await inviteUser(currentOrg.id, email.trim().toLowerCase(), role)
      setEmail('')
      setRole('editor')
      await fetchInvitations()
      toast({
        title: 'Convite enviado',
        description: `Convite enviado para ${email.trim()}.`,
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar convite',
        description: error.message || 'Nao foi possivel enviar o convite.',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  async function handleCreateMember(e: React.FormEvent) {
    e.preventDefault()

    if (!currentOrg || !createEmail.trim() || !createPassword) return

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(createEmail.trim())) {
      toast({
        title: 'Email invalido',
        description: 'Por favor, insira um email valido.',
        variant: 'destructive',
      })
      return
    }

    if (createPassword.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      })
      return
    }

    setCreating(true)
    setCreatedCredentials(null)

    try {
      const res = await fetch('/api/members/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createEmail.trim().toLowerCase(),
          firstName: createFirstName.trim(),
          lastName: createLastName.trim(),
          password: createPassword,
          role: createRole,
          orgId: currentOrg.id,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar membro.')
      }

      const fullName = [createFirstName.trim(), createLastName.trim()]
        .filter(Boolean)
        .join(' ')

      setCreatedCredentials({
        email: createEmail.trim().toLowerCase(),
        password: createPassword,
        name: fullName || createEmail.trim(),
      })

      toast({
        title: 'Membro criado com sucesso',
        description: `${fullName || createEmail.trim()} foi adicionado a organizacao.`,
      })

      // Reset form fields but keep credentials visible
      setCreateEmail('')
      setCreateFirstName('')
      setCreateLastName('')
      setCreatePassword('')
      setCreateRole('editor')
    } catch (error: any) {
      toast({
        title: 'Erro ao criar membro',
        description: error.message || 'Nao foi possivel criar o membro.',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  async function handleCancelInvitation(id: string) {
    setCancellingId(id)
    try {
      await cancelInvitation(id)
      setInvitations((prev) => prev.filter((inv) => inv.id !== id))
      toast({
        title: 'Convite cancelado',
        description: 'O convite foi cancelado com sucesso.',
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao cancelar convite',
        description: error.message || 'Nao foi possivel cancelar o convite.',
        variant: 'destructive',
      })
    } finally {
      setCancellingId(null)
    }
  }

  function handleGeneratePassword() {
    const newPassword = generatePassword()
    setCreatePassword(newPassword)
    setShowPassword(true)
  }

  async function handleCopy(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      toast({
        title: 'Erro ao copiar',
        description: 'Nao foi possivel copiar para a area de transferencia.',
        variant: 'destructive',
      })
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  if (!isAdmin) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adicionar Membro</CardTitle>
        <CardDescription>
          Convide membros existentes ou crie novos usuarios para a organizacao.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="invite" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invite" className="gap-2">
              <Send className="h-4 w-4" />
              Convidar Membro
            </TabsTrigger>
            <TabsTrigger value="create" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Criar Membro
            </TabsTrigger>
          </TabsList>

          {/* Invite tab - existing functionality */}
          <TabsContent value="invite" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Envie um convite por email para um usuario existente ou novo.
            </p>
            <form onSubmit={handleInvite} className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="usuario@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={sending}
                />
              </div>
              <div className="w-48 space-y-2">
                <Label htmlFor="invite-role">Funcao</Label>
                <Select value={role} onValueChange={setRole} disabled={sending}>
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={sending || !email.trim()}>
                {sending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Enviar Convite
              </Button>
            </form>
          </TabsContent>

          {/* Create member tab - new functionality */}
          <TabsContent value="create" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Crie um usuario com email e senha temporaria. Compartilhe as credenciais com o novo membro.
            </p>

            {createdCredentials && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                <div className="mb-3 flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <h4 className="font-semibold text-green-800 dark:text-green-200">
                    Membro criado com sucesso!
                  </h4>
                </div>
                <p className="mb-3 text-sm text-green-700 dark:text-green-300">
                  Compartilhe as credenciais abaixo com <strong>{createdCredentials.name}</strong>. A senha temporaria deve ser alterada no primeiro acesso.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-md bg-white p-2 dark:bg-gray-900">
                    <span className="text-sm font-medium text-muted-foreground w-16">Email:</span>
                    <code className="flex-1 text-sm">{createdCredentials.email}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleCopy(createdCredentials.email, 'email')}
                    >
                      {copiedField === 'email' ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-white p-2 dark:bg-gray-900">
                    <span className="text-sm font-medium text-muted-foreground w-16">Senha:</span>
                    <code className="flex-1 text-sm font-bold">{createdCredentials.password}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleCopy(createdCredentials.password, 'password')}
                    >
                      {copiedField === 'password' ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setCreatedCredentials(null)}
                >
                  <X className="mr-2 h-3.5 w-3.5" />
                  Fechar
                </Button>
              </div>
            )}

            <form onSubmit={handleCreateMember} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="create-email">Email *</Label>
                  <Input
                    id="create-email"
                    type="email"
                    placeholder="usuario@exemplo.com"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    disabled={creating}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-role">Funcao *</Label>
                  <Select
                    value={createRole}
                    onValueChange={setCreateRole}
                    disabled={creating}
                  >
                    <SelectTrigger id="create-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Visualizador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="create-first-name">Nome</Label>
                  <Input
                    id="create-first-name"
                    type="text"
                    placeholder="Nome"
                    value={createFirstName}
                    onChange={(e) => setCreateFirstName(e.target.value)}
                    disabled={creating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-last-name">Sobrenome</Label>
                  <Input
                    id="create-last-name"
                    type="text"
                    placeholder="Sobrenome"
                    value={createLastName}
                    onChange={(e) => setCreateLastName(e.target.value)}
                    disabled={creating}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-password">Senha temporaria *</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="create-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimo 6 caracteres"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      disabled={creating}
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full w-10"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGeneratePassword}
                    disabled={creating}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Gerar senha
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={creating || !createEmail.trim() || !createPassword}
              >
                {creating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                Criar Membro
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Pending invitations list - always visible */}
        {loadingInvitations ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              Carregando convites...
            </span>
          </div>
        ) : invitations.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Convites pendentes ({invitations.length})
            </h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Funcao</TableHead>
                  <TableHead>Enviado em</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead className="w-[80px]">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {invitation.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          ROLE_BADGE_VARIANT[invitation.role] || 'outline'
                        }
                      >
                        {USER_ROLE_LABELS[invitation.role] || invitation.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(invitation.created_at)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(invitation.expires_at)}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={cancellingId === invitation.id}
                          >
                            {cancellingId === invitation.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Cancelar convite
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja cancelar o convite para{' '}
                              <strong>{invitation.email}</strong>? O link de
                              convite deixara de funcionar.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Manter</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleCancelInvitation(invitation.id)
                              }
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Cancelar Convite
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
