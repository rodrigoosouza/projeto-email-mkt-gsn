'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Search, Send, MessageCircle, Phone, Clock, User, CheckCheck, Check, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useOrganizationContext } from '@/contexts/organization-context'
import { useToast } from '@/components/ui/use-toast'
import {
  getConversations,
  getMessages,
  sendMessage,
  updateConversation,
} from '@/lib/supabase/whatsapp'
import { sendTextMessage } from '@/lib/whatsapp/client'
import type { WhatsAppConversation, WhatsAppMessage } from '@/lib/types'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function MessageStatusIcon({ status }: { status: WhatsAppMessage['status'] }) {
  switch (status) {
    case 'sent':
      return <Check className="h-3 w-3 text-muted-foreground" />
    case 'delivered':
      return <CheckCheck className="h-3 w-3 text-muted-foreground" />
    case 'read':
      return <CheckCheck className="h-3 w-3 text-blue-500" />
    case 'failed':
      return <X className="h-3 w-3 text-red-500" />
    default:
      return null
  }
}

function getMessagePreview(msg: WhatsAppMessage): string {
  switch (msg.message_type) {
    case 'text':
      return msg.content?.body || ''
    case 'image':
      return '[Imagem]'
    case 'document':
      return `[Documento] ${msg.content?.filename || ''}`
    case 'video':
      return '[Video]'
    case 'audio':
      return '[Audio]'
    case 'template':
      return '[Template]'
    case 'interactive':
      return '[Mensagem interativa]'
    case 'reaction':
      return msg.content?.emoji || '[Reacao]'
    default:
      return '[Mensagem]'
  }
}

export default function WhatsAppInboxPage() {
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null)
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadConversations = useCallback(async () => {
    if (!currentOrg) return
    try {
      const data = await getConversations(currentOrg.id)
      setConversations(data)
    } catch (error) {
      console.error('Erro ao carregar conversas:', error)
    } finally {
      setLoading(false)
    }
  }, [currentOrg])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const selectConversation = async (conv: WhatsAppConversation) => {
    setSelectedConversation(conv)
    setMessagesLoading(true)
    try {
      const msgs = await getMessages(conv.id)
      setMessages(msgs)

      // Mark as read
      if (conv.unread_count > 0) {
        await updateConversation(conv.id, { unread_count: 0 })
        setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
        )
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error)
    } finally {
      setMessagesLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !currentOrg || sending) return

    setSending(true)
    try {
      // Try to send via WhatsApp API
      let waMessageId: string | undefined
      try {
        const result = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: selectedConversation.phone_number,
            text: newMessage,
          }),
        })
        const data = await result.json()
        waMessageId = data?.messages?.[0]?.id
      } catch {
        // API not configured, save locally anyway
      }

      const msg = await sendMessage(selectedConversation.id, currentOrg.id, {
        message_type: 'text',
        content: { body: newMessage },
        wa_message_id: waMessageId,
      })

      setMessages((prev) => [...prev, msg])
      setNewMessage('')

      // Update conversation in list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversation.id
            ? { ...c, last_message_at: new Date().toISOString() }
            : c
        )
      )
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      toast({ title: 'Erro', description: 'Nao foi possivel enviar a mensagem.', variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const filteredConversations = conversations.filter((conv) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      conv.phone_number.includes(q) ||
      (conv.contact_name?.toLowerCase().includes(q) ?? false)
    )
  })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">WhatsApp</h2>
        <p className="text-muted-foreground">
          Gerencie conversas do WhatsApp Business.
        </p>
      </div>

      <div className="flex h-[calc(100vh-220px)] rounded-lg border bg-card overflow-hidden">
        {/* Left panel — Conversation list */}
        <div className="w-full max-w-sm border-r flex flex-col">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar conversas..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                Carregando...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  {search ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  As conversas aparecerao aqui quando receber mensagens via WhatsApp.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={cn(
                      'w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors',
                      selectedConversation?.id === conv.id && 'bg-accent'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm truncate">
                            {conv.contact_name || conv.phone_number}
                          </span>
                          {conv.last_message_at && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {formatDistanceToNow(new Date(conv.last_message_at), {
                                addSuffix: false,
                                locale: ptBR,
                              })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {conv.phone_number}
                          </span>
                          {conv.unread_count > 0 && (
                            <Badge variant="default" className="h-5 min-w-[20px] text-xs px-1.5 bg-green-600 hover:bg-green-600">
                              {conv.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right panel — Messages */}
        <div className="flex-1 flex flex-col">
          {!selectedConversation ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50 mb-4">
                <MessageCircle className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">WhatsApp Business</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Selecione uma conversa ao lado para visualizar as mensagens e responder aos seus contatos.
              </p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b bg-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <User className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {selectedConversation.contact_name || selectedConversation.phone_number}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {selectedConversation.phone_number}
                    {selectedConversation.status === 'open' && (
                      <Badge variant="outline" className="ml-2 text-green-600 border-green-200 text-[10px] h-4">
                        Aberta
                      </Badge>
                    )}
                  </p>
                </div>
              </div>

              {/* Messages area */}
              <ScrollArea className="flex-1 px-4 py-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    Carregando mensagens...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Clock className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Nenhuma mensagem nesta conversa.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => {
                      const isOutbound = msg.direction === 'outbound'
                      return (
                        <div
                          key={msg.id}
                          className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}
                        >
                          <div
                            className={cn(
                              'max-w-[75%] rounded-2xl px-4 py-2 shadow-sm',
                              isOutbound
                                ? 'bg-green-600 text-white rounded-br-md'
                                : 'bg-muted rounded-bl-md'
                            )}
                          >
                            {msg.message_type === 'text' ? (
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {msg.content?.body || ''}
                              </p>
                            ) : msg.message_type === 'image' ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm opacity-80">
                                  [Imagem]
                                </div>
                                {msg.content?.caption && (
                                  <p className="text-sm">{msg.content.caption}</p>
                                )}
                              </div>
                            ) : msg.message_type === 'document' ? (
                              <div className="text-sm">
                                [Documento] {msg.content?.filename || ''}
                              </div>
                            ) : msg.message_type === 'audio' ? (
                              <div className="text-sm">[Audio]</div>
                            ) : msg.message_type === 'video' ? (
                              <div className="text-sm">[Video]</div>
                            ) : msg.message_type === 'reaction' ? (
                              <div className="text-2xl">{msg.content?.emoji}</div>
                            ) : (
                              <div className="text-sm">{getMessagePreview(msg)}</div>
                            )}
                            <div
                              className={cn(
                                'flex items-center gap-1 mt-1',
                                isOutbound ? 'justify-end' : 'justify-start'
                              )}
                            >
                              <span
                                className={cn(
                                  'text-[10px]',
                                  isOutbound ? 'text-green-100' : 'text-muted-foreground'
                                )}
                              >
                                {format(new Date(msg.created_at), 'HH:mm')}
                              </span>
                              {isOutbound && <MessageStatusIcon status={msg.status} />}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Message input */}
              <div className="border-t p-3">
                <div className="flex items-end gap-2">
                  <Textarea
                    placeholder="Digite uma mensagem..."
                    className="min-h-[44px] max-h-[120px] resize-none"
                    rows={1}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    className="h-11 w-11 shrink-0 bg-green-600 hover:bg-green-700"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
