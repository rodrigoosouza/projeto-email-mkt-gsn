'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  getOrganizationMembers,
  removeMember,
  type OrganizationMemberWithUser,
} from '@/lib/supabase/organizations'
import { USER_ROLE_LABELS } from '@/lib/constants'

const ROLE_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  admin: 'default',
  editor: 'secondary',
  viewer: 'outline',
}

export function MembersList() {
  const { currentOrg, membership, isAdmin } = useOrganizationContext()
  const { toast } = useToast()
  const [members, setMembers] = useState<OrganizationMemberWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    if (!currentOrg) return

    try {
      const data = await getOrganizationMembers(currentOrg.id)
      setMembers(data)
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar membros',
        description: error.message || 'Nao foi possivel carregar a lista de membros.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [currentOrg, toast])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  async function handleRemoveMember(memberId: string) {
    setRemovingId(memberId)
    try {
      await removeMember(memberId)
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
      toast({
        title: 'Membro removido',
        description: 'O membro foi removido da organizacao.',
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao remover membro',
        description: error.message || 'Nao foi possivel remover o membro.',
        variant: 'destructive',
      })
    } finally {
      setRemovingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Carregando membros...
        </span>
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhum membro encontrado.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Funcao</TableHead>
          <TableHead className="w-[100px]">Acoes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => {
          const isSelf = member.id === membership?.id
          const canRemove = isAdmin && !isSelf

          return (
            <TableRow key={member.id}>
              <TableCell className="font-medium">
                {member.user?.name || '-'}
              </TableCell>
              <TableCell>{member.user?.email || '-'}</TableCell>
              <TableCell>
                <Badge variant={ROLE_BADGE_VARIANT[member.role] || 'outline'}>
                  {USER_ROLE_LABELS[member.role] || member.role}
                </Badge>
              </TableCell>
              <TableCell>
                {canRemove ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={removingId === member.id}
                      >
                        {removingId === member.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover membro</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover{' '}
                          <strong>{member.user?.name || member.user?.email}</strong>{' '}
                          da organizacao? Esta acao nao pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveMember(member.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : isSelf ? (
                  <span className="text-xs text-muted-foreground">Voce</span>
                ) : null}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
