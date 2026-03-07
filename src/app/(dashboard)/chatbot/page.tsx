'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Bot, Loader2, Trash2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { Badge } from '@/components/ui/badge'
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
import { getChatbotConfigs, deleteChatbotConfig } from '@/lib/supabase/chatbot'
import type { ChatbotConfig } from '@/lib/types'

export default function ChatbotPage() {
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()
  const orgId = currentOrg?.id

  const [chatbots, setChatbots] = useState<ChatbotConfig[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return
    loadChatbots()
  }, [orgId])

  async function loadChatbots() {
    if (!orgId) return
    setLoading(true)
    try {
      const result = await getChatbotConfigs(orgId)
      setChatbots(result)
    } catch (error) {
      console.error('Erro ao carregar chatbots:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteChatbotConfig(id)
      setChatbots((prev) => prev.filter((c) => c.id !== id))
      toast({
        title: 'Chatbot excluido',
        description: 'O chatbot foi excluido com sucesso.',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Nao foi possivel excluir o chatbot.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Chatbot</h2>
          <p className="text-muted-foreground">
            Configure chatbots inteligentes para seu site.
          </p>
        </div>
        <Button asChild>
          <Link href="/chatbot/new">
            <Plus className="mr-2 h-4 w-4" />
            Novo Chatbot
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seus Chatbots</CardTitle>
          <CardDescription>
            Chatbots configurados para atendimento automatizado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : chatbots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">Nenhum chatbot ainda</h3>
              <p className="text-muted-foreground mt-1 mb-4">
                Crie seu primeiro chatbot para atendimento automatizado.
              </p>
              <Button asChild>
                <Link href="/chatbot/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Chatbot
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>AI</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chatbots.map((chatbot) => (
                  <TableRow key={chatbot.id}>
                    <TableCell>
                      <Link
                        href={`/chatbot/${chatbot.id}`}
                        className="font-medium hover:underline"
                      >
                        {chatbot.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={chatbot.is_active ? 'default' : 'secondary'}
                      >
                        {chatbot.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={chatbot.ai_enabled ? 'default' : 'outline'}
                      >
                        {chatbot.ai_enabled ? 'Sim' : 'Nao'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild title="Ver detalhes">
                          <Link href={`/chatbot/${chatbot.id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Excluir chatbot
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o chatbot &quot;{chatbot.name}&quot;?
                                Esta acao nao pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(chatbot.id)}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
