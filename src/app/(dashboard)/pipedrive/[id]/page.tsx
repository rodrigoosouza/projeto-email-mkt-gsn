// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Loader2, ArrowLeft, User, Building2, Mail, Phone, DollarSign,
  Calendar, Clock, CheckCircle2, XCircle, MessageSquare, FileText,
  Activity, Users, Paperclip, Tag, ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { useOrganizationContext } from '@/contexts/organization-context'
import { LeadTrackingJourney } from '@/components/leads/lead-tracking-journey'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return '-'
  try { return format(parseISO(dateStr), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR }) }
  catch { return dateStr }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  try { return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR }) }
  catch { return dateStr }
}

function statusBadge(status: string) {
  switch (status) {
    case 'won': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Ganho</Badge>
    case 'lost': return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Perdido</Badge>
    case 'open': return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Aberto</Badge>
    default: return <Badge variant="secondary">{status}</Badge>
  }
}

function activityIcon(type: string) {
  switch (type) {
    case 'call': return <Phone className="h-4 w-4 text-blue-500" />
    case 'email': return <Mail className="h-4 w-4 text-green-500" />
    case 'meeting': return <Users className="h-4 w-4 text-purple-500" />
    case 'task': return <CheckCircle2 className="h-4 w-4 text-yellow-500" />
    default: return <Activity className="h-4 w-4 text-muted-foreground" />
  }
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
}

