// @ts-nocheck
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useOrganizationContext } from '@/contexts/organization-context'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Send, Loader2, Bot, User, Clock, Sparkles } from 'lucide-react'
import { subDays, startOfMonth, endOfMonth, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    'Olá! Sou o Copiloto de Growth do Orbit. Tenho acesso a todos os dados de Meta Ads, CRM Pipedrive e Tracking GTM. Selecione o período e me pergunte qualquer coisa sobre sua performance de marketing e vendas. Exemplos:\n\n- "Analise meus dados dos últimos 30 dias"\n- "Qual criativo está convertendo mais em vendas?"\n- "Onde está o gargalo do meu funil?"\n- "Quais públicos devo escalar?"\n- "Por que o criativo X tem CPL baixo mas não vende?"',
}

type DateRangePreset =
  | 'today'
  | 'yesterday'
  | '7d'
  | '30d'
  | 'this_month'
  | 'last_month'
  | 'all'

const DATE_RANGE_LABELS: Record<DateRangePreset, string> = {
  today: 'Hoje',
  yesterday: 'Ontem',
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  this_month: 'Este mês',
  last_month: 'Mês passado',
  all: 'Todo período',
}

function getDateRange(preset: DateRangePreset): {
  fromDate: string
  toDate: string
} {
  const now = new Date()
  const toDate = format(now, 'yyyy-MM-dd')

  switch (preset) {
    case 'today':
      return { fromDate: toDate, toDate }
    case 'yesterday': {
      const yesterday = format(subDays(now, 1), 'yyyy-MM-dd')
      return { fromDate: yesterday, toDate: yesterday }
    }
    case '7d':
      return { fromDate: format(subDays(now, 7), 'yyyy-MM-dd'), toDate }
    case '30d':
      return { fromDate: format(subDays(now, 30), 'yyyy-MM-dd'), toDate }
    case 'this_month':
      return {
        fromDate: format(startOfMonth(now), 'yyyy-MM-dd'),
        toDate: format(endOfMonth(now), 'yyyy-MM-dd'),
      }
    case 'last_month': {
      const lastMonth = subDays(startOfMonth(now), 1)
      return {
        fromDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        toDate: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
      }
    }
    case 'all':
      return { fromDate: '2020-01-01', toDate }
    default:
      return { fromDate: format(subDays(now, 30), 'yyyy-MM-dd'), toDate }
  }
}

function formatMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-muted rounded-md p-3 my-2 overflow-x-auto text-sm"><code>$2</code></pre>')
  // Inline code
  html = html.replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
  // Headers
  html = html.replace(/^### (.*$)/gm, '<h3 class="text-base font-semibold mt-3 mb-1">$1</h3>')
  html = html.replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold mt-4 mb-1">$1</h2>')
  html = html.replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
  // Unordered lists
  html = html.replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>')
  html = html.replace(/(<li.*<\/li>\n?)+/g, '<ul class="my-2 space-y-1">$&</ul>')
  // Ordered lists
  html = html.replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal">$1</li>')
  // Line breaks
  html = html.replace(/\n\n/g, '<br/><br/>')
  html = html.replace(/\n/g, '<br/>')

  return html
}

export default function GrowthChatPage() {
  const { currentOrg } = useOrganizationContext()
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [dateRange, setDateRange] = useState<DateRangePreset>('30d')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading || !currentOrg) return

    const userMessage: ChatMessage = { role: 'user', content: trimmed }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const { fromDate, toDate } = getDateRange(dateRange)

      const apiMessages = newMessages
        .filter((m) => m !== WELCOME_MESSAGE)
        .map((m) => ({ role: m.role, content: m.content }))

      const response = await fetch('/api/growth/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: currentOrg.id,
          messages: apiMessages,
          fromDate,
          toDate,
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao processar sua pergunta')
      }

      const data = await response.json()
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response || data.content || data.message || 'Desculpe, não consegui gerar uma resposta.',
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Erro: ${error instanceof Error ? error.message : 'Algo deu errado. Tente novamente.'}`,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const { fromDate, toDate } = getDateRange(dateRange)

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Copiloto de Growth</h1>
            <p className="text-xs text-muted-foreground">
              Análise inteligente de marketing e vendas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {format(new Date(fromDate), "dd MMM", { locale: ptBR })} —{' '}
              {format(new Date(toDate), "dd MMM yyyy", { locale: ptBR })}
            </span>
          </div>
          <Select
            value={dateRange}
            onValueChange={(v) => setDateRange(v as DateRangePreset)}
          >
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DATE_RANGE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  message.role === 'assistant'
                    ? 'bg-gradient-to-br from-violet-500 to-indigo-600'
                    : 'bg-blue-600'
                )}
              >
                {message.role === 'assistant' ? (
                  <Bot className="h-4 w-4 text-white" />
                ) : (
                  <User className="h-4 w-4 text-white" />
                )}
              </div>

              {/* Message bubble */}
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  message.role === 'assistant'
                    ? 'bg-muted text-foreground'
                    : 'bg-blue-600 text-white'
                )}
              >
                {message.role === 'assistant' ? (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none [&>ul]:my-1 [&>ol]:my-1 [&_li]:my-0"
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdown(message.content),
                    }}
                  />
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Analisando seus dados...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="border-t bg-background px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-end gap-3">
          <Card className="flex flex-1 items-end overflow-hidden p-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte sobre sua performance de marketing..."
              rows={1}
              className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
              style={{
                height: 'auto',
                minHeight: '44px',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = `${Math.min(target.scrollHeight, 128)}px`
              }}
              disabled={isLoading}
            />
            <Button
              size="icon"
              className={cn(
                'mb-1.5 mr-1.5 h-8 w-8 shrink-0 rounded-lg',
                input.trim()
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-muted text-muted-foreground'
              )}
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </Card>
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-muted-foreground">
          Dados de Meta Ads, Pipedrive CRM e Tracking GTM •{' '}
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {DATE_RANGE_LABELS[dateRange]}
          </Badge>
        </p>
      </div>
    </div>
  )
}
