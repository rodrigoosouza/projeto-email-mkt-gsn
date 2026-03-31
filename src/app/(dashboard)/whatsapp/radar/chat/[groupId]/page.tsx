// @ts-nocheck
'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  Send,
  Users,
  ChevronUp,
  MessageCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ChatMessage {
  id: string
  sender_jid: string
  sender_name: string
  message_text: string
  timestamp: string
  is_from_me: boolean
  matched_keyword?: string | null
}

interface GroupInfo {
  group_jid: string
  group_name: string
  participant_count: number
}

export default function GroupChatPage() {
  const params = useParams()
  const router = useRouter()
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()
  const orgId = currentOrg?.id
  const groupId = decodeURIComponent(params.groupId as string)

  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [initialLoad, setInitialLoad] = useState(true)

  // Fetch group info
  const fetchGroupInfo = useCallback(async () => {
    if (!orgId || !groupId) return
    try {
      const res = await fetch(`/api/whatsapp-radar/groups/${encodeURIComponent(groupId)}?orgId=${orgId}`)
      if (res.ok) {
        const data = await res.json()
        setGroupInfo(data.group)
      }
    } catch (err) {
      console.error('Erro ao carregar info do grupo:', err)
    }
  }, [orgId, groupId])

  // Fetch messages
  const fetchMessages = useCallback(async (before?: string) => {
    if (!orgId || !groupId) return
    if (before) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    try {
      const params = new URLSearchParams({ orgId, groupJid: groupId })
      if (before) params.set('before', before)

      const res = await fetch(`/api/whatsapp-radar/messages?${params}`)
      if (res.ok) {
        const data = await res.json()
        const newMessages = data.messages || []

        if (before) {
          setMessages((prev) => [...newMessages, ...prev])
        } else {
          setMessages(newMessages)
        }

        setHasMore(newMessages.length >= 50)
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [orgId, groupId])

  useEffect(() => {
    if (orgId && groupId) {
      fetchGroupInfo()
      fetchMessages()
    }
  }, [orgId, groupId, fetchGroupInfo, fetchMessages])

  // Auto-scroll on initial load
  useEffect(() => {
    if (initialLoad && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
      setInitialLoad(false)
    }
  }, [messages, initialLoad])

  // Load more messages
  const handleLoadMore = () => {
    if (messages.length > 0 && hasMore) {
      fetchMessages(messages[0].timestamp)
    }
  }

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || !orgId || !groupId) return
    setSending(true)
    try {
      const res = await fetch('/api/whatsapp-radar/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          groupJid: groupId,
          message: newMessage.trim(),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.message) {
          setMessages((prev) => [...prev, data.message])
        }
        setNewMessage('')
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      } else {
        toast({ title: 'Erro', description: 'Nao foi possivel enviar a mensagem.', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao enviar mensagem.', variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  // Handle Enter to send (Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Format timestamp
  const formatTime = (ts: string) => {
    try {
      return format(new Date(ts), 'HH:mm', { locale: ptBR })
    } catch {
      return ''
    }
  }

  const formatDate = (ts: string) => {
    try {
      return format(new Date(ts), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    } catch {
      return ''
    }
  }

  // Group messages by date
  const groupedMessages: { date: string; messages: ChatMessage[] }[] = []
  let currentDate = ''
  for (const msg of messages) {
    const msgDate = formatDate(msg.timestamp)
    if (msgDate !== currentDate) {
      currentDate = msgDate
      groupedMessages.push({ date: msgDate, messages: [msg] })
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg)
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-card px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/whatsapp/radar')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
          <MessageCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">{groupInfo?.group_name || 'Carregando...'}</h2>
          {groupInfo && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {groupInfo.participant_count} participantes
            </p>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto bg-muted/30 px-4 py-4"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">Nenhuma mensagem</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              As mensagens do grupo aparecerao aqui quando forem sincronizadas.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center pb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronUp className="mr-2 h-4 w-4" />
                  )}
                  Carregar mensagens anteriores
                </Button>
              </div>
            )}

            {/* Messages grouped by date */}
            {groupedMessages.map((group) => (
              <div key={group.date}>
                {/* Date separator */}
                <div className="flex items-center justify-center py-3">
                  <div className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground shadow-sm">
                    {group.date}
                  </div>
                </div>

                {/* Messages */}
                {group.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'mb-1 flex',
                      msg.is_from_me ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[70%] rounded-lg px-3 py-2 shadow-sm',
                        msg.is_from_me
                          ? 'bg-green-100 dark:bg-green-900/50 text-green-900 dark:text-green-100'
                          : 'bg-card',
                        msg.matched_keyword && 'ring-2 ring-yellow-400/60 bg-yellow-50 dark:bg-yellow-900/30'
                      )}
                    >
                      {/* Sender name (only for others) */}
                      {!msg.is_from_me && (
                        <p className="text-xs font-semibold text-primary mb-0.5">
                          {msg.sender_name || msg.sender_jid}
                        </p>
                      )}

                      {/* Message text */}
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.message_text}</p>

                      {/* Footer: keyword badge + time */}
                      <div className="mt-1 flex items-center justify-end gap-2">
                        {msg.matched_keyword && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200">
                            {msg.matched_keyword}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t bg-card px-4 py-3">
        <div className="flex items-end gap-2">
          <Textarea
            placeholder="Digite uma mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[40px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            size="icon"
            className="shrink-0 h-10 w-10"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