export default function DealDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { currentOrg } = useOrganizationContext()
  const orgId = currentOrg?.id
  const dealId = params.id as string

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId || !dealId) return
    loadDeal()
  }, [orgId, dealId])

  async function loadDeal() {
    setLoading(true)
    try {
      const res = await fetch(`/api/pipedrive/deal?dealId=${dealId}&orgId=${orgId}`)
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  if (!data?.deal) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
        <p className="text-muted-foreground">Deal nao encontrado.</p>
      </div>
    )
  }

  const deal = data.deal
  const activities = data.activities || []
  const notes = data.notes || []
  const participants = data.participants || []
  const files = data.files || []
  const customFields = data.customFields || []

  const personEmail = deal.person_id?.email?.[0]?.value
  const personPhone = deal.person_id?.phone?.[0]?.value
  const personName = deal.person_id?.name
  const orgName = deal.org_id?.name
  const ownerName = deal.user_id?.name

  const doneActivities = activities.filter((a: any) => a.done)
  const pendingActivities = activities.filter((a: any) => !a.done)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/pipedrive">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">{deal.title}</h2>
              {statusBadge(deal.status)}
            </div>
            <p className="text-sm text-muted-foreground">
              Deal #{deal.id} — {deal.pipeline_name || 'Pipeline'} — {deal.stage_name || `Etapa ${deal.stage_order_nr}`}
            </p>
          </div>
        </div>
        {deal.cc_email && (
          <Button variant="outline" size="sm" asChild>
            <a href={`https://templumconsultoria.pipedrive.com/deal/${deal.id}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Abrir no Pipedrive
            </a>
          </Button>
        )}
      </div>

      {/* Top cards: Info + Contato + Valores */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Contato */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {personName && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{personName}</span>
              </div>
            )}
            {personEmail && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${personEmail}`} className="text-sm text-blue-600 hover:underline">{personEmail}</a>
              </div>
            )}
            {personPhone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{personPhone}</span>
              </div>
            )}
            {orgName && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{orgName}</span>
              </div>
            )}
            {ownerName && (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Responsavel: {ownerName}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Valores */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" /> Valores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Valor</span>
              <span className="text-sm font-bold">{formatCurrency(deal.value || 0)}</span>
            </div>
            {deal.weighted_value > 0 && deal.weighted_value !== deal.value && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Valor Ponderado</span>
                <span className="text-sm">{formatCurrency(deal.weighted_value)}</span>
              </div>
            )}
            {deal.products_count > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Produtos</span>
                <span className="text-sm">{deal.products_count}</span>
              </div>
            )}
            {deal.probability !== null && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Probabilidade</span>
                <span className="text-sm">{deal.probability}%</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Datas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> Datas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Criado</span>
              <span className="text-sm">{formatDateTime(deal.add_time)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Atualizado</span>
              <span className="text-sm">{formatDateTime(deal.update_time)}</span>
            </div>
            {deal.won_time && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Ganho em</span>
                <span className="text-sm text-green-600">{formatDateTime(deal.won_time)}</span>
              </div>
            )}
            {deal.lost_time && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Perdido em</span>
                <span className="text-sm text-red-500">{formatDateTime(deal.lost_time)}</span>
              </div>
            )}
            {deal.lost_reason && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Motivo perda</span>
                <span className="text-sm text-red-500">{deal.lost_reason}</span>
              </div>
            )}
            {deal.expected_close_date && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Previsao fechamento</span>
                <span className="text-sm">{deal.expected_close_date}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="journey" className="space-y-4">
        <TabsList>
          <TabsTrigger value="journey" className="gap-2"><Activity className="h-4 w-4" /> Jornada</TabsTrigger>
          <TabsTrigger value="custom_fields" className="gap-2"><FileText className="h-4 w-4" /> Campos ({customFields.length})</TabsTrigger>
          <TabsTrigger value="activities" className="gap-2"><Activity className="h-4 w-4" /> Atividades ({activities.length})</TabsTrigger>
          <TabsTrigger value="notes" className="gap-2"><MessageSquare className="h-4 w-4" /> Notas ({notes.length})</TabsTrigger>
          <TabsTrigger value="participants" className="gap-2"><Users className="h-4 w-4" /> Participantes ({participants.length})</TabsTrigger>
          {files.length > 0 && (
            <TabsTrigger value="files" className="gap-2"><Paperclip className="h-4 w-4" /> Arquivos ({files.length})</TabsTrigger>
          )}
        </TabsList>

        {/* JORNADA GTM */}
        <TabsContent value="journey">
          {personEmail || personPhone ? (
            <LeadTrackingJourney
              email={personEmail || ''}
              phone={personPhone}
              orgId={orgId}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  Sem email ou telefone para buscar jornada de tracking.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* CAMPOS CUSTOMIZADOS */}
        <TabsContent value="custom_fields">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campos do Deal</CardTitle>
              <CardDescription>Todos os campos preenchidos</CardDescription>
            </CardHeader>
            <CardContent>
              {customFields.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">Nenhum campo customizado preenchido.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {customFields.map((field: any, i: number) => (
                    <div key={i} className="flex flex-col border rounded-lg p-3 overflow-hidden">
                      <span className="text-xs text-muted-foreground font-medium">{field.label}</span>
                      <span className="text-sm mt-1 break-words">{field.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ATIVIDADES */}
        <TabsContent value="activities">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Atividades</CardTitle>
              <CardDescription>{doneActivities.length} concluidas, {pendingActivities.length} pendentes</CardDescription>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">Nenhuma atividade registrada.</p>
              ) : (
                <div className="space-y-3">
                  {/* Pendentes primeiro */}
                  {pendingActivities.length > 0 && (
                    <>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Pendentes</p>
                      {pendingActivities.map((act: any) => (
                        <div key={act.id} className="flex items-start gap-3 p-3 border rounded-lg bg-yellow-50/50 dark:bg-yellow-950/20">
                          {activityIcon(act.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{act.subject}</p>
                            {act.note && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{act.note.replace(/<[^>]*>/g, '')}</p>}
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground">{act.type}</span>
                              {act.due_date && <span className="text-xs text-muted-foreground">{act.due_date} {act.due_time || ''}</span>}
                              {act.assigned_to_user_id?.name && <span className="text-xs text-muted-foreground">→ {act.assigned_to_user_id.name}</span>}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">Pendente</Badge>
                        </div>
                      ))}
                    </>
                  )}

                  {doneActivities.length > 0 && (
                    <>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mt-4">Concluidas</p>
                      {doneActivities.map((act: any) => (
                        <div key={act.id} className="flex items-start gap-3 p-3 border rounded-lg">
                          {activityIcon(act.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{act.subject}</p>
                            {act.note && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{act.note.replace(/<[^>]*>/g, '')}</p>}
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground">{act.type}</span>
                              {act.marked_as_done_time && <span className="text-xs text-muted-foreground">{formatDate(act.marked_as_done_time)}</span>}
                            </div>
                          </div>
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOTAS */}
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notas</CardTitle>
            </CardHeader>
            <CardContent>
              {notes.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">Nenhuma nota registrada.</p>
              ) : (
                <div className="space-y-4">
                  {notes.map((note: any) => (
                    <div key={note.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">
                          {note.user?.name || 'Usuario'} — {formatDateTime(note.add_time)}
                        </span>
                        {note.pinned_to_deal_flag && <Badge variant="secondary" className="text-xs">Fixada</Badge>}
                      </div>
                      <div className="text-sm prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(note.content) }} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PARTICIPANTES */}
        <TabsContent value="participants">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Participantes</CardTitle>
            </CardHeader>
            <CardContent>
              {participants.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">Nenhum participante.</p>
              ) : (
                <div className="space-y-3">
                  {participants.map((p: any) => {
                    const person = p.person
                    return (
                      <div key={p.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{person?.name || 'Sem nome'}</p>
                          <div className="flex items-center gap-3">
                            {person?.email?.[0]?.value && (
                              <span className="text-xs text-muted-foreground">{person.email[0].value}</span>
                            )}
                            {person?.phone?.[0]?.value && (
                              <span className="text-xs text-muted-foreground">{person.phone[0].value}</span>
                            )}
                          </div>
                        </div>
                        {p.primary_flag && <Badge variant="secondary" className="text-xs">Principal</Badge>}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ARQUIVOS */}
        {files.length > 0 && (
          <TabsContent value="files">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Arquivos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {files.map((file: any) => (
                    <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{file.file_type} — {formatDate(file.add_time)}</p>
                      </div>
                      {file.url && (
                        <a href={file.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm"><ExternalLink className="h-4 w-4" /></Button>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
