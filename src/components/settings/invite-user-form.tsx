'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Mail, Send, Trash2, X } from 'lucide-react'

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

export function InviteUserForm() {
  const { currentOrg, isAdmin } = useOrganizationContext()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('editor')
  const [sending, setSending] = useState(false)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loadingInvitations, setLoadingInvitations] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

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

    // Basic email validation
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
        <CardTitle>Convidar Membro</CardTitle>
        <CardDescription>
          Envie convites para novos membros da organizacao.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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

        {/* Pending invitations list */}
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
